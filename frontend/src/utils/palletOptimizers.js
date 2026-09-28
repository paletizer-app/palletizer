import { packExtremePoint } from './optimizers/extremePointOptimizer';
import { packTierInterlocked } from './optimizers/tierInterlockedOptimizer';
import { packSequentialWallBlock } from './optimizers/wallBlockOptimizer';
import { packPatternInterlocked } from './optimizers/patternInterlockOptimizer';
import { packColumnarBlock } from './optimizers/columnarBlockOptimizer';
import { packDenseLayered } from "./optimizers/denseLayerOptimizer.js";
import { packFreePlacement } from "./optimizers/freePlacementOptimizer.js"; // <-- 1. Import new engine

export const OPTIMIZER_STRATEGIES = {
    EXTREME_POINT: 'extremePoint',
    TIER_INTERLOCKED: 'tierInterlocked',
    WALL_BLOCK: 'wallBlock',
    PATTERN_INTERLOCKED: 'patternInterlocked',
    COLUMNAR_BLOCK: 'columnarBlock',
    DENSE_LAYERED: 'denseLayered',
    FREE_PLACEMENT: 'freePlacement' // <-- 2. Add to strategies
};

export function runPalletOptimization(strategy, cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0, minSupportFraction = 0.75) {
    switch (strategy) {
        case OPTIMIZER_STRATEGIES.TIER_INTERLOCKED:
            return packTierInterlocked(cargoList, palletSpec, maxHeight, overhangX, overhangY, minSupportFraction);

        case OPTIMIZER_STRATEGIES.WALL_BLOCK:
            return packSequentialWallBlock(cargoList, palletSpec, maxHeight, overhangX, overhangY, minSupportFraction);

        case OPTIMIZER_STRATEGIES.PATTERN_INTERLOCKED:
            return packPatternInterlocked(cargoList, palletSpec, maxHeight, overhangX, overhangY, minSupportFraction);

        case OPTIMIZER_STRATEGIES.COLUMNAR_BLOCK:
            return packColumnarBlock(cargoList, palletSpec, maxHeight, overhangX, overhangY);

        case OPTIMIZER_STRATEGIES.DENSE_LAYERED:
            return packDenseLayered(cargoList, palletSpec, maxHeight, overhangX, overhangY);

        case OPTIMIZER_STRATEGIES.FREE_PLACEMENT:
            return packFreePlacement(cargoList, palletSpec, maxHeight);

        case OPTIMIZER_STRATEGIES.EXTREME_POINT:
        default:
            return packExtremePoint(cargoList, palletSpec, maxHeight, overhangX, overhangY, minSupportFraction);
    }
}