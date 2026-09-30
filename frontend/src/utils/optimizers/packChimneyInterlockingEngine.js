export function packChimneyInterlockingEngine(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0) {
    const placedItems = [];
    const effectiveW = palletSpec.width + (overhangX * 2);
    const effectiveL = palletSpec.length + (overhangY * 2);

    const minX = -(effectiveW / 2);
    const minZ = -(effectiveL / 2);
    const maxX = (effectiveW / 2);
    const maxZ = (effectiveL / 2);

    // ========================================================================
    // 1. GROUP & SORT INVENTORY BY SKU (Heavy/Large Base First)
    // ========================================================================
    const groupedSKUs = [];
    cargoList.forEach(item => {
        if (item.quantity <= 0) return;
        const weight = Number(item.weight) || 1;
        const vol = (item.width * (item.length || item.width) * item.height) / 1000000;
        const density = weight / vol;

        groupedSKUs.push({
            ...item,
            weight,
            density,
            items: Array.from({ length: item.quantity }, () => ({
                ...item,
                quantity: 1,
                id: `${item.id || item.productCode}-${Math.random().toString(36).substring(2, 7)}`
            }))
        });
    });

    // Sort SKUs by density first (heavy items at base), then by footprint area
    groupedSKUs.sort((a, b) => {
        if (Math.abs(b.density - a.density) > 5) return b.density - a.density;
        const areaA = a.width * (a.length || a.width);
        const areaB = b.width * (b.length || b.width);
        return areaB - areaA;
    });

    let currentY = 0;

    // ========================================================================
    // 2. CHIMNEY / PINWHEEL PATTERN GENERATOR (2D Layer Layout)
    // ========================================================================
    function generateChimneyLayerLayout(sku, availableW, availableL) {
        const boxW = sku.width;
        const boxL = sku.length || sku.width;

        // Evaluate if a 4-block or N-block Pinwheel can fit the perimeter
        // Side 1 (Top): Horizontal boxes along width
        // Side 2 (Right): Vertical boxes along length
        // Side 3 (Bottom): Horizontal boxes along width
        // Side 4 (Left): Vertical boxes along length

        const countTopW = Math.floor(availableW / boxW);
        const countRightL = Math.floor((availableL - boxL) / boxW);

        const layoutA = [];

        if (sku.type === 'barrel' || boxW === boxL) {
            // Standard Grid Layout for symmetric/cylindrical items
            const cols = Math.floor(availableW / boxW);
            const rows = Math.floor(availableL / boxL);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    layoutA.push({
                        relX: minX + (c * boxW) + (boxW / 2),
                        relZ: minZ + (r * boxL) + (boxL / 2),
                        w: boxW, l: boxL, rotated: false
                    });
                }
            }
            return { layoutA, layoutB: layoutA, itemsPerLayer: layoutA.length, coreVoid: null };
        }

        // --- ASSEMBLE PINWHEEL / CHIMNEY RING ---
        // 1. Top Edge (Length aligned to X)
        const topCols = Math.floor((availableW - boxW) / boxL);
        for (let c = 0; c < topCols; c++) {
            layoutA.push({
                relX: minX + (c * boxL) + (boxL / 2),
                relZ: minZ + (boxW / 2),
                w: boxL, l: boxW, rotated: true
            });
        }

        // 2. Right Edge (Length aligned to Z)
        const rightRows = Math.floor((availableL - boxW) / boxL);
        for (let r = 0; r < rightRows; r++) {
            layoutA.push({
                relX: maxX - (boxW / 2),
                relZ: minZ + (r * boxL) + (boxL / 2),
                w: boxW, l: boxL, rotated: false
            });
        }

        // 3. Bottom Edge (Length aligned to X)
        const botCols = Math.floor((availableW - boxW) / boxL);
        for (let c = 0; c < botCols; c++) {
            layoutA.push({
                relX: maxX - (c * boxL) - (boxL / 2),
                relZ: maxZ - (boxW / 2),
                w: boxL, l: boxW, rotated: true
            });
        }

        // 4. Left Edge (Length aligned to Z)
        const leftRows = Math.floor((availableL - boxW) / boxL);
        for (let r = 0; r < leftRows; r++) {
            layoutA.push({
                relX: minX + (boxW / 2),
                relZ: maxZ - (r * boxL) - (boxL / 2),
                w: boxW, l: boxL, rotated: false
            });
        }

        // Fallback: If dimensions don't allow a pure pinwheel ring, use an interlocked brick layout
        if (layoutA.length < 4) {
            layoutA.length = 0;
            const cols = Math.floor(availableW / boxW);
            const rows = Math.floor(availableL / boxL);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    layoutA.push({
                        relX: minX + (c * boxW) + (boxW / 2),
                        relZ: minZ + (r * boxL) + (boxL / 2),
                        w: boxW, l: boxL, rotated: false
                    });
                }
            }
        }

        // --- CALCULATE CHIMNEY CORE VOID ---
        // Determines the interior bounding box surrounded by the pinwheel ring
        const innerMinX = minX + boxW;
        const innerMaxX = maxX - boxW;
        const innerMinZ = minZ + boxW;
        const innerMaxZ = maxZ - boxW;

        let coreVoid = null;
        if (innerMaxX > innerMinX && innerMaxZ > innerMinZ) {
            coreVoid = {
                x: (innerMinX + innerMaxX) / 2,
                z: (innerMinZ + innerMaxZ) / 2,
                w: innerMaxX - innerMinX,
                l: innerMaxZ - innerMinZ
            };

            // Attempt to pack the central chimney hole with standard orientation boxes
            const coreCols = Math.floor(coreVoid.w / boxW);
            const coreRows = Math.floor(coreVoid.l / boxL);

            if (coreCols > 0 && coreRows > 0) {
                const coreStartUnshiftedX = innerMinX;
                const coreStartUnshiftedZ = innerMinZ;

                for (let r = 0; r < coreRows; r++) {
                    for (let c = 0; c < coreCols; c++) {
                        layoutA.push({
                            relX: coreStartUnshiftedX + (c * boxW) + (boxW / 2),
                            relZ: coreStartUnshiftedZ + (r * boxL) + (boxL / 2),
                            w: boxW, l: boxL, rotated: false
                        });
                    }
                }
            }
        }

        // --- GENERATE PATTERN B (180-Degree Mirrored Interlock) ---
        // Rotating the layer layout by 180 degrees shifts all seams, locking adjacent layers together
        const layoutB = layoutA.map(item => ({
            relX: -item.relX,
            relZ: -item.relZ,
            w: item.w,
            l: item.l,
            rotated: item.rotated
        }));

        return {
            layoutA,
            layoutB,
            itemsPerLayer: layoutA.length
        };
    }

    // ========================================================================
    // 3. MAIN TIER STACKING LOOP (Interlocked Layers A/B)
    // ========================================================================
    for (const skuGroup of groupedSKUs) {
        if (skuGroup.items.length === 0) continue;
        if (currentY + skuGroup.height > maxHeight) break;

        const pattern = generateChimneyLayerLayout(skuGroup, effectiveW, effectiveL);
        if (pattern.itemsPerLayer === 0) continue;

        let layerCount = 0;

        while (skuGroup.items.length > 0 && (currentY + skuGroup.height) <= maxHeight) {
            // Alternate between Pattern A (Odd) and Pattern B (Even) for 100% layer interlocking
            const activeLayout = (layerCount % 2 === 0) ? pattern.layoutA : pattern.layoutB;

            // Verify if we have enough inventory to fill a complete or partial layer
            if (skuGroup.items.length < Math.ceil(pattern.itemsPerLayer * 0.5) && layerCount > 0) {
                // Stop adding sparse top layers for this SKU to prevent weak pinnacles
                break;
            }

            let itemsPlacedInLayer = 0;

            for (const pos of activeLayout) {
                if (skuGroup.items.length === 0) break;

                const itemToPlace = skuGroup.items.shift();
                placedItems.push({
                    ...itemToPlace,
                    x: pos.relX,
                    y: currentY,
                    z: pos.relZ,
                    w: pos.w,
                    l: pos.l,
                    h: skuGroup.height,
                    width: pos.w,
                    length: pos.l,
                    height: skuGroup.height,
                    rotated: pos.rotated
                });
                itemsPlacedInLayer++;
            }

            if (itemsPlacedInLayer > 0) {
                currentY += skuGroup.height;
                layerCount++;
            } else {
                break;
            }
        }
    }

    const totalInputItems = cargoList.reduce((sum, c) => sum + (c.quantity || 0), 0);
    let resultingHeight = 0;
    if (placedItems.length > 0) {
        resultingHeight = Math.max(...placedItems.map(p => p.y + p.h));
    }

    return {
        placedItems,
        engineName: "Industry Standard Chimney Interlocking Packer",
        efficiency: totalInputItems > 0 ? ((placedItems.length / totalInputItems) * 100).toFixed(1) : "0.0",
        resultingHeight
    };
}