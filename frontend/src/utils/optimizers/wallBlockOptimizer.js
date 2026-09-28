import { isSupported } from './supportUtils';

// ============================================================================
// ENGINE 3: SEQUENTIAL ERGONOMIC WALL-BLOCK PACKER (SD-WBEP)
// True Z-Slice Sequential Packer with Dynamic Volume Height Capping
// ============================================================================
export function packSequentialWallBlock(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0, minSupportFraction = 0.75) {
    const W = palletSpec.width + overhangX * 2;
    const L = palletSpec.length + overhangY * 2;
    const X_min = -W / 2;
    const X_max = W / 2;
    const Z_min = -L / 2;
    const Z_max = L / 2;

    let pool = [];
    let totalVolume = 0;

    cargoList.forEach((cargo) => {
        const targetType = (cargo.type || '').toLowerCase();
        const isBarrel = cargo.isBarrel === true || ['barrel', 'container', 'pail', 'bucket', 'cylinder', 'drum'].includes(targetType);
        const itemDiameter = Number(cargo.diameter) || Number(cargo.width) || Number(cargo.length) || 200;
        const w = isBarrel ? itemDiameter : (Number(cargo.width) || 200);
        const l = isBarrel ? itemDiameter : (Number(cargo.length) || 300);
        const h = Number(cargo.height) || 150;
        const targetCargoId = cargo.cargoId || cargo.id;

        for (let i = 0; i < cargo.quantity; i++) {
            pool.push({
                ...cargo,
                cargoId: targetCargoId,
                id: `${cargo.id}-${i}`,
                w, l, h,
                weight: Number(cargo.weight) || 1.0,
                diameter: itemDiameter,
                isBarrel,
                type: cargo.type
            });
            totalVolume += (w * l * h);
        }
    });

    if (pool.length === 0) {
        return {
            engineType: 'wallBlock',
            engineName: 'Sequential Ergonomic Wall-Block Packer',
            placedItems: [], unplacedCount: 0, efficiency: '0.0', totalWalls: 0, resultingHeight: 0
        };
    }

    // Dynamic Height Cap: Prevents partial pallets from building 1800mm corner walls
    const deckArea = W * L;
    let dynamicHeightCap = Math.max(Math.max(...pool.map(i => i.h)), (totalVolume / deckArea) * 1.35); // 35% slack for packing gaps
    dynamicHeightCap = Math.min(maxHeight, dynamicHeightCap);

    // Heavy items & cylinders first to form stable base anchors for each wall
    pool.sort((a, b) => (b.isBarrel === a.isBarrel ? 0 : a.isBarrel ? 1 : -1) || (b.weight - a.weight) || ((b.w * b.l) - (a.w * a.l)));

    let placed = [];
    let currentZ = Z_min;
    let wallIndex = 0;

    const intersects3D = (a, list) => list.some(b =>
        a.x < b.x + b.w - 0.1 && a.x + a.w > b.x + 0.1 &&
        a.y < b.y + b.h - 0.1 && a.y + a.h > b.y + 0.1 &&
        a.z < b.z + b.l - 0.1 && a.z + a.l > b.z + 0.1
    );

    // Pass 1: Build walls sequentially back-to-front up to dynamicHeightCap
    while (pool.length > 0 && currentZ < Z_max - 5) {
        const remainingZ = Z_max - currentZ;
        const validDepths = Array.from(new Set(pool.map(i => i.l))).filter(d => d <= remainingZ + 0.1).sort((a, b) => b - a);

        if (validDepths.length === 0) break;
        const wallDepth = validDepths[0];

        let wallPlaced = [];
        let xCandidates = [X_min];
        let yCandidates = [0];

        let wallProgress = true;
        while (wallProgress && pool.length > 0) {
            wallProgress = false;

            xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x * 10) / 10))).filter(x => x <= X_max - 0.1).sort((a, b) => a - b);
            yCandidates = Array.from(new Set(yCandidates.map(y => Math.round(y * 10) / 10))).filter(y => y <= dynamicHeightCap - 0.1).sort((a, b) => a - b);

            for (let testY of yCandidates) {
                for (let testX of xCandidates) {
                    for (let idx = 0; idx < pool.length; idx++) {
                        const item = pool[idx];
                        if (testY + item.h > dynamicHeightCap + 0.1) continue;

                        const orientations = item.isBarrel ? [{ w: item.w, l: item.l }] : [{ w: item.w, l: item.l }, { w: item.l, l: item.w }];

                        let fitted = false;
                        for (let ori of orientations) {
                            if (ori.l > wallDepth + 0.1) continue;

                            const candidate = {
                                x: testX, y: testY, z: currentZ,
                                w: ori.w, l: ori.l, h: item.h,
                                weight: item.weight, isBarrel: item.isBarrel, type: item.type
                            };

                            if (candidate.x + candidate.w > X_max + 0.1) continue;
                            if (candidate.z + candidate.l > Z_max + 0.1) continue;

                            if (intersects3D(candidate, placed.concat(wallPlaced))) continue;
                            if (!isSupported(candidate, placed.concat(wallPlaced), minSupportFraction)) continue;

                            wallPlaced.push({ ...item, ...candidate, wallIndex });
                            pool.splice(idx, 1);

                            xCandidates.push(candidate.x + candidate.w);
                            yCandidates.push(candidate.y + candidate.h);

                            fitted = true;
                            wallProgress = true;
                            break;
                        }
                        if (fitted) break;
                    }
                    if (wallProgress) break;
                }
                if (wallProgress) break;
            }
        }

        if (wallPlaced.length === 0) {
            currentZ += 20;
            continue;
        }

        placed.push(...wallPlaced);
        const maxSliceZ = Math.max(...wallPlaced.map(p => p.z + p.l));
        currentZ = maxSliceZ;
        wallIndex++;
    }

    // Pass 2: Overflow (If volume estimation was tight, place remaining items on top of established walls)
    if (pool.length > 0) {
        let overflowProgress = true;
        while (overflowProgress && pool.length > 0) {
            overflowProgress = false;

            let xCandidates = [X_min];
            let zCandidates = [Z_min];
            let yCandidates = [0];

            placed.forEach(p => {
                xCandidates.push(p.x, p.x + p.w);
                yCandidates.push(p.y + p.h);
                zCandidates.push(p.z, p.z + p.l);
            });

            xCandidates = Array.from(new Set(xCandidates.map(x => Math.round(x * 10) / 10))).filter(x => x <= X_max - 0.1).sort((a, b) => a - b);
            yCandidates = Array.from(new Set(yCandidates.map(y => Math.round(y * 10) / 10))).filter(y => y <= maxHeight - 0.1).sort((a, b) => a - b);
            zCandidates = Array.from(new Set(zCandidates.map(z => Math.round(z * 10) / 10))).filter(z => z <= Z_max - 0.1).sort((a, b) => a - b);

            for (let testY of yCandidates) {
                for (let testZ of zCandidates) {
                    for (let testX of xCandidates) {
                        for (let idx = 0; idx < pool.length; idx++) {
                            const item = pool[idx];
                            if (testY + item.h > maxHeight + 0.1) continue;

                            const orientations = item.isBarrel ? [{ w: item.w, l: item.l }] : [{ w: item.w, l: item.l }, { w: item.l, l: item.w }];
                            let fitted = false;

                            for (let ori of orientations) {
                                const candidate = {
                                    x: testX, y: testY, z: testZ,
                                    w: ori.w, l: ori.l, h: item.h,
                                    weight: item.weight, isBarrel: item.isBarrel, type: item.type
                                };

                                if (candidate.x + candidate.w > X_max + 0.1) continue;
                                if (candidate.z + candidate.l > Z_max + 0.1) continue;

                                if (intersects3D(candidate, placed)) continue;
                                if (!isSupported(candidate, placed, minSupportFraction)) continue;

                                placed.push({ ...item, ...candidate, wallIndex: wallIndex++ });
                                pool.splice(idx, 1);

                                fitted = true;
                                overflowProgress = true;
                                break;
                            }
                            if (fitted) break;
                        }
                        if (overflowProgress) break;
                    }
                    if (overflowProgress) break;
                }
                if (overflowProgress) break;
            }
        }
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

    return {
        engineType: 'wallBlock',
        engineName: 'Sequential Ergonomic Wall-Block Packer (Manual Hand-Loading)',
        placedItems: mappedPlaced,
        unplacedCount: pool.length,
        efficiency,
        totalWalls: new Set(placed.map(p => p.z)).size,
        resultingHeight
    };
}