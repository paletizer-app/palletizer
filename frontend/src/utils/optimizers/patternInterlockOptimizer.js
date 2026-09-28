import { isSupported } from './supportUtils';

// ============================================================================
// ENGINE 4: PATTERN-BASED INTERLOCKING BRICKWORK PACKER (Cape Pack / Cube-IQ)
// Unified Absolute Center-Gravity Packing
// ============================================================================
export function packPatternInterlocked(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0, minSupportFraction = 0.75) {
    const LOCKED_MIN_SUPPORT = 0.75;

    const W = palletSpec.width + overhangX * 2;
    const L = palletSpec.length + overhangY * 2;
    const X_min = -W / 2;
    const X_max = W / 2;
    const Z_min = -L / 2;
    const Z_max = L / 2;

    let pailsPool = [];
    let boxesPool = [];

    cargoList.forEach((cargo) => {
        const isBarrel = cargo.type === 'barrel' || cargo.type === 'container';
        const itemDiameter = Number(cargo.diameter) || Number(cargo.width) || Number(cargo.length) || 200;
        const w = isBarrel ? itemDiameter : (Number(cargo.width) || 200);
        const l = isBarrel ? itemDiameter : (Number(cargo.length) || 300);
        const targetCargoId = cargo.cargoId || cargo.id;

        for (let i = 0; i < cargo.quantity; i++) {
            const itemObj = {
                ...cargo,
                cargoId: targetCargoId,
                id: `${cargo.id}-${i}`,
                w, l, h: Number(cargo.height) || 150,
                weight: Number(cargo.weight) || 1.0,
                diameter: itemDiameter,
                isBarrel,
                type: cargo.type
            };
            if (isBarrel) pailsPool.push(itemObj);
            else boxesPool.push(itemObj);
        }
    });

    if (pailsPool.length === 0 && boxesPool.length === 0) {
        return {
            engineType: 'patternInterlocked',
            engineName: 'Pattern-Based Interlocking Brickwork Packer',
            placedItems: [], unplacedCount: 0, efficiency: '0.0', totalLayers: 0, resultingHeight: 0
        };
    }

    pailsPool.sort((a, b) => (b.w * b.l) - (a.w * a.l) || (b.weight - a.weight));
    boxesPool.sort((a, b) => (b.weight - a.weight) || (b.w * b.l) - (a.w * a.l));

    let placed = [];

    const intersects3D = (a, list) => list.some(b =>
        a.x < b.x + b.w - 0.1 && a.x + a.w > b.x + 0.1 &&
        a.y < b.y + b.h - 0.1 && a.y + a.h > b.y + 0.1 &&
        a.z < b.z + b.l - 0.1 && a.z + a.l > b.z + 0.1
    );

    // PHASE 1: Ground Deck Pails First (Center-Gravity)
    let progress = true;
    while (progress && pailsPool.length > 0) {
        progress = false;
        let bestPlacement = null;
        let bestDist = Infinity;
        let bestIdx = -1;

        let xCandidates = [X_min, 0];
        let zCandidates = [Z_min, 0];

        placed.forEach(p => {
            xCandidates.push(p.x, p.x + p.w);
            zCandidates.push(p.z, p.z + p.l);
        });

        xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x * 10) / 10))).filter(x => x >= X_min - 0.1 && x <= X_max - 0.1);
        zCandidates = Array.from(new Set(zCandidates.map(z => Math.round(z * 10) / 10))).filter(z => z >= Z_min - 0.1 && z <= Z_max - 0.1);

        for (let tz of zCandidates) {
            for (let tx of xCandidates) {
                for (let idx = 0; idx < pailsPool.length; idx++) {
                    const item = pailsPool[idx];
                    const candidate = {
                        x: tx, y: 0, z: tz,
                        w: item.w, l: item.l, h: item.h,
                        weight: item.weight, isBarrel: true, type: item.type
                    };

                    if (candidate.x + candidate.w > X_max + 0.1 || candidate.z + candidate.l > Z_max + 0.1) continue;
                    if (intersects3D(candidate, placed)) continue;

                    const cx = candidate.x + candidate.w / 2;
                    const cz = candidate.z + candidate.l / 2;
                    const dist = (cx * cx) + (cz * cz);

                    if (dist < bestDist) {
                        bestDist = dist;
                        bestPlacement = candidate;
                        bestIdx = idx;
                    }
                }
            }
        }

        if (bestPlacement) {
            placed.push({ ...pailsPool[bestIdx], ...bestPlacement });
            pailsPool.splice(bestIdx, 1);
            progress = true;
        }
    }

    // PHASE 2: Ground Deck Boxes Second (Center-Gravity)
    progress = true;
    while (progress && boxesPool.length > 0) {
        progress = false;
        let bestPlacement = null;
        let bestDist = Infinity;
        let bestIdx = -1;

        let xCandidates = [X_min, 0];
        let zCandidates = [Z_min, 0];

        placed.forEach(p => {
            xCandidates.push(p.x, p.x + p.w);
            zCandidates.push(p.z, p.z + p.l);
        });

        xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x * 10) / 10))).filter(x => x >= X_min - 0.1 && x <= X_max - 0.1);
        zCandidates = Array.from(new Set(zCandidates.map(z => Math.round(z * 10) / 10))).filter(z => z >= Z_min - 0.1 && z <= Z_max - 0.1);

        for (let tz of zCandidates) {
            for (let tx of xCandidates) {
                for (let idx = 0; idx < boxesPool.length; idx++) {
                    const item = boxesPool[idx];
                    const orientations = [{ w: item.w, l: item.l }, { w: item.l, l: item.w }];

                    for (let ori of orientations) {
                        const candidate = {
                            x: tx, y: 0, z: tz,
                            w: ori.w, l: ori.l, h: item.h,
                            weight: item.weight, isBarrel: false, type: item.type
                        };

                        if (candidate.x + candidate.w > X_max + 0.1 || candidate.z + candidate.l > Z_max + 0.1) continue;
                        if (intersects3D(candidate, placed)) continue;

                        const cx = candidate.x + candidate.w / 2;
                        const cz = candidate.z + candidate.l / 2;
                        const dist = (cx * cx) + (cz * cz);

                        if (dist < bestDist) {
                            bestDist = dist;
                            bestPlacement = candidate;
                            bestIdx = idx;
                        }
                    }
                }
            }
        }

        if (bestPlacement) {
            placed.push({ ...boxesPool[bestIdx], ...bestPlacement });
            boxesPool.splice(bestIdx, 1);
            progress = true;
        }
    }

    // PHASE 3: Upper Level Centered Brickwork Stacking
    let remainingPool = [...pailsPool, ...boxesPool];
    remainingPool.sort((a, b) => (b.isBarrel === a.isBarrel ? 0 : a.isBarrel ? 1 : -1) || (b.weight - a.weight) || ((b.w * b.l) - (a.w * a.l)));

    let activeY = 0;
    while (remainingPool.length > 0 && activeY < maxHeight - 0.1) {
        const nextLevels = Array.from(new Set(placed.map(p => p.y + p.h)))
            .filter(y => y > activeY + 0.1 && y <= maxHeight - 0.1)
            .sort((a, b) => a - b);

        if (nextLevels.length === 0) break;
        activeY = nextLevels[0];

        let levelProgress = true;
        const rotateLayer = (Math.round(activeY / 100) % 2 === 1);

        while (levelProgress && remainingPool.length > 0) {
            levelProgress = false;

            for (let idx = 0; idx < remainingPool.length; idx++) {
                const item = remainingPool[idx];
                if (activeY + item.h > maxHeight + 0.1) continue;

                let xCandidates = [X_min, 0];
                let zCandidates = [Z_min, 0];

                // FIX: Generate perfect center-snapping points for both unrotated and rotated orientations
                placed.forEach(p => {
                    xCandidates.push(p.x, p.x + p.w);
                    zCandidates.push(p.z, p.z + p.l);
                    const pCX = p.x + p.w / 2;
                    const pCZ = p.z + p.l / 2;
                    xCandidates.push(pCX - item.w / 2, pCX - item.l / 2);
                    zCandidates.push(pCZ - item.l / 2, pCZ - item.w / 2);
                });

                xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x * 10) / 10))).filter(x => x >= X_min - 0.1 && x <= X_max - 0.1);
                zCandidates = Array.from(new Set(zCandidates.map(z => Math.round(z * 10) / 10))).filter(z => z >= Z_min - 0.1 && z <= Z_max - 0.1);

                const orientations = item.isBarrel
                    ? [{ w: item.w, l: item.l }]
                    : rotateLayer
                        ? [{ w: item.l, l: item.w }, { w: item.w, l: item.l }]
                        : [{ w: item.w, l: item.l }, { w: item.l, l: item.w }];

                let bestPlacement = null;
                let bestDist = Infinity;

                for (let tz of zCandidates) {
                    for (let tx of xCandidates) {
                        for (let ori of orientations) {
                            const candidate = {
                                x: tx, y: activeY, z: tz,
                                w: ori.w, l: ori.l, h: item.h,
                                weight: item.weight, isBarrel: item.isBarrel, type: item.type
                            };

                            if (candidate.x + candidate.w > X_max + 0.1 || candidate.z + candidate.l > Z_max + 0.1) continue;
                            if (candidate.x < X_min - 0.1 || candidate.z < Z_min - 0.1) continue;
                            if (intersects3D(candidate, placed)) continue;
                            if (!isSupported(candidate, placed, LOCKED_MIN_SUPPORT)) continue;

                            const candCenterX = candidate.x + candidate.w / 2;
                            const candCenterZ = candidate.z + candidate.l / 2;
                            const dist = (candCenterX * candCenterX) + (candCenterZ * candCenterZ);

                            if (dist < bestDist) {
                                bestDist = dist;
                                bestPlacement = candidate;
                            }
                        }
                    }
                }

                if (bestPlacement) {
                    placed.push({ ...item, ...bestPlacement });
                    remainingPool.splice(idx, 1);
                    levelProgress = true;
                    break;
                }
            }
        }
    }

    // Final Bounding Box Auto-Centering (Ensures weight distribution)
    if (placed.length > 0) {
        const minX = Math.min(...placed.map(p => p.x));
        const maxX = Math.max(...placed.map(p => p.x + p.w));
        const minZ = Math.min(...placed.map(p => p.z));
        const maxZ = Math.max(...placed.map(p => p.z + p.l));

        const shiftX = 0 - ((minX + maxX) / 2);
        const shiftZ = 0 - ((minZ + maxZ) / 2);

        placed = placed.map(p => ({ ...p, x: p.x + shiftX, z: p.z + shiftZ }));
    }

    const mappedPlaced = placed.map(p => ({
        ...p,
        width: p.w, // Overrides Three.js renderer bounding box
        length: p.l, // Overrides Three.js renderer bounding box
        height: p.h,
        x: p.x + p.w / 2,
        z: p.z + p.l / 2
    }));

    const resultingHeight = placed.reduce((max, p) => Math.max(max, p.y + p.h), 0);
    const totalPackedVol = placed.reduce((s, i) => s + (i.w * i.l * i.h), 0);
    const efficiency = ((totalPackedVol / (W * L * maxHeight)) * 100).toFixed(1);
    const totalLayers = new Set(placed.map(p => p.y)).size;

    return {
        engineType: 'patternInterlocked',
        engineName: 'Pattern-Based Interlocking Brickwork Packer',
        placedItems: mappedPlaced,
        unplacedCount: remainingPool.length,
        efficiency,
        totalLayers,
        resultingHeight
    };
}