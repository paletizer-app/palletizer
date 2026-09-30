import { packExtremePoint } from './optimizers/extremePointOptimizer';
import { packTierInterlocked } from './optimizers/tierInterlockedOptimizer';
import { packSequentialWallBlock } from './optimizers/wallBlockOptimizer';
import { packPatternInterlocked } from './optimizers/patternInterlockOptimizer';
import { packColumnarBlock } from './optimizers/columnarBlockOptimizer';
import { packDenseLayered } from "./optimizers/denseLayerOptimizer.js";
import { packFreePlacement } from "./optimizers/freePlacementOptimizer.js";
import { packUniformBlock } from "./optimizers/uniformBlockOptimizer.js";
import { packAdvanced3DGuillotine } from "./optimizers/packAdvanced3DGuillotine.js";
import {packAdvancedWallBuildingGRASP} from "./optimizers/packAdvancedWallBuildingGRASP.js";
import {packHorizontalLayerGuillotine} from "./optimizers/packHorizontalLayerGuillotine.js";
import {packHighVolumeTopographic} from "./optimizers/packHighVolumeTopographic.js";
import {packChimneyInterlockingEngine} from "./optimizers/packChimneyInterlockingEngine.js";
import {packLevelFirstBlockEMS} from "./optimizers/packColumnarPrismEMS.js";

export const OPTIMIZER_STRATEGIES = {
    EXTREME_POINT: 'extremePoint',
    TIER_INTERLOCKED: 'tierInterlocked',
    WALL_BLOCK: 'wallBlock',
    PATTERN_INTERLOCKED: 'patternInterlocked',
    COLUMNAR_BLOCK: 'columnarBlock',
    DENSE_LAYERED: 'denseLayered',
    FREE_PLACEMENT: 'freePlacement',
    UNIFORM_BLOCK: 'uniformBlock',
    MAXIMAL_GUILLOTINE: 'maxGuillotine',
    WALL_BUILDING_GRASP: 'wallGRASP',
    HORIZONTAL_GUILLOTINE: '2DGuillotine',
    COLUMNAR_PRISM: 'columnarPrism',
    HIGH_VOLUME_TOPOGRAPHIC: 'highTopographic',
    CHIMNEY_INTERLOCKED: 'chimneyInterlocked'
};

export function runPalletOptimization(strategy, cargoList, palletSpec, maxHeight, overhangX = 0, overhangY = 0, minSupportFraction = 0.75) {
    switch (strategy) {
        case OPTIMIZER_STRATEGIES.CHIMNEY_INTERLOCKED:
            return packChimneyInterlockingEngine(cargoList, palletSpec, maxHeight, overhangX, overhangY);
        case OPTIMIZER_STRATEGIES.HIGH_VOLUME_TOPOGRAPHIC:
            return packHighVolumeTopographic(cargoList, palletSpec, maxHeight, overhangX, overhangY);
        case OPTIMIZER_STRATEGIES.COLUMNAR_PRISM:
            return packLevelFirstBlockEMS(cargoList, palletSpec, maxHeight, overhangX, overhangY,);

        case OPTIMIZER_STRATEGIES.TIER_INTERLOCKED:
            return packTierInterlocked(cargoList, palletSpec, maxHeight, overhangX, overhangY);

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

        case OPTIMIZER_STRATEGIES.UNIFORM_BLOCK:
            return packUniformBlock(cargoList, palletSpec, maxHeight, overhangX, overhangY);

        case OPTIMIZER_STRATEGIES.MAXIMAL_GUILLOTINE:
            return packAdvanced3DGuillotine(cargoList, palletSpec, maxHeight, overhangX, overhangY);

        case OPTIMIZER_STRATEGIES.WALL_BUILDING_GRASP:
            return packAdvancedWallBuildingGRASP(cargoList, palletSpec, maxHeight, overhangX, overhangY);

        case OPTIMIZER_STRATEGIES.HORIZONTAL_GUILLOTINE:
            return packHorizontalLayerGuillotine(cargoList, palletSpec, maxHeight, overhangX, overhangY);
            
        case OPTIMIZER_STRATEGIES.EXTREME_POINT:
        default:
            return packExtremePoint(cargoList, palletSpec, maxHeight, overhangX, overhangY, minSupportFraction);
    }
}