export function packAdvanced3DGuillotine(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0) {
    const placedItems = [];
    const effectiveW = palletSpec.width + (overhangX * 2);
    const effectiveL = palletSpec.length + (overhangY * 2);

    const minX = -(effectiveW / 2);
    const minZ = -(effectiveL / 2);

    // 1. Group inventory to enable LAFF (Largest Area Fit First) block building
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

    // 2. Initialize the primary Maximal Empty Space
    let freeSpaces = [{
        x: minX, y: 0, z: minZ,
        w: effectiveW, h: maxHeight, l: effectiveL
    }];

    // HELPER: Verifies >= 80% solid under-support (20% max overhang)
    function checkBaseSupport(bx, bz, bw, bl, by) {
        if (by === 0) return true; // Pallet floor is 100% supported

        const bMinX = bx - bw / 2;
        const bMaxX = bx + bw / 2;
        const bMinZ = bz - bl / 2;
        const bMaxZ = bz + bl / 2;
        const reqArea = bw * bl;

        let supportedArea = 0;
        for (const p of placedItems) {
            if (Math.abs((p.y + p.h) - by) < 5) {
                const pMinX = p.x - p.w / 2;
                const pMaxX = p.x + p.w / 2;
                const pMinZ = p.z - p.l / 2;
                const pMaxZ = p.z + p.l / 2;

                const overlapX = Math.max(0, Math.min(bMaxX, pMaxX) - Math.max(bMinX, pMinX));
                const overlapZ = Math.max(0, Math.min(bMaxZ, pMaxZ) - Math.max(bMinZ, pMinZ));

                if (overlapX > 0 && overlapZ > 0) {
                    supportedArea += (overlapX * overlapZ);
                }
            }
        }
        return (supportedArea / reqArea) >= 0.80;
    }

    // 3. MAIN GUILLOTINE LAFF LOOP
    let placedAny = true;
    while (placedAny && totalItemsToPlace > 0) {
        placedAny = false;
        let bestCandidate = null;

        // Sort spaces by gravity (lowest Y first) to enforce SwIS (Shelving with Internal Search)
        freeSpaces.sort((a, b) => {
            if (Math.abs(a.y - b.y) > 0.1) return a.y - b.y;
            return (a.x - b.x) + (a.z - b.z);
        });

        for (let sIdx = 0; sIdx < freeSpaces.length; sIdx++) {
            const space = freeSpaces[sIdx];
            if (space.y >= maxHeight) continue;

            Object.keys(groupedInventory).forEach(key => {
                const group = groupedInventory[key];
                const availableCount = group.items.length;
                if (availableCount === 0) return;
                if (space.y + group.h > maxHeight) return;
                if (group.h > space.h) return;

                const orientations = group.type === 'barrel'
                    ? [{ w: group.w, l: group.l, rotated: false }]
                    : [{ w: group.w, l: group.l, rotated: false }, { w: group.l, l: group.w, rotated: true }];

                orientations.forEach(ori => {
                    const maxCols = Math.floor(space.w / ori.w);
                    const maxRows = Math.floor(space.l / ori.l);

                    if (maxCols > 0 && maxRows > 0) {
                        // LAFF Block Evaluation: Find the largest c x r block that fits and is fully supported
                        for (let c = maxCols; c >= 1; c--) {
                            for (let r = maxRows; r >= 1; r--) {
                                if (c * r <= availableCount) {

                                    let blockSupported = true;
                                    if (space.y > 0) {
                                        for (let col = 0; col < c; col++) {
                                            for (let row = 0; row < r; row++) {
                                                const bx = space.x + (col * ori.w) + (ori.w / 2);
                                                const bz = space.z + (row * ori.l) + (ori.l / 2);
                                                if (!checkBaseSupport(bx, bz, ori.w, ori.l, space.y)) {
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

                                        // HEURISTIC SCORE: Lowest Y wins. Tie-breaker: Largest Block Area (LAFF)
                                        const scoreY = space.y;

                                        let isBetter = false;
                                        if (!bestCandidate) {
                                            isBetter = true;
                                        } else if (scoreY < bestCandidate.scoreY - 0.1) {
                                            isBetter = true;
                                        } else if (Math.abs(scoreY - bestCandidate.scoreY) <= 0.1) {
                                            if (area > bestCandidate.area) {
                                                isBetter = true;
                                            }
                                        }

                                        if (isBetter) {
                                            bestCandidate = {
                                                spaceIndex: sIdx, space, groupKey: key,
                                                cols: c, rows: r, blockW, blockL,
                                                itemW: ori.w, itemL: ori.l, itemH: group.h,
                                                scoreY, area, rotated: ori.rotated
                                            };
                                        }
                                        break; // We found the largest supported block for this C iteration
                                    }
                                }
                            }
                        }
                    }
                });
            });

            // Optimization: If we found a candidate in this Y-level space, don't scan higher floating spaces yet
            if (bestCandidate && bestCandidate.scoreY <= space.y + 0.1) break;
        }

        // Place the winning block and execute Maximal Space Split
        if (bestCandidate) {
            const { space, groupKey, cols, rows, blockW, blockL, itemW, itemL, itemH, rotated } = bestCandidate;
            const group = groupedInventory[groupKey];

            // 1. Place all items in the block
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const itemToPlace = group.items.shift();
                    placedItems.push({
                        ...itemToPlace,
                        x: space.x + (c * itemW) + (itemW / 2),
                        y: space.y,
                        z: space.z + (r * itemL) + (itemL / 2),
                        w: itemW, l: itemL, h: itemH,
                        width: itemW, length: itemL, height: itemH,
                        rotated: rotated
                    });
                    totalItemsToPlace--;
                }
            }
            placedAny = true;

            // 2. GUILLOTINE SPLIT: Define the 3D bounding box of the newly placed block
            const pMinX = space.x;
            const pMaxX = space.x + blockW;
            const pMinZ = space.z;
            const pMaxZ = space.z + blockL;
            const pMinY = space.y;
            const pMaxY = space.y + itemH;

            const generatedSpaces = [];

            // Generate Right, Front, and Top Spaces for the block
            if (space.w - blockW > 0) {
                generatedSpaces.push({ x: pMaxX, y: pMinY, z: pMinZ, w: space.w - blockW, h: space.h, l: space.l });
            }
            if (space.l - blockL > 0) {
                generatedSpaces.push({ x: pMinX, y: pMinY, z: pMaxZ, w: space.w, h: space.h, l: space.l - blockL });
            }
            if (space.h - itemH > 0) {
                generatedSpaces.push({ x: pMinX, y: pMaxY, z: pMinZ, w: blockW, h: space.h - itemH, l: blockL });
            }

            // 3. Intersect and clip all other existing spaces against the new block
            const remainingSpaces = [];
            for (let i = 0; i < freeSpaces.length; i++) {
                if (i === bestCandidate.spaceIndex) continue;

                const s = freeSpaces[i];
                const overlap = !(
                    pMinX >= s.x + s.w || pMaxX <= s.x ||
                    pMinY >= s.y + s.h || pMaxY <= s.y ||
                    pMinZ >= s.z + s.l || pMaxZ <= s.z
                );

                if (!overlap) {
                    remainingSpaces.push(s);
                } else {
                    if (pMaxX < s.x + s.w) remainingSpaces.push({ x: pMaxX, y: s.y, z: s.z, w: (s.x + s.w) - pMaxX, h: s.h, l: s.l });
                    if (pMinX > s.x) remainingSpaces.push({ x: s.x, y: s.y, z: s.z, w: pMinX - s.x, h: s.h, l: s.l });
                    if (pMaxZ < s.z + s.l) remainingSpaces.push({ x: s.x, y: s.y, z: pMaxZ, w: s.w, h: s.h, l: (s.z + s.l) - pMaxZ });
                    if (pMinZ > s.z) remainingSpaces.push({ x: s.x, y: s.y, z: s.z, w: s.w, h: s.h, l: pMinZ - s.z });
                    if (pMaxY < s.y + s.h) remainingSpaces.push({ x: s.x, y: pMaxY, z: s.z, w: s.w, h: (s.y + s.h) - pMaxY, l: s.l });
                }
            }

            // 4. MAXIMAL SPACE SUBSUMPTION FILTER
            const allSpaces = [...remainingSpaces, ...generatedSpaces];
            freeSpaces = allSpaces.filter((s1, idx1) => {
                return !allSpaces.some((s2, idx2) => {
                    if (idx1 === idx2) return false;
                    return (
                        s1.x >= s2.x && s1.y >= s2.y && s1.z >= s2.z &&
                        (s1.x + s1.w) <= (s2.x + s2.w) &&
                        (s1.y + s1.h) <= (s2.y + s2.h) &&
                        (s1.z + s1.l) <= (s2.z + s2.l)
                    );
                });
            });
        }
    }

    let resultingHeight = 0;
    if (placedItems.length > 0) {
        resultingHeight = Math.max(...placedItems.map(p => p.y + p.h));
    }

    return {
        placedItems,
        engineName: "Maximal Empty Space (LAFF Block Builder / 20% Overhang)",
        efficiency: placedItems.length > 0 ? "Optimized Block Distribution" : "0.0",
        resultingHeight
    };
}