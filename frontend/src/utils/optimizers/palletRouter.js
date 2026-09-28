import { packDenseLayered } from './optimizers/denseLayerOptimizer';
import { packFreePlacement } from './optimizers/freePlacementOptimizer';

export function routePalletPacking(cargoList, palletSpec, maxHeight, selectedEngine) {
    const engineKey = String(selectedEngine || '').toLowerCase();

    // Route to the new Beam Search Free Placement Engine
    if (engineKey.includes('free') || engineKey.includes('beam')) {
        return [packFreePlacement(cargoList, palletSpec, maxHeight)];
    }

    // Fallback to the Dense Layered Engine
    return [packDenseLayered(cargoList, palletSpec, maxHeight)];
}