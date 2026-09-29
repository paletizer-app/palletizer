export function packUniformBlock(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0) {
    const placedItems = [];

    const effectiveW = palletSpec.width + (overhangX * 2);
    const effectiveL = palletSpec.length + (overhangY * 2);

    // Pallet boundary coordinates (Min bounds)
    const minX = -(effectiveW / 2);
    const minZ = -(effectiveL / 2);

    // 1. Group Inventory for Block Building (LAFF)
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

    // 2. Initialize Empty Maximal Space (EMS) Queue with the full pallet volume
    // Spaces use bottom-left-back min coordinates (x, y, z)
    let emptySpaces = [{
        x: minX, y: 0, z: minZ,
        w: effectiveW, h: maxHeight, l: effectiveL
    }];

    // HELPER: Dynamic Stability / 80% Support Verification
    function verifyBlockSupport(blockMinX, blockMinZ, cols, rows, itemW, itemL, blockY) {
        if (blockY === 0) return true; // Pallet floor is always 100% supported

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const boxMinX = blockMinX + (c * itemW);
                const boxMaxX = boxMinX + itemW;
                const boxMinZ = blockMinZ + (r * itemL);
                const boxMaxZ = boxMinZ + itemL;
                const reqArea = itemW * itemL;

                let supportedArea = 0;

                for (const p of placedItems) {
                    const pTop = p.y + p.h;
                    // Check if placed item is directly underneath (within 2mm tolerance)
                    if (Math.abs(pTop - blockY) < 2) {
                        const pMinX = p.x - (p.w / 2);
                        const pMaxX = p.x + (p.w / 2);
                        const pMinZ = p.z - (p.l / 2);
                        const pMaxZ = p.z + (p.l / 2);

                        const overlapX = Math.max(0, Math.min(boxMaxX, pMaxX) - Math.max(boxMinX, pMinX));
                        const overlapZ = Math.max(0, Math.min(boxMaxZ, pMaxZ) - Math.max(boxMinZ, pMinZ));

                        if (overlapX > 0 && overlapZ > 0) {
                            supportedArea += (overlapX * overlapZ);
                        }
                    }
                }

                if ((supportedArea / reqArea) < 0.80) {
                    return false; // A single box in the block failed the 80% support rule
                }
            }
        }
        return true;
    }

    // 3. MAIN PACKING ENGINE LOOP
    let placedAny = true;
    while (placedAny && totalItemsToPlace > 0 && emptySpaces.length > 0) {
        placedAny = false;

        // DEEP-BOTTOM-LEFT (DBL) GRAVITY SORTING
        // Priority 1: Lowest Y (Floor). Priority 2: Lowest Z (Back). Priority 3: Lowest X (Left).
        emptySpaces.sort((a, b) => {
            if (Math.abs(a.y - b.y) > 0.1) return a.y - b.y;
            if (Math.abs(a.z - b.z) > 0.1) return a.z - b.z;
            return a.x - b.x;
        });

        let bestFit = null;

        // Iterate spaces in DBL order
        for (let sIdx = 0; sIdx < emptySpaces.length; sIdx++) {
            const space = emptySpaces[sIdx];

            // Iterate all inventory groups
            Object.keys(groupedInventory).forEach(key => {
                const group = groupedInventory[key];
                const available = group.items.length;
                if (available === 0) return;
                if (group.h > space.h) return;

                const orientations = group.type === 'barrel'
                    ? [{ w: group.w, l: group.l, rotated: false }]
                    : [{ w: group.w, l: group.l, rotated: false }, { w: group.l, l: group.w, rotated: true }];

                orientations.forEach(ori => {
                    // LAFF Block Evaluation
                    const maxCols = Math.floor(space.w / ori.w);
                    const maxRows = Math.floor(space.l / ori.l);

                    if (maxCols > 0 && maxRows > 0) {
                        // Attempt to fit the largest possible block (c x r)
                        for (let c = maxCols; c >= 1; c--) {
                            for (let r = maxRows; r >= 1; r--) {
                                if (c * r <= available) {

                                    if (verifyBlockSupport(space.x, space.z, c, r, ori.w, ori.l, space.y)) {
                                        const area = (c * ori.w) * (r * ori.l);

                                        let isBetter = false;
                                        if (!bestFit) {
                                            isBetter = true;
                                        } else if (space.y < bestFit.space.y - 0.1) {
                                            isBetter = true; // Lower elevation always wins
                                        } else if (Math.abs(space.y - bestFit.space.y) <= 0.1) {
                                            if (area > bestFit.area) {
                                                isBetter = true; // LAFF: Largest Area Fit First for ties
                                            }
                                        }

                                        if (isBetter) {
                                            bestFit = {
                                                space, groupKey: key,
                                                cols: c, rows: r,
                                                blockW: c * ori.w, blockL: r * ori.l,
                                                itemW: ori.w, itemL: ori.l, itemH: group.h,
                                                area, rotated: ori.rotated
                                            };
                                        }
                                        break; // Best supported block for this orientation found
                                    }
                                }
                            }
                        }
                    }
                });
            });

            // If a placement is found at this exact DBL space, stop searching higher spaces
            if (bestFit && Math.abs(bestFit.space.y - space.y) <= 0.1) {
                break;
            }
        }

        // 4. COMMIT PLACEMENT AND UPDATE EMS QUEUE
        if (bestFit) {
            const { space, groupKey, cols, rows, blockW, blockL, itemW, itemL, itemH, rotated } = bestFit;
            const group = groupedInventory[groupKey];

            const bMinX = space.x;
            const bMinY = space.y;
            const bMinZ = space.z;
            const bMaxX = space.x + blockW;
            const bMaxY = space.y + itemH;
            const bMaxZ = space.z + blockL;

            // Commit individual boxes into the placed block
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const itemToPlace = group.items.shift();
                    placedItems.push({
                        ...itemToPlace,
                        // Convert min coordinates to standard center-anchored rendering coordinates
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

            // 5. MAXIMAL EMPTY SPACE (EMS) INTERSECTION
            // Clip all existing spaces that overlap the newly placed block volume
            const nextSpaces = [];
            for (const s of emptySpaces) {
                // Check if space 's' overlaps the placed block 'b'
                if (bMaxX <= s.x || bMinX >= s.x + s.w ||
                    bMaxY <= s.y || bMinY >= s.y + s.h ||
                    bMaxZ <= s.z || bMinZ >= s.z + s.l) {

                    // No overlap, keep space intact
                    nextSpaces.push(s);
                } else {
                    // Overlap detected: Generate up to 5 new fractional maximal spaces
                    if (bMinX > s.x) {
                        nextSpaces.push({ ...s, w: bMinX - s.x }); // Left space
                    }
                    if (bMaxX < s.x + s.w) {
                        nextSpaces.push({ ...s, x: bMaxX, w: (s.x + s.w) - bMaxX }); // Right space
                    }
                    if (bMinZ > s.z) {
                        nextSpaces.push({ ...s, l: bMinZ - s.z }); // Back space
                    }
                    if (bMaxZ < s.z + s.l) {
                        nextSpaces.push({ ...s, z: bMaxZ, l: (s.z + s.l) - bMaxZ }); // Front space
                    }
                    if (bMaxY < s.y + s.h) {
                        nextSpaces.push({ ...s, y: bMaxY, h: (s.y + s.h) - bMaxY }); // Top space
                    }
                }
            }

            // 6. DEFRAGMENTATION (SPACE SUBSUMPTION)
            // Mathematically eliminate any space entirely swallowed by another space
            emptySpaces = nextSpaces.filter((s1, idx1) => {
                return !nextSpaces.some((s2, idx2) => {
                    if (idx1 === idx2) return false;
                    return (
                        s1.x >= s2.x &&
                        s1.y >= s2.y &&
                        s1.z >= s2.z &&
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
        engineName: "State-of-the-Art EMS Optimizer (LAFF + DBL Gravity)",
        efficiency: totalInputItems > 0 ? ((placedItems.length / totalInputItems) * 100).toFixed(1) : "0.0",
        resultingHeight
    };
}