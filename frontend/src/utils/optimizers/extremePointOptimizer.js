import { isSupported } from './supportUtils';

// ============================================================================
// ENGINE 1: 3D EXTREME POINT SPATIAL PACKER
// ============================================================================
export function pack3DExtremePoint(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0, minSupportFraction = 0.75) {
    const W = palletSpec.width + overhangX * 2;
    const L = palletSpec.length + overhangY * 2;
    const X_min = -W / 2;
    const X_max = W / 2;
    const Z_min = -L / 2;
    const Z_max = L / 2;

    let flatItems = [];
    cargoList.forEach((cargo) => {
        const isBarrel = cargo.type === 'barrel' || cargo.type === 'container';
        const itemDiameter = Number(cargo.diameter) || Number(cargo.width) || Number(cargo.length) || 200;
        const w = isBarrel ? itemDiameter : (Number(cargo.width) || 200);
        const l = isBarrel ? itemDiameter : (Number(cargo.length) || 300);
        const targetCargoId = cargo.cargoId || cargo.id;

        for (let i = 0; i < cargo.quantity; i++) {
            flatItems.push({
                ...cargo,
                cargoId: targetCargoId,
                id: `${cargo.id}-${i}`,
                w, l, h: Number(cargo.height) || 150,
                weight: Number(cargo.weight) || 1.0,
                diameter: itemDiameter,
                isBarrel,
                type: cargo.type
            });
        }
    });

    flatItems.sort((a, b) => ((Number(b.weight) || 0) - (Number(a.weight) || 0)) || ((b.w * b.l * b.h) - (a.w * a.l * a.h)));

    let placed = [];
    let extremePoints = [{ x: X_min, y: 0, z: Z_min }];

    const intersects = (a, b) =>
        a.x < b.x + b.w && a.x + a.w > b.x &&
        a.y < b.y + b.h && a.y + a.h > b.y &&
        a.z < b.z + b.l && a.z + a.l > b.z;

    for (let item of flatItems) {
        let bestPlacement = null;
        let bestScore = Infinity;
        const orientations = item.isBarrel ? [{ w: item.w, l: item.l }] : [{ w: item.w, l: item.l }, { w: item.l, l: item.w }];

        let candidates = [];
        for (let ep of extremePoints) {
            for (let ori of orientations) {
                candidates.push({ x: ep.x, y: ep.y, z: ep.z, w: ori.w, l: ori.l, h: item.h });
            }
        }
        for (let ori of orientations) {
            candidates.push(
                { x: X_min, y: 0, z: Z_min, w: ori.w, l: ori.l, h: item.h },
                { x: X_max - ori.w, y: 0, z: Z_min, w: ori.w, l: ori.l, h: item.h },
                { x: X_min, y: 0, z: Z_max - ori.l, w: ori.w, l: ori.l, h: item.h },
                { x: X_max - ori.w, y: 0, z: Z_max - ori.l, w: ori.w, l: ori.l, h: item.h }
            );
        }

        for (let candidate of candidates) {
            if (candidate.x < X_min || candidate.x + candidate.w > X_max ||
                candidate.z < Z_min || candidate.z + candidate.l > Z_max ||
                candidate.y + candidate.h > maxHeight) continue;

            let collision = false;
            for (let p of placed) if (intersects(candidate, p)) { collision = true; break; }
            if (collision) continue;

            if (!isSupported(candidate, placed, minSupportFraction)) continue;

            const score = (candidate.y * 1000000) + (candidate.z * 1000) + candidate.x;
            if (score < bestScore) {
                bestScore = score;
                bestPlacement = { ...item, ...candidate };
            }
        }

        if (bestPlacement) {
            placed.push(bestPlacement);

            extremePoints.push(
                { x: bestPlacement.x + bestPlacement.w, y: bestPlacement.y, z: bestPlacement.z },
                { x: bestPlacement.x, y: bestPlacement.y, z: bestPlacement.z + bestPlacement.l },
                { x: bestPlacement.x, y: bestPlacement.y + bestPlacement.h, z: bestPlacement.z }
            );

            extremePoints = extremePoints.filter((p, index, self) =>
                p.x <= X_max && p.z <= Z_max && p.y <= maxHeight &&
                self.findIndex(t => Math.abs(t.x - p.x) < 0.1 && Math.abs(t.y - p.y) < 0.1 && Math.abs(t.z - p.z) < 0.1) === index
            ).sort((a, b) => (a.y - b.y) || (a.z - b.z) || (a.x - b.x));
        }
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
        engineType: '3dExtremePoint',
        engineName: '3D Extreme Point Spatial Packer',
        placedItems: mappedPlaced,
        unplacedCount: flatItems.length - placed.length,
        efficiency,
        resultingHeight
    };
}

// Alias export to maintain backward compatibility with palletOptimizers.js
export { pack3DExtremePoint as packExtremePoint };