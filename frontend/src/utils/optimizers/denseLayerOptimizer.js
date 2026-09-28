// ============================================================================
// ENGINE 5: UNIFIED PYRAMID LAYER PACKER (Total Area Supremacy)
// 1. Total Area Supremacy: Sorts STRICTLY by total group area first. Prevents
//    a single tiny box from ruining a wide cylinder foundation.
// 2. Composite Centering: Centers the fully-packed mixed block over the base.
// 3. Strict Rim-Locking: Prevents same-size cylinders from staircasing.
// 4. Strict Perimeter Bounding: Forbids overhanging the supporting tier.
// 5. Smart Peak Shaver: Removes narrow top pillars, but explicitly EXEMPTS
//    rim-locked cylinders, allowing buckets to stack safely to the ceiling.
// ============================================================================
export function packDenseLayered(cargoList, palletSpec = {}, maxHeight = 1800, overhangX = 0, overhangY = 0) {
    const rawW = Number(palletSpec.width || palletSpec.w || 1200);
    const rawL = Number(palletSpec.length || palletSpec.l || 800);
    const oX = Number(overhangX || palletSpec.overhangX || 0);
    const oY = Number(overhangY || palletSpec.overhangY || 0);

    const W = rawW + oX * 2;
    const L = rawL + oY * 2;

    let effMaxHeight = Number(maxHeight || palletSpec.maxHeight || palletSpec.truckHeight || 1800);
    if (isNaN(effMaxHeight) || effMaxHeight < 500) effMaxHeight = 1800;

    let pool = [];
    (cargoList || []).forEach((cargo) => {
        const origId = String(cargo.id || cargo.cargoId || cargo._id || 'cargo');
        const cId = String(cargo.cargoId || cargo.id || cargo._id || 'cargo');
        const w = Number(cargo.width || cargo.w || cargo.dimX) || 200;
        const l = Number(cargo.length || cargo.l || cargo.dimY) || 300;
        const h = Number(cargo.height || cargo.h || cargo.dimZ) || 150;
        const weight = Number(cargo.weight || cargo.wt || cargo.mass) || 1.0;
        const qty = Number(cargo.quantity || cargo.qty || cargo.count || cargo.amount) || 1;

        const isCylinder = Boolean(
            cargo.isCylinder ||
            cargo.type === 'barrel' ||
            cargo.type === 'cylinder' ||
            cId.toLowerCase().includes('cyan') ||
            cId.toLowerCase().includes('bucket') ||
            cId.toLowerCase().includes('cyl')
        );

        for (let i = 0; i < qty; i++) {
            pool.push({
                ...cargo,
                id: origId,
                cargoId: cId,
                uniqueId: `${cId}-${i}`,
                w, l, h, weight,
                isCylinder
            });
        }
    });

    if (pool.length === 0) {
        return {
            engineType: 'denseLayered',
            engineName: 'Unified Composite Tier Builder',
            placedItems: [],
            unplacedCount: 0,
            efficiency: '0.0',
            resultingHeight: 0
        };
    }

    // ------------------------------------------------------------------------
    // CORE 2D PACKING ALGORITHM
    // ------------------------------------------------------------------------
    const pack2D = (itemsToPack, targetW, targetL) => {
        let placed2D = [];
        let itemsCopy = [...itemsToPack];

        for (let i = 0; i < itemsCopy.length; i++) {
            let item = itemsCopy[i];
            let xCandidates = [0];
            let zCandidates = [0];

            placed2D.forEach(p => {
                xCandidates.push(p.x + p.w);
                zCandidates.push(p.z + p.l);
            });

            xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x * 10) / 10)))
                .filter(x => x + Math.min(item.w, item.l) <= targetW + 0.01).sort((a, b) => a - b);
            zCandidates = Array.from(new Set(zCandidates.map(z => Math.round(z * 10) / 10)))
                .filter(z => z + Math.min(item.w, item.l) <= targetL + 0.01).sort((a, b) => a - b);

            let best = null;
            let bestScore = Infinity;

            for (let tz of zCandidates) {
                for (let tx of xCandidates) {
                    for (let ori of [{ w: item.w, l: item.l }, { w: item.l, l: item.w }]) {
                        if (tx + ori.w > targetW + 0.01 || tz + ori.l > targetL + 0.01) continue;

                        let intersect = placed2D.some(p =>
                            tx < p.x + p.w - 0.1 && tx + ori.w > p.x + 0.1 &&
                            tz < p.z + p.l - 0.1 && tz + ori.l > p.z + 0.1
                        );

                        if (!intersect) {
                            let score = (tz * 10000) + tx;
                            if (score < bestScore) {
                                bestScore = score;
                                best = { ...item, x: tx, z: tz, w: ori.w, l: ori.l };
                            }
                        }
                    }
                }
            }

            if (best) {
                placed2D.push(best);
                itemsCopy.splice(i, 1);
                i--;
            }
        }
        return placed2D;
    };

    const checkSupport = (itemCandidate, cx, cz, dropY, currentPlaced, reqSupportOverride = null, strictNoOverhang = false) => {
        if (dropY <= 0.1) return true;

        let supportArea = 0;
        let restingOnSameCylinder = false;
        let perfectlyAlignedWithCylinder = false;

        let suppMinX = Infinity, suppMaxX = -Infinity;
        let suppMinZ = Infinity, suppMaxZ = -Infinity;

        currentPlaced.forEach(p => {
            if (Math.abs(p.y + p.height - dropY) < 1.0) {
                let pW = p.width;
                let pL = p.length;

                if (p.isCylinder) {
                    if (itemCandidate.isCylinder) {
                        const isSameSize = Math.abs(p.width - itemCandidate.w) < 5 && Math.abs(p.length - itemCandidate.l) < 5;
                        const oX = Math.max(0, Math.min(cx + itemCandidate.w / 2, p.x + p.width / 2) - Math.max(cx - itemCandidate.w / 2, p.x - p.width / 2));
                        const oZ = Math.max(0, Math.min(cz + itemCandidate.l / 2, p.z + p.length / 2) - Math.max(cz - itemCandidate.l / 2, p.z - p.length / 2));

                        if (oX > 5.0 && oZ > 5.0 && isSameSize) {
                            restingOnSameCylinder = true;
                            if (Math.abs(p.x - cx) <= 3.0 && Math.abs(p.z - cz) <= 3.0) {
                                perfectlyAlignedWithCylinder = true;
                            }
                        }
                    } else {
                        pW *= 0.75;
                        pL *= 0.75;
                    }
                }

                const overlapX = Math.max(0, Math.min(cx + itemCandidate.w / 2, p.x + pW / 2) - Math.max(cx - itemCandidate.w / 2, p.x - pW / 2));
                const overlapZ = Math.max(0, Math.min(cz + itemCandidate.l / 2, p.z + pL / 2) - Math.max(cz - itemCandidate.l / 2, p.z - pL / 2));
                if (overlapX > 0 && overlapZ > 0) {
                    supportArea += overlapX * overlapZ;

                    suppMinX = Math.min(suppMinX, p.x - p.width / 2);
                    suppMaxX = Math.max(suppMaxX, p.x + p.width / 2);
                    suppMinZ = Math.min(suppMinZ, p.z - p.length / 2);
                    suppMaxZ = Math.max(suppMaxZ, p.z + p.length / 2);
                }
            }
        });

        if (itemCandidate.isCylinder && restingOnSameCylinder && !perfectlyAlignedWithCylinder) {
            return false;
        }

        if (strictNoOverhang && supportArea > 0) {
            const iMinX = cx - itemCandidate.w / 2;
            const iMaxX = cx + itemCandidate.w / 2;
            const iMinZ = cz - itemCandidate.l / 2;
            const iMaxZ = cz + itemCandidate.l / 2;

            if (iMinX < suppMinX - 2.0 || iMaxX > suppMaxX + 2.0 || iMinZ < suppMinZ - 2.0 || iMaxZ > suppMaxZ + 2.0) {
                return false;
            }
        }

        const reqSupport = reqSupportOverride || (itemCandidate.isCylinder ? 0.75 : 0.60);
        return (supportArea / (itemCandidate.w * itemCandidate.l)) >= reqSupport;
    };

    const getGroups = (sourcePool) => {
        const groups = {};
        sourcePool.forEach(item => {
            const d1 = Math.max(item.w, item.l);
            const d2 = Math.min(item.w, item.l);
            const key = `${d1}x${d2}x${item.h}-${item.isCylinder}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return Object.values(groups);
    };

    let placed = [];
    let targetBounds = { x: -W / 2, z: -L / 2, w: W, l: L };

    // ========================================================================
    // PHASE 1: UNIFIED COMPOSITE TIER BUILDER
    // ========================================================================
    while (pool.length > 0) {
        let groups = getGroups(pool);

        // NEW: Sort by Absolute Total Area to prevent boxes from hijacking the base
        groups.sort((a, b) => {
            let areaA = a.length * (a[0].w * a[0].l);
            let areaB = b.length * (b[0].w * b[0].l);
            if (areaA !== areaB) return areaB - areaA;

            let isCylA = a[0].isCylinder ? 1 : 0;
            let isCylB = b[0].isCylinder ? 1 : 0;
            if (isCylA !== isCylB) return isCylA - isCylB;

            return (b[0].w * b[0].l) - (a[0].w * a[0].l);
        });

        let itemsToPack = [];
        groups.forEach(g => itemsToPack.push(...g));

        let finalLayout = pack2D(itemsToPack, targetBounds.w, targetBounds.l);

        if (finalLayout.length === 0) break;

        let minX = Math.min(...finalLayout.map(p => p.x));
        let maxX = Math.max(...finalLayout.map(p => p.x + p.w));
        let minZ = Math.min(...finalLayout.map(p => p.z));
        let maxZ = Math.max(...finalLayout.map(p => p.z + p.l));

        let layoutW = maxX - minX;
        let layoutL = maxZ - minZ;

        let cX = targetBounds.x + targetBounds.w / 2;
        let cZ = targetBounds.z + targetBounds.l / 2;

        let layerPlacedSomething = false;
        let nMinX = Infinity, nMaxX = -Infinity, nMinZ = Infinity, nMaxZ = -Infinity;

        for (let p of finalLayout) {
            let cx = cX + (p.x - minX) - layoutW / 2 + p.w / 2;
            let cz = cZ + (p.z - minZ) - layoutL / 2 + p.l / 2;

            let dropY = 0;
            placed.forEach(placedItem => {
                const ix = (cx - p.w / 2 < placedItem.x + placedItem.width / 2 - 0.1) && (cx + p.w / 2 > placedItem.x - placedItem.width / 2 + 0.1);
                const iz = (cz - p.l / 2 < placedItem.z + placedItem.length / 2 - 0.1) && (cz + p.l / 2 > placedItem.z - placedItem.length / 2 + 0.1);
                if (ix && iz) {
                    dropY = Math.max(dropY, placedItem.y + placedItem.height);
                }
            });

            if (dropY + p.h > effMaxHeight) continue;
            if (!checkSupport(p, cx, cz, dropY, placed)) continue;

            let idx = pool.findIndex(i => i.uniqueId === p.uniqueId);
            let actualItem = pool.splice(idx, 1)[0];

            placed.push({
                ...actualItem,
                x: cx,
                y: dropY,
                z: cz,
                width: p.w,
                length: p.l,
                height: p.h
            });

            layerPlacedSomething = true;
            nMinX = Math.min(nMinX, cx - p.w / 2);
            nMaxX = Math.max(nMaxX, cx + p.w / 2);
            nMinZ = Math.min(nMinZ, cz - p.l / 2);
            nMaxZ = Math.max(nMaxZ, cz + p.l / 2);
        }

        if (!layerPlacedSomething) break;

        targetBounds = {
            x: nMinX,
            z: nMinZ,
            w: nMaxX - nMinX,
            l: nMaxZ - nMinZ
        };
    }

    // ========================================================================
    // PHASE 2: MULTI-PASS GLOBAL GAP FILLING (WITH CYLINDER SNAPPING)
    // ========================================================================
    pool.sort((a, b) => {
        let areaA = a.w * a.l;
        let areaB = b.w * b.l;
        if (Math.abs(areaA - areaB) > 100) return areaB - areaA;

        let isCylA = a.isCylinder ? 1 : 0;
        let isCylB = b.isCylinder ? 1 : 0;
        if (isCylA !== isCylB) return isCylA - isCylB;

        return b.weight - a.weight;
    });

    const supportPasses = [
        { box: 0.60, cyl: 0.75 },
        { box: 0.50, cyl: 0.65 },
        { box: 0.40, cyl: 0.50 }
    ];

    for (let passIdx = 0; passIdx < supportPasses.length; passIdx++) {
        let currentReqs = supportPasses[passIdx];
        let progressPhase2 = true;

        while (progressPhase2 && pool.length > 0) {
            progressPhase2 = false;

            for (let i = 0; i < pool.length; i++) {
                let item = pool[i];

                let xCandidates = [-W/2];
                let zCandidates = [-L/2];

                placed.forEach(p => {
                    const pxLeft = p.x - p.width / 2;
                    const pxRight = p.x + p.width / 2;
                    const pzBack = p.z - p.length / 2;
                    const pzFront = p.z + p.length / 2;

                    xCandidates.push(pxLeft, pxRight, pxLeft - item.w, pxRight - item.w);
                    zCandidates.push(pzBack, pzFront, pzBack - item.l, pzFront - item.l);

                    if (item.isCylinder && p.isCylinder) {
                        const isSameSize = Math.abs(p.width - item.w) < 5 && Math.abs(p.length - item.l) < 5;
                        if (isSameSize) {
                            xCandidates.push(p.x - item.w / 2);
                            zCandidates.push(p.z - item.l / 2);
                        }
                    }
                });

                xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x * 10) / 10)))
                    .filter(x => x >= -W/2 - 0.01 && x + item.w <= W/2 + 0.01).sort((a,b) => a - b);
                zCandidates = Array.from(new Set(zCandidates.map(z => Math.round(z * 10) / 10)))
                    .filter(z => z >= -L/2 - 0.01 && z + item.l <= L/2 + 0.01).sort((a,b) => a - b);

                let bestPlacement = null;
                let bestScore = Infinity;

                for (let tz of zCandidates) {
                    for (let tx of xCandidates) {
                        for (let ori of [{ w: item.w, l: item.l }, { w: item.l, l: item.w }]) {
                            if (tx + ori.w > W/2 + 0.1 || tz + ori.l > L/2 + 0.1) continue;

                            const cx = tx + ori.w / 2;
                            const cz = tz + ori.l / 2;

                            let dropY = 0;
                            placed.forEach(p => {
                                const ix = (cx - ori.w/2 < p.x + p.width/2 - 0.1) && (cx + ori.w/2 > p.x - p.width/2 + 0.1);
                                const iz = (cz - ori.l/2 < p.z + p.length/2 - 0.1) && (cz + ori.l/2 > p.z - p.length/2 + 0.1);
                                if (ix && iz) {
                                    dropY = Math.max(dropY, p.y + p.height);
                                }
                            });

                            if (dropY + item.h > effMaxHeight) continue;

                            const reqSupport = item.isCylinder ? currentReqs.cyl : currentReqs.box;

                            if (checkSupport(ori, cx, cz, dropY, placed, reqSupport, true)) {
                                let intersects = false;
                                for (let p of placed) {
                                    const ix = (cx - ori.w/2 < p.x + p.width/2 - 0.1) && (cx + ori.w/2 > p.x - p.width/2 + 0.1);
                                    const iy = (dropY < p.y + p.height - 0.1) && (dropY + item.h > p.y + 0.1);
                                    const iz = (cz - ori.l/2 < p.z + p.length/2 - 0.1) && (cz + ori.l/2 > p.z - p.length/2 + 0.1);
                                    if (ix && iy && iz) {
                                        intersects = true;
                                        break;
                                    }
                                }

                                if (!intersects) {
                                    let score = (dropY * 10000) + tx + tz;

                                    if (item.isCylinder) {
                                        let perfectlyCentered = false;
                                        for (let p of placed) {
                                            if (p.isCylinder && Math.abs(p.y + p.height - dropY) < 1.0) {
                                                if (Math.abs(p.x - cx) <= 3.0 && Math.abs(p.z - cz) <= 3.0) {
                                                    perfectlyCentered = true;
                                                    break;
                                                }
                                            }
                                        }
                                        if (perfectlyCentered) {
                                            score -= 100000000;
                                        }
                                    }

                                    if (score < bestScore) {
                                        bestScore = score;
                                        bestPlacement = {
                                            ...item,
                                            x: cx,
                                            y: dropY,
                                            z: cz,
                                            width: ori.w,
                                            length: ori.l,
                                            height: item.h
                                        };
                                    }
                                }
                            }
                        }
                    }
                }

                if (bestPlacement) {
                    placed.push(bestPlacement);
                    pool.splice(i, 1);
                    progressPhase2 = true;
                    break;
                }
            }
        }
    }

    // ========================================================================
    // PHASE 4: SMART PEAK/PILLAR SHAVER
    // ========================================================================
    let yTiers = {};
    placed.forEach(p => {
        let yKey = Math.round(p.y / 20) * 20;
        if (!yTiers[yKey]) yTiers[yKey] = [];
        yTiers[yKey].push(p);
    });

    let yKeys = Object.keys(yTiers).map(Number).sort((a, b) => b - a);
    let isStripping = true;
    let palletArea = W * L;

    for (let y of yKeys) {
        if (y <= 150) {
            isStripping = false;
            continue;
        }

        let tierItems = yTiers[y];
        let tierArea = tierItems.reduce((sum, item) => sum + (item.width * item.length), 0);

        if (isStripping && (tierArea < palletArea * 0.20)) {
            // NEW: Exempt perfectly rim-locked cylinders from being stripped!
            let itemsToStrip = tierItems.filter(item => {
                if (!item.isCylinder) return true;
                let perfectlyCentered = placed.some(p => p.isCylinder && Math.abs(p.y + p.height - item.y) < 1.0 && Math.abs(p.x - item.x) <= 3.0 && Math.abs(p.z - item.z) <= 3.0);
                return !perfectlyCentered;
            });

            if (itemsToStrip.length === 0) {
                isStripping = false; // Tier is entirely stable rim-locked cylinders
            } else {
                itemsToStrip.forEach(item => {
                    let idx = placed.findIndex(p => p.uniqueId === item.uniqueId);
                    if (idx > -1) {
                        let stripped = placed.splice(idx, 1)[0];
                        pool.push({
                            ...stripped,
                            w: stripped.width,
                            l: stripped.length,
                            h: stripped.height
                        });
                    }
                });
            }
        } else {
            isStripping = false;
        }
    }

    const totalPackedVol = placed.reduce((s, i) => s + (i.width * i.length * i.height), 0);
    const efficiency = ((totalPackedVol / (W * L * effMaxHeight)) * 100).toFixed(1);
    const finalHeight = placed.reduce((max, p) => Math.max(max, p.y + p.height), 0);

    return {
        engineType: 'denseLayered',
        engineName: 'Unified Composite Tier Builder',
        placedItems: placed,
        unplacedCount: pool.length,
        efficiency,
        resultingHeight: finalHeight
    };
}