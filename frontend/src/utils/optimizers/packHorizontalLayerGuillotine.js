export function packHorizontalLayerGuillotine(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0) {
    const placedItems = [];
    const effectiveW = palletSpec.width + (overhangX * 2);
    const effectiveL = palletSpec.length + (overhangY * 2);

    const minX = -(effectiveW / 2);
    const minZ = -(effectiveL / 2);

    // 1. Group inventory for LAFF block building
    const groupedInventory = {};
    let totalItemsToPlace = 0;

    cargoList.forEach(item => {
        if (item.quantity <= 0) return;
        const key = `${item.width}-${item.length}-${item.height}-${item.type}`;
        if (!groupedInventory[key]) {
            groupedInventory[key] = {
                w: item.width, l: item.length, h: item.height, type: item.type,
                items: []
            };
        }
        for (let i = 0; i < item.quantity; i++) {
            groupedInventory[key].items.push({ ...item, quantity: 1 });
            totalItemsToPlace++;
        }
    });

    // 2. Initialize 3D Empty Maximal Spaces (EMS) with full pallet volume
    let emptySpaces = [{
        x: minX, y: 0, z: minZ,
        w: effectiveW, h: maxHeight, l: effectiveL
    }];

    // HELPER: 80% under-support check for individual boxes
    function checkBoxSupport(bx, bz, bw, bl, by) {
        if (by === 0) return true; // Pallet floor is perfectly supported

        const bMinX = bx;
        const bMaxX = bx + bw;
        const bMinZ = bz;
        const bMaxZ = bz + bl;
        const reqArea = bw * bl;

        let supportedArea = 0;
        for (const p of placedItems) {
            // Check if placed item is directly underneath the target elevation
            if (Math.abs((p.y + p.h) - by) < 5) {
                const pMinX = p.x - (p.w / 2);
                const pMaxX = p.x + (p.w / 2);
                const pMinZ = p.z - (p.l / 2);
                const pMaxZ = p.z + (p.l / 2);

                const overlapX = Math.max(0, Math.min(bMaxX, pMaxX) - Math.max(bMinX, pMinX));
                const overlapZ = Math.max(0, Math.min(bMaxZ, pMaxZ) - Math.max(bMinZ, pMinZ));

                if (overlapX > 0 && overlapZ > 0) {
                    supportedArea += (overlapX * overlapZ);
                }
            }
        }
        return (supportedArea / reqArea) >= 0.80;
    }

    // 3. MAIN 3D EMS PACKING LOOP
    let placedAny = true;
    while (placedAny && totalItemsToPlace > 0) {
        placedAny = false;

        // GRAVITY SORT: Lowest Y first, then Back-Left (Z, X) to prevent towers
        emptySpaces.sort((a, b) => {
            if (Math.abs(a.y - b.y) > 0.1) return a.y - b.y;
            if (Math.abs(a.z - b.z) > 0.1) return a.z - b.z;
            return a.x - b.x;
        });

        let bestFit = null;

        for (let sIdx = 0; sIdx < emptySpaces.length; sIdx++) {
            const space = emptySpaces[sIdx];

            Object.keys(groupedInventory).forEach(key => {
                const group = groupedInventory[key];
                const available = group.items.length;
                if (available === 0) return;
                if (space.y + group.h > maxHeight) return;
                if (group.h > space.h) return;

                const orientations = group.type === 'barrel'
                    ? [{ w: group.w, l: group.l, rotated: false }]
                    : [{ w: group.w, l: group.l, rotated: false }, { w: group.l, l: group.w, rotated: true }];

                orientations.forEach(ori => {
                    const maxCols = Math.floor(space.w / ori.w);
                    const maxRows = Math.floor(space.l / ori.l);

                    if (maxCols > 0 && maxRows > 0) {
                        // Attempt to place the largest possible block (LAFF)
                        for (let c = maxCols; c >= 1; c--) {
                            for (let r = maxRows; r >= 1; r--) {
                                if (c * r <= available) {

                                    // Verify support for every individual box in this proposed block
                                    let blockSupported = true;
                                    if (space.y > 0) {
                                        for (let col = 0; col < c; col++) {
                                            for (let row = 0; row < r; row++) {
                                                const boxX = space.x + (col * ori.w);
                                                const boxZ = space.z + (row * ori.l);
                                                if (!checkBoxSupport(boxX, boxZ, ori.w, ori.l, space.y)) {
                                                    blockSupported = false;
                                                    break;
                                                }
                                            }
                                            if (!blockSupported) break;
                                        }
                                    }

                                    if (blockSupported) {
                                        const blockW = c * ori.w;
                                        const blockL = r * ori.l;
                                        const area = blockW * blockL;
                                        let isBetter = false;

                                        if (!bestFit) {
                                            isBetter = true;
                                        } else if (space.y < bestFit.space.y - 0.1) {
                                            isBetter = true; // Lower elevation universally preferred
                                        } else if (Math.abs(space.y - bestFit.space.y) <= 0.1) {
                                            if (area > bestFit.area) {
                                                isBetter = true; // Largest footprint wins ties
                                            }
                                        }

                                        if (isBetter) {
                                            bestFit = {
                                                spaceIndex: sIdx,
                                                space, groupKey: key,
                                                cols: c, rows: r,
                                                blockW, blockL,
                                                itemW: ori.w, itemL: ori.l, itemH: group.h,
                                                area, rotated: ori.rotated
                                            };
                                        }
                                        break; // Found largest valid block for this specific orientation
                                    }
                                }
                            }
                        }
                    }
                });
            });

            // Optimization: If a placement was found at this exact lowest elevation, stop searching higher floating spaces
            if (bestFit && Math.abs(bestFit.space.y - space.y) < 0.1) break;
        }

        // 4. COMMIT PLACEMENT & SPLIT SPACES
        if (bestFit) {
            const { space, groupKey, cols, rows, blockW, blockL, itemW, itemL, itemH, rotated } = bestFit;
            const group = groupedInventory[groupKey];

            const bMinX = space.x;
            const bMinZ = space.z;
            const bMinY = space.y;
            const bMaxX = space.x + blockW;
            const bMaxZ = space.z + blockL;
            const bMaxY = space.y + itemH;

            // Push all items into the block
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const itemToPlace = group.items.shift();
                    placedItems.push({
                        ...itemToPlace,
                        x: bMinX + (c * itemW) + (itemW / 2),
                        y: bMinY,
                        z: bMinZ + (r * itemL) + (itemL / 2),
                        w: itemW, l: itemL, h: itemH,
                        width: itemW, length: itemL, height: itemH,
                        rotated: rotated
                    });
                    totalItemsToPlace--;
                }
            }
            placedAny = true;

            // 3D GUILLOTINE INTERSECTION
            const nextSpaces = [];
            for (let i = 0; i < emptySpaces.length; i++) {
                const s = emptySpaces[i];
                // Check 3D bounding box overlap
                if (bMaxX <= s.x || bMinX >= s.x + s.w ||
                    bMaxY <= s.y || bMinY >= s.y + s.h ||
                    bMaxZ <= s.z || bMinZ >= s.z + s.l) {
                    nextSpaces.push(s);
                } else {
                    // Slice overlapping space into fractional maximal spaces
                    if (bMinX > s.x) nextSpaces.push({ ...s, w: bMinX - s.x });
                    if (bMaxX < s.x + s.w) nextSpaces.push({ ...s, x: bMaxX, w: (s.x + s.w) - bMaxX });
                    if (bMinZ > s.z) nextSpaces.push({ ...s, l: bMinZ - s.z });
                    if (bMaxZ < s.z + s.l) nextSpaces.push({ ...s, z: bMaxZ, l: (s.z + s.l) - bMaxZ });
                    if (bMaxY < s.y + s.h) nextSpaces.push({ ...s, y: bMaxY, h: (s.y + s.h) - bMaxY });
                }
            }

            // SPACE SUBSUMPTION FILTER (Defragmentation)
            emptySpaces = nextSpaces.filter((s1, idx1) => {
                return !nextSpaces.some((s2, idx2) => {
                    if (idx1 === idx2) return false;
                    return (
                        s1.x >= s2.x && s1.y >= s2.y && s1.z >= s2.z &&
                        (s1.x + s1.w) <= (s2.x + s2.w) + 0.1 &&
                        (s1.y + s1.h) <= (s2.y + s2.h) + 0.1 &&
                        (s1.z + s1.l) <= (s2.z + s2.l) + 0.1
                    );
                });
            });
        }
    }

    const totalInputItems = cargoList.reduce((sum, c) => sum + (c.quantity || 0), 0);
    let resultingHeight = 0;
    if (placedItems.length > 0) {
        resultingHeight = Math.max(...placedItems.map(p => p.y + p.h));
    }

    return {
        placedItems,
        engineName: "3D EMS Block Packer (Multi-Elevation)",
        efficiency: totalInputItems > 0 ? ((placedItems.length / totalInputItems) * 100).toFixed(1) : "0.0",
        resultingHeight
    };
}