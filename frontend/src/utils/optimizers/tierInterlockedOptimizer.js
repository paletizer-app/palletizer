import { isSupported } from './supportUtils';

// ============================================================================
// ENGINE 2: TIER-BASED INTERLOCKED LAYER PACKER (Ti-Hi)
// Alternating Layer Rotation (0° <-> 90°) for Cross-Joint Binding
// ============================================================================
export function packTierInterlocked(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0, minSupportFraction = 0.75) {
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
            engineType: 'tierInterlocked',
            engineName: 'Tier-Based Interlocked Layer Packer',
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

    // PHASE 1: Ground Deck Pails First (Y=0)
    let progress = true;
    while (progress && pailsPool.length > 0) {
        progress = false;
        let xCandidates = [X_min];
        let zCandidates = [Z_min];

        placed.forEach(p => {
            xCandidates.push(p.x, p.x + p.w);
            zCandidates.push(p.z, p.z + p.l);
        });

        xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x * 10) / 10))).filter(x => x <= X_max - 0.1).sort((a, b) => a - b);
        zCandidates = Array.from(new Set(zCandidates.map(z => Math.round(z * 10) / 10))).filter(z => z <= Z_max - 0.1).sort((a, b) => a - b);

        for (let tz of zCandidates) {
            for (let tx of xCandidates) {
                for (let idx = 0; idx < pailsPool.length; idx++) {
                    const item = pailsPool[idx];
                    const candidate = {
                        x: tx, y: 0, z: tz,
                        w: item.w, l: item.l, h: item.h,
                        weight: item.weight, isBarrel: true, type: item.type
                    };

                    if (candidate.x + candidate.w > X_max + 0.1) continue;
                    if (candidate.z + candidate.l > Z_max + 0.1) continue;

                    if (intersects3D(candidate, placed)) continue;

                    placed.push({ ...item, ...candidate, tierIndex: 0 });
                    pailsPool.splice(idx, 1);
                    progress = true;
                    break;
                }
                if (progress) break;
            }
            if (progress) break;
        }
    }

    // PHASE 2: Ground Deck Boxes Second (Y=0, Standard Orientation)
    progress = true;
    while (progress && boxesPool.length > 0) {
        progress = false;
        let xCandidates = [X_min];
        let zCandidates = [Z_min];

        placed.forEach(p => {
            xCandidates.push(p.x, p.x + p.w);
            zCandidates.push(p.z, p.z + p.l);
        });

        xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x * 10) / 10))).filter(x => x <= X_max - 0.1).sort((a, b) => a - b);
        zCandidates = Array.from(new Set(zCandidates.map(z => Math.round(z * 10) / 10))).filter(z => z <= Z_max - 0.1).sort((a, b) => a - b);

        for (let tz of zCandidates) {
            for (let tx of xCandidates) {
                for (let idx = 0; idx < boxesPool.length; idx++) {
                    const item = boxesPool[idx];
                    const orientations = [{ w: item.w, l: item.l }, { w: item.l, l: item.w }];

                    let fitted = false;
                    for (let ori of orientations) {
                        const candidate = {
                            x: tx, y: 0, z: tz,
                            w: ori.w, l: ori.l, h: item.h,
                            weight: item.weight, isBarrel: false, type: item.type
                        };

                        if (candidate.x + candidate.w > X_max + 0.1) continue;
                        if (candidate.z + candidate.l > Z_max + 0.1) continue;

                        if (intersects3D(candidate, placed)) continue;

                        placed.push({ ...item, ...candidate, tierIndex: 0 });
                        boxesPool.splice(idx, 1);
                        fitted = true;
                        progress = true;
                        break;
                    }
                    if (fitted) break;
                }
                if (progress) break;
            }
            if (progress) break;
        }
    }

    // PHASE 3: Upper Stacking with Alternating Layer Rotation
    let remainingPool = [...pailsPool, ...boxesPool];
    remainingPool.sort((a, b) => (b.isBarrel === a.isBarrel ? 0 : a.isBarrel ? 1 : -1) || (b.weight - a.weight) || ((b.w * b.l) - (a.w * a.l)));

    let activeY = 0;
    let layerCounter = 1;

    while (remainingPool.length > 0 && activeY < maxHeight - 0.1) {
        const nextLevels = Array.from(new Set(placed.map(p => p.y + p.h)))
            .filter(y => y > activeY + 0.1 && y <= maxHeight - 0.1)
            .sort((a, b) => a - b);

        if (nextLevels.length === 0) break;
        activeY = nextLevels[0];

        let levelProgress = true;
        // Strictly invert rotation preference on alternating layers for cross-stack interlocking
        const rotateBoxes = (layerCounter % 2 === 1);

        while (levelProgress && remainingPool.length > 0) {
            levelProgress = false;

            let xCandidates = [X_min];
            let zCandidates = [Z_min];

            placed.forEach(p => {
                xCandidates.push(p.x, p.x + p.w);
                zCandidates.push(p.z, p.z + p.l);
            });

            xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x * 10) / 10))).filter(x => x <= X_max - 0.1).sort((a, b) => a - b);
            zCandidates = Array.from(new Set(zCandidates.map(z => Math.round(z * 10) / 10))).filter(z => z <= Z_max - 0.1).sort((a, b) => a - b);

            for (let tz of zCandidates) {
                for (let tx of xCandidates) {
                    for (let idx = 0; idx < remainingPool.length; idx++) {
                        const item = remainingPool[idx];
                        if (activeY + item.h > maxHeight + 0.1) continue;

                        const orientations = item.isBarrel
                            ? [{ w: item.w, l: item.l }]
                            : rotateBoxes
                                ? [{ w: item.l, l: item.w }, { w: item.w, l: item.l }]
                                : [{ w: item.w, l: item.l }, { w: item.l, l: item.w }];

                        let fitted = false;
                        for (let ori of orientations) {
                            const candidate = {
                                x: tx, y: activeY, z: tz,
                                w: ori.w, l: ori.l, h: item.h,
                                weight: item.weight, isBarrel: item.isBarrel, type: item.type
                            };

                            if (candidate.x + candidate.w > X_max + 0.1) continue;
                            if (candidate.z + candidate.l > Z_max + 0.1) continue;

                            if (intersects3D(candidate, placed)) continue;

                            if (!isSupported(candidate, placed, LOCKED_MIN_SUPPORT)) continue;

                            placed.push({ ...item, ...candidate, tierIndex: layerCounter });
                            remainingPool.splice(idx, 1);

                            fitted = true;
                            levelProgress = true;
                            break;
                        }
                        if (fitted) break;
                    }
                    if (levelProgress) break;
                }
                if (levelProgress) break;
            }
        }
        layerCounter++;
    }

    // CoG Auto-Centering
    if (placed.length > 0) {
        const minX = Math.min(...placed.map(p => p.x));
        const maxX = Math.max(...placed.map(p => p.x + p.w));
        const minZ = Math.min(...placed.map(p => p.z));
        const maxZ = Math.max(...placed.map(p => p.z + p.l));

        const shiftX = 0 - ((minX + maxX) / 2);
        const shiftZ = 0 - ((minZ + maxZ) / 2);

        placed = placed.map(p => ({
            ...p,
            x: p.x + shiftX,
            z: p.z + shiftZ
        }));
    }

    const mappedPlaced = placed.map(p => ({
        ...p,
        width: p.w,
        length: p.l,
        height: p.h,
        x: p.x + p.w / 2,
        z: p.z + p.l / 2
    }));

    const resultingHeight = placed.reduce((max, p) => Math.max(max, p.y + p.h), 0);
    const totalPackedVol = placed.reduce((s, i) => s + (i.w * i.l * i.h), 0);
    const efficiency = ((totalPackedVol / (W * L * maxHeight)) * 100).toFixed(1);
    const totalLayers = new Set(placed.map(p => p.y)).size;

    return {
        engineType: 'tierInterlocked',
        engineName: 'Tier-Based Interlocked Layer Packer (75% Support Locked)',
        placedItems: mappedPlaced,
        unplacedCount: remainingPool.length,
        efficiency,
        totalLayers,
        resultingHeight
    };
}