// ============================================================================
// ENGINE 6: 3D FREE PLACEMENT (Beam Search & Static Stability)
// Architecture: Placement -> Support -> Stability -> Sequence Optimization
// Fixes Applied:
// 1. Added explicit Center-Coordinate Mapping for Three.js rendering.
// 2. Added Global Centering Offset so the final stack sits perfectly in the middle.
// 3. Refined Beam Search heuristic to factor density alongside volume.
// ============================================================================

export function packFreePlacement(cargoList, palletSpec = {}, maxHeight = 1800) {
    const W = Number(palletSpec.width || palletSpec.w || 1200);
    const L = Number(palletSpec.length || palletSpec.l || 800);
    let effMaxHeight = Number(maxHeight || palletSpec.maxHeight || 1800);

    // 1. Initialize & Sort Pool
    let initialPool = [];
    (cargoList || []).forEach((cargo) => {
        const origId = String(cargo.id || cargo.cargoId || cargo._id || 'cargo');
        const cId = String(cargo.cargoId || cargo.id || cargo._id || 'cargo');
        const w = Number(cargo.width || cargo.w || cargo.dimX) || 200;
        const l = Number(cargo.length || cargo.l || cargo.dimY) || 300;
        const h = Number(cargo.height || cargo.h || cargo.dimZ) || 150;
        const weight = Number(cargo.weight || cargo.wt || cargo.mass) || 1.0;
        const qty = Number(cargo.quantity || cargo.qty) || 1;

        const isCylinder = Boolean(cargo.isCylinder || cId.toLowerCase().includes('cyan') || cId.toLowerCase().includes('cyl'));

        for (let i = 0; i < qty; i++) {
            initialPool.push({
                ...cargo,
                id: origId,
                cargoId: cId,
                uniqueId: `${cId}-${i}`,
                w, l, h, weight,
                isCylinder,
                area: w * l
            });
        }
    });

    // Initial Heuristic Sort: Rigid items first, then heaviest, then largest base area
    initialPool.sort((a, b) => {
        if (a.isCylinder !== b.isCylinder) return a.isCylinder ? -1 : 1;
        if (b.weight !== a.weight) return b.weight - a.weight;
        return b.area - a.area;
    });

    if (initialPool.length === 0) {
        return {
            engineType: 'freePlacement',
            engineName: '3D Free Placement (Beam Search)',
            placedItems: [],
            unplacedCount: 0,
            efficiency: '0.0',
            resultingHeight: 0
        };
    }

    // --- PHYSICS & GEOMETRY ENGINES ---
    // Engine operates strictly in 0..W and 0..L corner-based coordinates.

    const getDropY = (placedItems, cx, cz, cw, cl) => {
        let dropY = 0;
        for (const p of placedItems) {
            const intersectX = (cx < p.x + p.width - 0.01) && (cx + cw > p.x + 0.01);
            const intersectZ = (cz < p.z + p.length - 0.01) && (cz + cl > p.z + 0.01);
            if (intersectX && intersectZ) {
                dropY = Math.max(dropY, p.y + p.height);
            }
        }
        return dropY;
    };

    const evaluateStaticStability = (placedItems, candX, candY, candZ, candW, candL) => {
        if (candY === 0) return true; // 100% stable on the wooden pallet deck

        let totalSupportArea = 0;
        let contactMinX = Infinity, contactMaxX = -Infinity;
        let contactMinZ = Infinity, contactMaxZ = -Infinity;

        for (const p of placedItems) {
            if (Math.abs((p.y + p.height) - candY) < 0.05) {
                const ix_min = Math.max(candX, p.x);
                const ix_max = Math.min(candX + candW, p.x + p.width);
                const iz_min = Math.max(candZ, p.z);
                const iz_max = Math.min(candZ + candL, p.z + p.length);

                if (ix_min < ix_max && iz_min < iz_max) {
                    const intersectArea = (ix_max - ix_min) * (iz_max - iz_min);
                    totalSupportArea += intersectArea;

                    contactMinX = Math.min(contactMinX, ix_min);
                    contactMaxX = Math.max(contactMaxX, ix_max);
                    contactMinZ = Math.min(contactMinZ, iz_min);
                    contactMaxZ = Math.max(contactMaxZ, iz_max);
                }
            }
        }

        // Hard Filter 1: Minimum 75% Physical Support Area
        const itemBaseArea = candW * candL;
        if (totalSupportArea < 0.75 * itemBaseArea) return false;

        // Hard Filter 2: Mechanical Equilibrium (Center of Gravity inside Support Bounds)
        const cgX = candX + (candW / 2);
        const cgZ = candZ + (candL / 2);

        if (cgX < contactMinX || cgX > contactMaxX || cgZ < contactMinZ || cgZ > contactMaxZ) {
            return false;
        }

        return true;
    };

    // --- BEAM SEARCH OPTIMIZER ---

    const BEAM_WIDTH = 3;
    const ITEMS_TO_EVALUATE = 4; // Check the top 4 heaviest/largest remaining items dynamically
    const BRANCHES_PER_ITEM = 2; // Keep top 2 placement coordinates per item evaluated

    let beam = [{ placed: [], pool: initialPool, score: 0 }];
    let searchActive = true;
    let maxIterations = 500;
    let currentIter = 0;

    while (searchActive && currentIter++ < maxIterations) {
        searchActive = false;
        let nextBeam = [];

        for (let state of beam) {
            if (state.pool.length === 0) {
                nextBeam.push(state);
                continue;
            }

            let stateBranched = false;
            const itemsToTry = state.pool.slice(0, ITEMS_TO_EVALUATE);

            for (let item of itemsToTry) {
                let xCandidates = [0];
                let zCandidates = [0];

                // Generate Extreme Points from existing placed geometry
                state.placed.forEach(p => {
                    xCandidates.push(p.x + p.width);
                    zCandidates.push(p.z + p.length);
                    if (p.x - item.w >= 0) xCandidates.push(p.x - item.w);
                    if (p.z - item.l >= 0) zCandidates.push(p.z - item.l);
                    if (!item.isCylinder) {
                        if (p.x - item.l >= 0) xCandidates.push(p.x - item.l);
                        if (p.z - item.w >= 0) zCandidates.push(p.z - item.w);
                    }
                });

                xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x*10)/10))).filter(x => x >= 0);
                zCandidates = Array.from(new Set(zCandidates.map(z => Math.round(z*10)/10))).filter(z => z >= 0);

                let validPlacements = [];

                for (let x of xCandidates) {
                    for (let z of zCandidates) {
                        const orientations = item.isCylinder ?
                            [{ w: item.w, l: item.l, rot: 0 }] :
                            [{ w: item.w, l: item.l, rot: 0 }, { w: item.l, l: item.w, rot: 90 }];

                        for (let ori of orientations) {
                            if (x + ori.w > W + 0.1 || z + ori.l > L + 0.1) continue;

                            const dropY = getDropY(state.placed, x, z, ori.w, ori.l);
                            if (dropY + item.h > effMaxHeight) continue;

                            if (evaluateStaticStability(state.placed, x, dropY, z, ori.w, ori.l)) {
                                // Prefer lowest drop Y, then pack towards Origin (BLB heuristic)
                                const heuristic = (dropY * 1000) + (z * 10) + x;
                                validPlacements.push({ x, y: dropY, z, w: ori.w, l: ori.l, rot: ori.rot, heuristic });
                            }
                        }
                    }
                }

                if (validPlacements.length > 0) {
                    validPlacements.sort((a, b) => a.heuristic - b.heuristic);
                    const topPlacements = validPlacements.slice(0, BRANCHES_PER_ITEM);

                    for (let vp of topPlacements) {
                        const newItem = {
                            ...item,
                            x: vp.x,
                            y: vp.y,
                            z: vp.z,
                            width: vp.w,
                            length: vp.l,
                            height: item.h,
                            rotation: vp.rot
                        };

                        const newPlaced = [...state.placed, newItem];
                        const newPool = state.pool.filter(p => p.uniqueId !== item.uniqueId);

                        const vol = newPlaced.reduce((s, p) => s + (p.width * p.length * p.height), 0);
                        const maxY = newPlaced.reduce((max, p) => Math.max(max, p.y + p.height), 0);

                        // Main Objective Score: Dense Volume
                        const density = vol / (W * L * Math.max(1, maxY));
                        const score = (vol * 10) + (density * 1000);

                        nextBeam.push({ placed: newPlaced, pool: newPool, score: score });
                        stateBranched = true;
                        searchActive = true;
                    }
                }
            }

            if (!stateBranched) {
                nextBeam.push(state);
            }
        }

        nextBeam.sort((a, b) => b.score - a.score);

        let uniqueBeam = [];
        let seenSignatures = new Set();

        for (let state of nextBeam) {
            const sig = `${state.placed.length}-${Math.round(state.score)}`;
            if (!seenSignatures.has(sig)) {
                seenSignatures.add(sig);
                uniqueBeam.push(state);
                if (uniqueBeam.length >= BEAM_WIDTH) break;
            }
        }

        beam = uniqueBeam.length > 0 ? uniqueBeam : nextBeam.slice(0, BEAM_WIDTH);
    }

    // --- FINALIZE & MAP COORDINATES FOR THREE.JS ---
    const bestState = beam[0];

    let mappedPlacedItems = [];
    if (bestState.placed.length > 0) {
        // Calculate the bounding box of the packed structure in the engine space
        const minX = Math.min(...bestState.placed.map(p => p.x));
        const maxX = Math.max(...bestState.placed.map(p => p.x + p.width));
        const minZ = Math.min(...bestState.placed.map(p => p.z));
        const maxZ = Math.max(...bestState.placed.map(p => p.z + p.length));

        // Center the structure perfectly on the pallet
        const offsetX = (W - (maxX - minX)) / 2 - minX;
        const offsetZ = (L - (maxZ - minZ)) / 2 - minZ;

        mappedPlacedItems = bestState.placed.map(p => {
            // 1. Shift by alignment offset
            // 2. Add half width/length to convert corner to center
            const engineCenterX = (p.x + offsetX) + (p.width / 2);
            const engineCenterZ = (p.z + offsetZ) + (p.length / 2);

            return {
                ...p,
                palletIndex: 1,
                y: p.y, // App.jsx PackedItem3D natively adds palletHeight to bottom Y
                x: engineCenterX - (W / 2), // Map to Three.js centered origin (-W/2 to +W/2)
                z: engineCenterZ - (L / 2)
            };
        });
    }

    const totalPackedVol = mappedPlacedItems.reduce((s, i) => s + (i.width * i.length * i.height), 0);
    const efficiency = ((totalPackedVol / (W * L * effMaxHeight)) * 100).toFixed(1);
    const resultingHeight = mappedPlacedItems.reduce((max, p) => Math.max(max, p.y + p.height), 0);

    return {
        engineType: 'freePlacement',
        engineName: '3D Free Placement (Beam Search)',
        placedItems: mappedPlacedItems,
        unplacedCount: bestState.pool.length,
        efficiency,
        resultingHeight
    };
}