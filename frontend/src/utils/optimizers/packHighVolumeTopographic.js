export function packHighVolumeTopographic(cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0) {
    let placedItems = [];
    const effectiveW = palletSpec.width + (overhangX * 2);
    const effectiveL = palletSpec.length + (overhangY * 2);

    const minX = -(effectiveW / 2);
    const minZ = -(effectiveL / 2);

    // 1. Flatten and sort inventory
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

    // 2. Initialize 10mm Resolution Topographic Grid
    const RESOLUTION = 10;
    const gridW = Math.ceil(effectiveW / RESOLUTION);
    const gridL = Math.ceil(effectiveL / RESOLUTION);
    const heightMap = new Int32Array(gridW * gridL);

    const getIdx = (x, z) => z * gridW + x;

    function getLowestDepression() {
        let minY = Infinity;
        let sx = -1, sz = -1;

        for (let z = 0; z < gridL; z++) {
            for (let x = 0; x < gridW; x++) {
                const y = heightMap[getIdx(x, z)];
                if (y < minY) {
                    minY = y; sx = x; sz = z;
                }
            }
        }
        if (minY >= maxHeight) return null;

        let w = 1;
        while (sx + w < gridW && heightMap[getIdx(sx + w, sz)] === minY) w++;

        let l = 1;
        let expandZ = true;
        while (sz + l < gridL && expandZ) {
            for (let x = sx; x < sx + w; x++) {
                if (heightMap[getIdx(x, sz + l)] !== minY) { expandZ = false; break; }
            }
            if (expandZ) l++;
        }
        return { gx: sx, gz: sz, gw: w, gl: l, y: minY };
    }

    function paveGap(space) {
        let nextLowestY = maxHeight;
        for (let x = space.gx; x < space.gx + space.gw; x++) {
            if (space.gz > 0) {
                const y = heightMap[getIdx(x, space.gz - 1)];
                if (y > space.y && y < nextLowestY) nextLowestY = y;
            }
            if (space.gz + space.gl < gridL) {
                const y = heightMap[getIdx(x, space.gz + space.gl)];
                if (y > space.y && y < nextLowestY) nextLowestY = y;
            }
        }
        for (let z = space.gz; z < space.gz + space.gl; z++) {
            if (space.gx > 0) {
                const y = heightMap[getIdx(space.gx - 1, z)];
                if (y > space.y && y < nextLowestY) nextLowestY = y;
            }
            if (space.gx + space.gw < gridW) {
                const y = heightMap[getIdx(space.gx + space.gw, z)];
                if (y > space.y && y < nextLowestY) nextLowestY = y;
            }
        }
        for (let z = space.gz; z < space.gz + space.gl; z++) {
            for (let x = space.gx; x < space.gx + space.gw; x++) {
                heightMap[getIdx(x, z)] = nextLowestY;
            }
        }
    }

    // --- PHASE 1: TOPOGRAPHIC PACKING (With Artificial Paving) ---
    while (itemsToPack.length > 0) {
        const space = getLowestDepression();
        if (!space) break;

        const spaceW = space.gw * RESOLUTION;
        const spaceL = space.gl * RESOLUTION;
        let itemPlaced = false;

        for (let i = 0; i < itemsToPack.length; i++) {
            const item = itemsToPack[i];
            if (space.y + item.height > maxHeight) continue;

            const orientations = item.type === 'barrel'
                ? [{ w: item.width, l: item.length, rot: false }]
                : [{ w: item.width, l: item.length, rot: false }, { w: item.length, l: item.width, rot: true }];

            for (const ori of orientations) {
                if (ori.w <= spaceW && ori.l <= spaceL) {
                    const placedItem = itemsToPack.splice(i, 1)[0];
                    placedItems.push({
                        ...placedItem,
                        x: minX + (space.gx * RESOLUTION) + (ori.w / 2),
                        y: space.y,
                        z: minZ + (space.gz * RESOLUTION) + (ori.l / 2),
                        w: ori.w, l: ori.l, h: placedItem.height,
                        width: ori.w, length: ori.l, height: placedItem.height,
                        rotated: ori.rot
                    });

                    const pw = Math.ceil(ori.w / RESOLUTION);
                    const pl = Math.ceil(ori.l / RESOLUTION);
                    for (let z = space.gz; z < space.gz + pl; z++) {
                        for (let x = space.gx; x < space.gx + pw; x++) {
                            if (x < gridW && z < gridL) {
                                heightMap[getIdx(x, z)] = space.y + placedItem.height;
                            }
                        }
                    }
                    itemPlaced = true;
                    break;
                }
            }
            if (itemPlaced) break;
        }

        if (!itemPlaced) paveGap(space);
    }

    // --- PHASE 2: GRAVITY SETTLEMENT & STRUCTURAL CULLING ---
    // Sort items bottom-to-top so we build the real physical foundation first
    placedItems.sort((a, b) => a.y - b.y);
    const stableItems = [];

    for (const item of placedItems) {
        if (item.y === 0) {
            stableItems.push(item); // Items on the pallet floor are always stable
            continue;
        }

        const bMinX = item.x - item.w/2;
        const bMaxX = item.x + item.w/2;
        const bMinZ = item.z - item.l/2;
        const bMaxZ = item.z + item.l/2;

        // 1. Raycast down to find the highest ACTUAL physical surface beneath this item
        let highestContactY = 0;
        for (const solid of stableItems) {
            const sMinX = solid.x - solid.w/2;
            const sMaxX = solid.x + solid.w/2;
            const sMinZ = solid.z - solid.l/2;
            const sMaxZ = solid.z + solid.l/2;

            const overlapX = Math.max(0, Math.min(bMaxX, sMaxX) - Math.max(bMinX, sMinX));
            const overlapZ = Math.max(0, Math.min(bMaxZ, sMaxZ) - Math.max(bMinZ, sMinZ));

            if (overlapX > 0 && overlapZ > 0) {
                if (solid.y + solid.h > highestContactY && solid.y + solid.h <= item.y + 0.1) {
                    highestContactY = solid.y + solid.h;
                }
            }
        }

        // 2. Calculate the total support area at that specific elevation
        let supportArea = 0;
        const requiredArea = item.w * item.l;

        for (const solid of stableItems) {
            if (Math.abs((solid.y + solid.h) - highestContactY) < 2) { // 2mm tolerance
                const sMinX = solid.x - solid.w/2;
                const sMaxX = solid.x + solid.w/2;
                const sMinZ = solid.z - solid.l/2;
                const sMaxZ = solid.z + solid.l/2;

                const overlapX = Math.max(0, Math.min(bMaxX, sMaxX) - Math.max(bMinX, sMinX));
                const overlapZ = Math.max(0, Math.min(bMaxZ, sMaxZ) - Math.max(bMinZ, sMinZ));

                if (overlapX > 0 && overlapZ > 0) {
                    supportArea += (overlapX * overlapZ);
                }
            }
        }

        // 3. Verdict: If it has >= 75% support after dropping, keep it. Otherwise, cull it.
        if ((supportArea / requiredArea) >= 0.75) {
            item.y = highestContactY; // Snap the item down to reality
            stableItems.push(item);
        } else {
            // Item is floating over a canyon. We reject it (it gets naturally re-added
            // to the global unplaced pool in your App.jsx's router logic).
        }
    }

    placedItems = stableItems;

    const totalInputItems = cargoList.reduce((sum, c) => sum + (c.quantity || 0), 0);
    let resultingHeight = 0;
    if (placedItems.length > 0) {
        resultingHeight = Math.max(...placedItems.map(p => p.y + p.h));
    }

    return {
        placedItems,
        engineName: "Topographic Packer (with Gravity Verification)",
        efficiency: totalInputItems > 0 ? ((placedItems.length / totalInputItems) * 100).toFixed(1) : "0.0",
        resultingHeight
    };
}