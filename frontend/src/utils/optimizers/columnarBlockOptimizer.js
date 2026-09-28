// ============================================================================
// ENGINE 5: COLUMNAR PILLAR-BASED PACKER (Retail Distribution Standard)
// Iterative Pillar Compression & Contiguous Bottom-Left 2D Floor Packing
// ============================================================================
export function packColumnarBlock(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0) {
    const W = palletSpec.width + overhangX * 2;
    const L = palletSpec.length + overhangY * 2;
    const X_min = -W / 2;
    const X_max = W / 2;
    const Z_min = -L / 2;
    const Z_max = L / 2;

    let formattedCargo = [];
    let minItemHeight = Infinity;
    let maxItemHeight = 0;

    // 1. Prepare Cargo & Determine Constraints
    cargoList.forEach(cargo => {
        const isBarrel = cargo.type === 'barrel' || cargo.type === 'container';
        const itemDiameter = Number(cargo.diameter) || Number(cargo.width) || Number(cargo.length) || 200;
        const w = isBarrel ? itemDiameter : (Number(cargo.width) || 200);
        const l = isBarrel ? itemDiameter : (Number(cargo.length) || 300);
        const h = Number(cargo.height) || 150;
        const weight = Number(cargo.weight) || 1.0;

        if (h < minItemHeight) minItemHeight = h;
        if (h > maxItemHeight) maxItemHeight = h;

        formattedCargo.push({
            ...cargo, w, l, h, weight, isBarrel,
            targetCargoId: cargo.cargoId || cargo.id
        });
    });

    if (formattedCargo.length === 0) {
        return {
            engineType: 'columnarBlock',
            engineName: 'Column-Block Pillar Packer',
            placedItems: [], unplacedCount: 0, efficiency: '0.0', totalColumns: 0, resultingHeight: 0
        };
    }

    let bestPlacedColumns = [];
    let bestUnplacedCount = Infinity;

    // Build the array of target height iterations to test
    let targetHeights = [];
    for (let th = maxItemHeight; th <= maxHeight; th += minItemHeight) {
        targetHeights.push(th);
    }
    if (!targetHeights.includes(maxHeight)) targetHeights.push(maxHeight);

    // 2. ITERATIVE COMPRESSION LOOP
    // Start at the shortest possible height limit to force wide spreading.
    // If items don't fit on the 2D floor, increase the height limit and try again.
    for (let targetHeight of targetHeights) {
        let columnsPool = [];
        let itemCounter = 0;

        // Pre-assemble purely vertical pillars of identical SKUs
        formattedCargo.forEach(cargo => {
            const effectiveMaxHeight = cargo.weight > 18.0 ? Math.min(maxHeight, 1200) : maxHeight;
            const activeLimit = Math.min(targetHeight, effectiveMaxHeight);

            const maxPerCol = Math.max(1, Math.floor(activeLimit / cargo.h));
            const numCols = Math.ceil(cargo.quantity / maxPerCol);

            const baseItemsPerCol = Math.floor(cargo.quantity / numCols);
            const remainder = cargo.quantity % numCols;

            for (let c = 0; c < numCols; c++) {
                const itemsInThisCol = baseItemsPerCol + (c < remainder ? 1 : 0);
                if (itemsInThisCol === 0) continue;

                const columnItems = [];
                for (let i = 0; i < itemsInThisCol; i++) {
                    columnItems.push({
                        ...cargo,
                        id: `${cargo.targetCargoId}-${itemCounter++}`,
                        w: cargo.w, l: cargo.l, h: cargo.h, weight: cargo.weight, isBarrel: cargo.isBarrel
                    });
                }

                columnsPool.push({
                    w: cargo.w, l: cargo.l,
                    h: cargo.h * itemsInThisCol,
                    baseArea: cargo.w * cargo.l,
                    weight: cargo.weight * itemsInThisCol,
                    isBarrel: cargo.isBarrel,
                    items: columnItems
                });
            }
        });

        // Sort Pillars: Largest footprint area first ensures dense 2D packing without gaps
        columnsPool.sort((a, b) => (b.baseArea - a.baseArea) || (b.weight - a.weight) || (b.isBarrel === a.isBarrel ? 0 : a.isBarrel ? 1 : -1));

        let placedColumns = [];
        let poolCopy = [...columnsPool];

        const intersects2D = (candidate, list) => list.some(p =>
            candidate.x < p.x + p.w - 0.1 && candidate.x + candidate.w > p.x + 0.1 &&
            candidate.z < p.z + p.l - 0.1 && candidate.z + candidate.l > p.z + 0.1
        );

        // 3. DENSE BOTTOM-LEFT 2D FLOOR PACKING
        let progress = true;
        while (progress && poolCopy.length > 0) {
            progress = false;
            let bestPlacement = null;
            let bestScore = Infinity;
            let bestIdx = -1;

            let xCandidates = [X_min];
            let zCandidates = [Z_min];

            placedColumns.forEach(p => {
                xCandidates.push(p.x, p.x + p.w);
                zCandidates.push(p.z, p.z + p.l);
            });

            xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x * 10) / 10))).filter(x => x >= X_min - 0.1 && x <= X_max - 0.1).sort((a, b) => a - b);
            zCandidates = Array.from(new Set(zCandidates.map(z => Math.round(z * 10) / 10))).filter(z => z >= Z_min - 0.1 && z <= Z_max - 0.1).sort((a, b) => a - b);

            for (let idx = 0; idx < poolCopy.length; idx++) {
                const col = poolCopy[idx];
                const orientations = col.isBarrel ? [{ w: col.w, l: col.l }] : [{ w: col.w, l: col.l }, { w: col.l, l: col.w }];

                for (let tz of zCandidates) {
                    for (let tx of xCandidates) {
                        for (let ori of orientations) {
                            const candidate = { x: tx, z: tz, w: ori.w, l: ori.l, h: col.h };

                            if (candidate.x + candidate.w > X_max + 0.1) continue;
                            if (candidate.z + candidate.l > Z_max + 0.1) continue;
                            if (intersects2D(candidate, placedColumns)) continue;

                            // Bottom-Left Score: Packs columns densely against each other starting from the back-left
                            const score = (tz * 10000) + tx;

                            if (score < bestScore) {
                                bestScore = score;
                                bestPlacement = { ...col, ...candidate };
                                bestIdx = idx;
                            }
                        }
                    }
                }
            }

            if (bestPlacement) {
                placedColumns.push(bestPlacement);
                poolCopy.splice(bestIdx, 1);
                progress = true;
            }
        }

        const unplaced = poolCopy.reduce((sum, col) => sum + col.items.length, 0);

        if (unplaced === 0) {
            bestPlacedColumns = placedColumns;
            bestUnplacedCount = 0;
            break; // Found the lowest possible uniform configuration that perfectly fits everything
        } else if (unplaced < bestUnplacedCount) {
            bestPlacedColumns = placedColumns;
            bestUnplacedCount = unplaced;
        }
    }

    // 4. UNIFORM WEIGHT DISTRIBUTION (Center Bounding Box)
    if (bestPlacedColumns.length > 0) {
        const minX = Math.min(...bestPlacedColumns.map(p => p.x));
        const maxX = Math.max(...bestPlacedColumns.map(p => p.x + p.w));
        const minZ = Math.min(...bestPlacedColumns.map(p => p.z));
        const maxZ = Math.max(...bestPlacedColumns.map(p => p.z + p.l));

        const shiftX = 0 - ((minX + maxX) / 2);
        const shiftZ = 0 - ((minZ + maxZ) / 2);

        bestPlacedColumns = bestPlacedColumns.map(p => ({
            ...p,
            x: p.x + shiftX,
            z: p.z + shiftZ
        }));
    }

    // 5. EXPAND 2D PILLARS INTO 3D ITEMS FOR THREE.JS
    let finalPlacedItems = [];
    bestPlacedColumns.forEach((col, colIndex) => {
        let currentY = 0;
        col.items.forEach((item, itemIndex) => {
            finalPlacedItems.push({
                ...item,
                width: col.w,   // explicitly override for 3D Renderer to avoid clipping
                length: col.l,  // explicitly override for 3D Renderer to avoid clipping
                w: col.w,
                l: col.l,
                x: col.x + col.w / 2, // Map to center origin
                y: currentY,
                z: col.z + col.l / 2, // Map to center origin
                columnIndex: colIndex,
                tierIndex: itemIndex
            });
            currentY += item.h;
        });
    });

    const resultingHeight = finalPlacedItems.reduce((max, p) => Math.max(max, p.y + p.h), 0);
    const totalPackedVol = finalPlacedItems.reduce((s, i) => s + (i.w * i.l * i.h), 0);
    const efficiency = ((totalPackedVol / (W * L * maxHeight)) * 100).toFixed(1);

    return {
        engineType: 'columnarBlock',
        engineName: 'Column-Block Pillar Packer (Retail Distribution Standard)',
        placedItems: finalPlacedItems,
        unplacedCount: bestUnplacedCount,
        efficiency,
        totalColumns: bestPlacedColumns.length,
        resultingHeight
    };
}