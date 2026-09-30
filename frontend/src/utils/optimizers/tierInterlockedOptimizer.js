export function packTierInterlocked(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0) {
    const placedItems = [];
    const effectiveW = palletSpec.width + (overhangX * 2);
    const effectiveL = palletSpec.length + (overhangY * 2);

    const minPalletX = -(effectiveW / 2);
    const minPalletZ = -(effectiveL / 2);
    const maxPalletX = (effectiveW / 2);
    const maxPalletZ = (effectiveL / 2);

    // ========================================================================
    // 1. INVENTORY STAGING
    // ========================================================================
    const itemsToPack = [];
    cargoList.forEach(item => {
        if (item.quantity <= 0) return;
        for (let i = 0; i < item.quantity; i++) {
            itemsToPack.push({
                ...item,
                quantity: 1,
                id: `${item.id || item.productCode}-${Math.random().toString(36).substring(2, 7)}`
            });
        }
    });

    itemsToPack.sort((a, b) => {
        const areaA = a.width * (a.length || a.width);
        const areaB = b.width * (b.length || b.width);
        if (areaB !== areaA) return areaB - areaA;
        return b.height - a.height;
    });

    // ========================================================================
    // 2. PHYSICS ENGINE
    // ========================================================================
    function checkCollision(bMinX, bMinY, bMinZ, bW, bH, bL) {
        const bMaxX = bMinX + bW - 0.1;
        const bMaxY = bMinY + bH - 0.1;
        const bMaxZ = bMinZ + bL - 0.1;

        for (const p of placedItems) {
            if (bMinX + 0.1 < p.minX + p.w && bMaxX > p.minX + 0.1 &&
                bMinY + 0.1 < p.minY + p.h && bMaxY > p.minY + 0.1 &&
                bMinZ + 0.1 < p.minZ + p.l && bMaxZ > p.minZ + 0.1) {
                return true;
            }
        }
        return false;
    }

    function checkSupport(bMinX, bMinY, bMinZ, bW, bL, minRatio = 0.60) {
        if (bMinY === 0) return true;

        let supportArea = 0;
        const requiredArea = bW * bL;
        const bMaxX = bMinX + bW;
        const bMaxZ = bMinZ + bL;

        for (const p of placedItems) {
            if (Math.abs((p.minY + p.h) - bMinY) < 1.0) {
                const overlapX = Math.max(0, Math.min(bMaxX, p.minX + p.w) - Math.max(bMinX, p.minX));
                const overlapZ = Math.max(0, Math.min(bMaxZ, p.minZ + p.l) - Math.max(bMinZ, p.minZ));

                if (overlapX > 0 && overlapZ > 0) {
                    supportArea += (overlapX * overlapZ);
                }
            }
        }
        return (supportArea / requiredArea) >= minRatio;
    }

    // ========================================================================
    // 3. HYBRID BUILD LOOP
    // ========================================================================
    let currentY = 0;
    let layerIndex = 0;
    let mode = 'JUSTIFIED'; // Starts with rigid, flush-corner interlocking

    while (itemsToPack.length > 0 && currentY < maxHeight) {

        if (mode === 'JUSTIFIED') {
            const heightGroups = new Map();
            itemsToPack.forEach(item => {
                if (!heightGroups.has(item.height)) heightGroups.set(item.height, []);
                heightGroups.get(item.height).push(item);
            });

            let bestHeight = null;
            let maxArea = 0;
            heightGroups.forEach((items, h) => {
                if (currentY + h <= maxHeight) {
                    const area = items.reduce((sum, it) => sum + (it.width * (it.length || it.width)), 0);
                    if (area > maxArea) {
                        maxArea = area;
                        bestHeight = h;
                    }
                }
            });

            if (!bestHeight) break;

            const tierPool = heightGroups.get(bestHeight);
            let poolCopy = [...tierPool];
            const generatedSlots = [];
            let gapTooLarge = false;

            if (layerIndex % 2 === 0) {
                // EVEN LAYERS (Align X)
                const rows = [];
                let totalL = 0;

                while (poolCopy.length > 0) {
                    let currentRow = [];
                    let currentW = 0, maxL = 0;

                    for (let i = 0; i < poolCopy.length; i++) {
                        const item = poolCopy[i];
                        let w = item.width, l = item.length || item.width, rot = false;

                        if (currentW + w > effectiveW) {
                            if (currentW + l <= effectiveW) { w = l; l = item.width; rot = true; }
                            else continue;
                        }
                        let nextMaxL = Math.max(maxL, l);
                        if (totalL + nextMaxL > effectiveL) continue;

                        currentRow.push({ item, w, l, rot });
                        currentW += w; maxL = nextMaxL;
                        poolCopy.splice(i, 1); i--;
                    }
                    if (currentRow.length === 0) break;
                    rows.push({ items: currentRow, totalW: currentW, maxL: maxL });
                    totalL += maxL;
                }

                const gapZ = rows.length > 1 ? (effectiveL - totalL) / (rows.length - 1) : 0;
                let currZ = minPalletZ;

                for (const row of rows) {
                    const gapX = row.items.length > 1 ? (effectiveW - row.totalW) / (row.items.length - 1) : 0;
                    let currX = minPalletX;

                    for (const slot of row.items) {
                        // TRIGGER: If gap exceeds half the box dimension, abort Justified layer
                        if (gapX > slot.w / 2 || gapZ > slot.l / 2) { gapTooLarge = true; break; }
                        generatedSlots.push({ item: slot.item, x: currX, z: currZ, w: slot.w, l: slot.l, rot: slot.rot });
                        currX += slot.w + gapX;
                    }
                    if (gapTooLarge) break;
                    currZ += row.maxL + gapZ;
                }

            } else {
                // ODD LAYERS (Align Z)
                const cols = [];
                let totalW = 0;

                while (poolCopy.length > 0) {
                    let currentCol = [];
                    let currentL = 0, maxW = 0;

                    for (let i = 0; i < poolCopy.length; i++) {
                        const item = poolCopy[i];
                        let w = item.length || item.width, l = item.width, rot = true;

                        if (currentL + l > effectiveL) {
                            if (currentL + item.width <= effectiveL) { w = item.width; l = item.length || item.width; rot = false; }
                            else continue;
                        }
                        let nextMaxW = Math.max(maxW, w);
                        if (totalW + nextMaxW > effectiveW) continue;

                        currentCol.push({ item, w, l, rot });
                        currentL += l; maxW = nextMaxW;
                        poolCopy.splice(i, 1); i--;
                    }
                    if (currentCol.length === 0) break;
                    cols.push({ items: currentCol, totalL: currentL, maxW: maxW });
                    totalW += maxW;
                }

                const gapX = cols.length > 1 ? (effectiveW - totalW) / (cols.length - 1) : 0;
                let currX = minPalletX;

                for (const col of cols) {
                    const gapZ = col.items.length > 1 ? (effectiveL - col.totalL) / (col.items.length - 1) : 0;
                    let currZ = minPalletZ;

                    for (const slot of col.items) {
                        // TRIGGER: If gap exceeds half the box dimension, abort Justified layer
                        if (gapX > slot.w / 2 || gapZ > slot.l / 2) { gapTooLarge = true; break; }
                        generatedSlots.push({ item: slot.item, x: currX, z: currZ, w: slot.w, l: slot.l, rot: slot.rot });
                        currZ += slot.l + gapZ;
                    }
                    if (gapTooLarge) break;
                    currX += col.maxW + gapX;
                }
            }

            // If gaps were too large, immediately revert to Extreme Point gap-filling
            if (gapTooLarge || generatedSlots.length === 0) {
                mode = 'EXTREME_POINT';
                continue;
            }

            let itemsPlacedInLayer = 0;
            for (const slot of generatedSlots) {
                if (checkSupport(slot.x, currentY, slot.z, slot.w, slot.l, 0.60)) {
                    placedItems.push({
                        ...slot.item, minX: slot.x, minY: currentY, minZ: slot.z,
                        w: slot.w, l: slot.l, h: bestHeight, rot: slot.rot
                    });

                    const globalIdx = itemsToPack.findIndex(it => it.id === slot.item.id);
                    if (globalIdx !== -1) itemsToPack.splice(globalIdx, 1);
                    itemsPlacedInLayer++;
                }
            }

            if (itemsPlacedInLayer > 0) {
                currentY += bestHeight;
                layerIndex++;
            } else {
                mode = 'EXTREME_POINT';
            }
        }

            // ========================================================================
            // 4. FALLBACK: 3D EXTREME POINT (Gap Fill)
        // ========================================================================
        else if (mode === 'EXTREME_POINT') {
            let eps = [{ x: minPalletX, y: 0, z: minPalletZ }];
            placedItems.forEach(p => {
                eps.push({ x: p.minX + p.w, y: p.minY, z: p.minZ });
                eps.push({ x: p.minX, y: p.minY, z: p.minZ + p.l });
                eps.push({ x: p.minX, y: p.minY + p.h, z: p.minZ });
                eps.push({ x: p.minX + p.w, y: p.minY + p.h, z: p.minZ });
                eps.push({ x: p.minX, y: p.minY + p.h, z: p.minZ + p.l });
            });

            let epPacking = true;
            while (itemsToPack.length > 0 && epPacking) {

                // Deduplicate and bound-check EPs
                const validEPs = [];
                const seen = new Set();
                for (const pt of eps) {
                    if (pt.x >= maxPalletX || pt.z >= maxPalletZ || pt.y >= maxHeight) continue;
                    const key = `${Math.round(pt.x)},${Math.round(pt.y)},${Math.round(pt.z)}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        validEPs.push(pt);
                    }
                }

                // Sort: Lowest Y first, then deepest Z, then X
                validEPs.sort((a, b) => {
                    if (Math.abs(a.y - b.y) > 0.1) return a.y - b.y;
                    if (Math.abs(a.z - b.z) > 0.1) return a.z - b.z;
                    return a.x - b.x;
                });

                let placedInPass = false;
                for (const pt of validEPs) {
                    for (let i = 0; i < itemsToPack.length; i++) {
                        const item = itemsToPack[i];
                        if (pt.y + item.height > maxHeight) continue;

                        const orientations = (item.type === 'barrel' || item.width === (item.length || item.width))
                            ? [{ w: item.width, l: item.length || item.width, rot: false }]
                            : [{ w: item.width, l: item.length || item.width, rot: false }, { w: item.length || item.width, l: item.width, rot: true }];

                        for (const ori of orientations) {
                            if (pt.x + ori.w <= maxPalletX + 0.1 && pt.z + ori.l <= maxPalletZ + 0.1) {
                                // Strict support (80%) for 3D gap filling to prevent tipping
                                if (!checkCollision(pt.x, pt.y, pt.z, ori.w, item.height, ori.l) &&
                                    checkSupport(pt.x, pt.y, pt.z, ori.w, ori.l, 0.80)) {

                                    const placedItem = itemsToPack.splice(i, 1)[0];
                                    placedItems.push({
                                        ...placedItem,
                                        minX: pt.x, minY: pt.y, minZ: pt.z,
                                        w: ori.w, l: ori.l, h: item.height, rot: ori.rot
                                    });

                                    eps.push({ x: pt.x + ori.w, y: pt.y, z: pt.z });
                                    eps.push({ x: pt.x, y: pt.y, z: pt.z + ori.l });
                                    eps.push({ x: pt.x, y: pt.y + item.height, z: pt.z });

                                    placedInPass = true;
                                    break;
                                }
                            }
                        }
                        if (placedInPass) break;
                    }
                    if (placedInPass) break;
                }

                if (!placedInPass) epPacking = false;
            }
            break; // If EP mode exhausts, the pallet is truly mathematically full
        }
    }

    const finalPlacedItems = placedItems.map(p => ({
        ...p,
        x: p.minX + (p.w / 2),
        y: p.minY,
        z: p.minZ + (p.l / 2),
        width: p.w,
        length: p.l,
        height: p.h,
        rotated: p.rot
    }));

    const totalInputItems = cargoList.reduce((sum, c) => sum + (c.quantity || 0), 0);
    const resultingHeight = finalPlacedItems.length > 0 ? Math.max(...finalPlacedItems.map(p => p.y + p.h)) : 0;

    return {
        placedItems: finalPlacedItems,
        engineName: "Hybrid Justified-EP Engine",
        efficiency: totalInputItems > 0 ? ((finalPlacedItems.length / totalInputItems) * 100).toFixed(1) : "0.0",
        resultingHeight
    };
}