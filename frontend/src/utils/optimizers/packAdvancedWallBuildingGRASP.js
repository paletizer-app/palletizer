export function packAdvancedWallBuildingGRASP(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0) {
    const effectiveW = palletSpec.width + (overhangX * 2);
    const effectiveL = palletSpec.length + (overhangY * 2);

    const minX = -(effectiveW / 2);
    const minZ = -(effectiveL / 2);
    const maxX = (effectiveW / 2);
    const maxZ = (effectiveL / 2);

    // 1. Flatten and format inventory
    const initialInventory = [];
    cargoList.forEach(item => {
        if (item.quantity <= 0) return;
        for (let i = 0; i < item.quantity; i++) {
            initialInventory.push({
                ...item,
                quantity: 1,
                id: `${item.width}-${item.length}-${item.height}-${Math.random().toString(36).substr(2, 5)}`
            });
        }
    });

    const totalInputItems = initialInventory.length;
    if (totalInputItems === 0) return { placedItems: [], engineName: "Terraced Wall-Building", efficiency: "0.0", resultingHeight: 0 };

    const GRASP_ITERATIONS = 20;
    let fittestSolution = { placedItems: [], volume: 0, height: 0, variance: Infinity };

    function getPackedVolume(items) {
        return items.reduce((sum, item) => sum + (item.w * item.l * item.h), 0);
    }

    // 2. METAHEURISTIC SEARCH LOOP
    for (let iteration = 0; iteration < GRASP_ITERATIONS; iteration++) {
        let currentInventory = [...initialInventory];
        let placedItems = [];

        // --- PHASE 1: Z-AXIS PARTITIONING (Define Wall Footprints) ---
        let walls = [];
        let currentZ = minZ;

        // Extract all unique depths from the remaining inventory
        let availableDepths = [...new Set(currentInventory.flatMap(i => [i.width, i.length]))];

        while (currentZ < maxZ && availableDepths.length > 0) {
            let validDepths = availableDepths.filter(d => currentZ + d <= maxZ);
            if (validDepths.length === 0) break;

            // GRASP: Randomly pick from valid depths to create diverse Z-partitions across iterations
            let chosenDepth = validDepths[Math.floor(Math.random() * validDepths.length)];

            walls.push({
                zMin: currentZ,
                depth: chosenDepth,
                currentY: 0 // All walls start at the floor
            });
            currentZ += chosenDepth;
        }

        // --- PHASE 2: TERRACED (WATER-LEVEL) PACKING ---
        // Prevents towering by strictly packing shelves into the lowest available wall
        let placedAny = true;

        while (placedAny && currentInventory.length > 0) {
            placedAny = false;

            // Sort walls by elevation (Lowest Y first)
            walls.sort((a, b) => a.currentY - b.currentY);
            let activeWall = walls[0];

            if (activeWall.currentY >= maxHeight) break; // Pallet is completely leveled to max height

            // Find all items that fit the depth of this specific wall
            const shelfCandidates = currentInventory.filter(item =>
                (item.width === activeWall.depth || item.length === activeWall.depth) &&
                (activeWall.currentY + item.height <= maxHeight)
            );

            if (shelfCandidates.length > 0) {
                // Determine shelf height (mode height of fitting candidates)
                const heightFreq = {};
                shelfCandidates.forEach(c => heightFreq[c.height] = (heightFreq[c.height] || 0) + 1);
                const targetShelfHeight = Number(Object.keys(heightFreq).sort((a, b) => heightFreq[b] - heightFreq[a])[0]);

                let currentX = minX;
                let itemsToRemove = new Set();
                let shelfPlaced = false;

                // Pack items across the X-axis to form a single level shelf
                for (let i = 0; i < currentInventory.length; i++) {
                    if (itemsToRemove.has(i)) continue;
                    const item = currentInventory[i];

                    if (item.height !== targetShelfHeight) continue; // Keep shelf perfectly flat
                    if (activeWall.currentY + item.height > maxHeight) continue;

                    let fitW = 0, fitL = 0, rotated = false;

                    if (item.width === activeWall.depth) {
                        fitW = item.length;
                        fitL = item.width;
                        rotated = true;
                    } else if (item.length === activeWall.depth) {
                        fitW = item.width;
                        fitL = item.length;
                        rotated = false;
                    } else {
                        continue;
                    }

                    if (currentX + fitW <= maxX) {
                        placedItems.push({
                            ...item,
                            x: currentX + (fitW / 2),
                            y: activeWall.currentY,
                            z: activeWall.zMin + (fitL / 2),
                            w: fitW, l: fitL, h: item.height,
                            width: fitW, length: fitL, height: item.height,
                            rotated: rotated
                        });
                        currentX += fitW;
                        itemsToRemove.add(i);
                        shelfPlaced = true;
                    }
                }

                if (shelfPlaced) {
                    // Permanently remove placed items
                    currentInventory = currentInventory.filter((_, idx) => !itemsToRemove.has(idx));
                    // Elevate this specific wall
                    activeWall.currentY += targetShelfHeight;
                    placedAny = true;
                } else {
                    // If we found candidates but none could fit the X-width, artificially cap this wall to prevent infinite loops
                    activeWall.currentY = maxHeight;
                    placedAny = true;
                }
            } else {
                // No items fit this wall's depth and remaining height; seal the wall
                activeWall.currentY = maxHeight;
                placedAny = true; // Trigger resort to process the next lowest wall
            }
        }

        // --- FITNESS EVALUATION ---
        // Score generations based on maximum volume.
        // Tie-breaker: Minimize height variance (rewards flat, stable pallets over jagged ones)
        const generationVolume = getPackedVolume(placedItems);
        const wallHeights = walls.map(w => w.currentY < maxHeight ? w.currentY : 0).filter(h => h > 0);
        const maxH = wallHeights.length > 0 ? Math.max(...wallHeights) : 0;
        const minH = wallHeights.length > 0 ? Math.min(...wallHeights) : 0;
        const variance = maxH - minH;

        let isBetter = false;
        if (generationVolume > fittestSolution.volume) {
            isBetter = true;
        } else if (generationVolume === fittestSolution.volume && variance < fittestSolution.variance) {
            isBetter = true;
        }

        if (isBetter) {
            fittestSolution = {
                placedItems: placedItems,
                volume: generationVolume,
                height: Math.max(0, ...placedItems.map(p => p.y + p.h)),
                variance: variance
            };
        }
    }

    return {
        placedItems: fittestSolution.placedItems,
        engineName: "Terraced GRASP Wall-Building",
        efficiency: totalInputItems > 0 ? ((fittestSolution.placedItems.length / totalInputItems) * 100).toFixed(1) : "0.0",
        resultingHeight: fittestSolution.height
    };
}