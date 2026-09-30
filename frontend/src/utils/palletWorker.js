// src/utils/palletWorker.js
import { runPalletOptimization } from './palletOptimizers';

// Replicate the accessory logic here so the worker can calculate final heights autonomously
function applyAccessoriesToPallet(rawResult, accessories) {
    if (!accessories || rawResult.placedItems.length === 0) return rawResult;

    let currentYShift = 0;
    const slipSheets = [];
    const thickness = Number(accessories.sheetThickness) || 3;

    const yLevels = Array.from(new Set(rawResult.placedItems.map(item => Math.round(item.y)))).sort((a, b) => a - b);
    const yShiftsMap = {};

    if (accessories.useBottomSheet) {
        slipSheets.push({ y: 0 });
        currentYShift += thickness;
    }

    if (accessories.padEveryLayer || accessories.interlayerCount > 0) {
        let padsPlaced = 0;
        for (let i = 0; i < yLevels.length; i++) {
            yShiftsMap[yLevels[i]] = currentYShift;
            const shouldPlacePad = accessories.padEveryLayer
                ? (i < yLevels.length - 1)
                : (padsPlaced < accessories.interlayerCount && i < yLevels.length - 1);

            if (shouldPlacePad) {
                const itemsInLayer = rawResult.placedItems.filter(item => Math.round(item.y) === yLevels[i]);
                const maxHInLayer = Math.max(...itemsInLayer.map(item => item.h || item.height));
                slipSheets.push({ y: yLevels[i] + maxHInLayer + currentYShift });
                currentYShift += thickness;
                padsPlaced++;
            }
        }
    } else {
        yLevels.forEach(y => { yShiftsMap[y] = currentYShift; });
    }

    const shiftedItems = rawResult.placedItems.map(item => ({
        ...item,
        y: item.y + (yShiftsMap[Math.round(item.y)] || 0)
    }));

    let finalHeight = shiftedItems.reduce((max, p) => Math.max(max, p.y + (p.h || p.height)), 0);
    if (accessories.useTopSheet && finalHeight > 0) {
        slipSheets.push({ y: finalHeight });
        finalHeight += thickness;
    }

    return { ...rawResult, placedItems: shiftedItems, resultingHeight: finalHeight, slipSheets };
}

// The Web Worker Listener
self.onmessage = function(e) {
    const { activeCargo, spec, maxHeight, overhangX, overhangY, algorithmsToRun, accessories } = e.data;

    let championResult = null;
    let highestScore = -Infinity;

    for (const currentAlgo of algorithmsToRun) {
        // Reset inventory for the current simulation
        const sanitizedCargo = activeCargo.map(c => ({ ...c }));
        let remainingCargo = sanitizedCargo.map(c => ({ ...c }));
        let generatedPallets = [];
        let palletNum = 1;

        while (remainingCargo.some(c => c.quantity > 0)) {
            const currentCargo = remainingCargo.filter(c => c.quantity > 0);
            if (currentCargo.length === 0) break;

            const rawResultsArray = runPalletOptimization(currentAlgo, currentCargo, spec, maxHeight, overhangX, overhangY, 0.75);
            const rawResult = Array.isArray(rawResultsArray) ? rawResultsArray[0] : rawResultsArray;

            if (!rawResult || !rawResult.placedItems || rawResult.placedItems.length === 0) break;

            const result = applyAccessoriesToPallet(rawResult, accessories);

            const placedCounts = {};
            result.placedItems.forEach(p => {
                const cId = p.cargoId || (p.id ? p.id.substring(0, p.id.lastIndexOf('-')) : null) || p.id;
                if (cId) placedCounts[cId] = (placedCounts[cId] || 0) + 1;
            });

            let placedInRound = 0;
            remainingCargo = remainingCargo.map(c => {
                const count = placedCounts[c.id] || placedCounts[c.cargoId] || 0;
                placedInRound += count;
                return { ...c, quantity: Math.max(0, c.quantity - count) };
            });

            if (placedInRound === 0 && result.placedItems.length > 0) {
                const targetId = currentCargo[0].id;
                remainingCargo = remainingCargo.map(c =>
                    c.id === targetId ? { ...c, quantity: Math.max(0, c.quantity - result.placedItems.length) } : c
                );
            }

            generatedPallets.push({ palletIndex: palletNum, accessories, ...result });
            palletNum++;
            if (palletNum > 50) break;
        }

        const totalUnplaced = remainingCargo.reduce((sum, c) => sum + c.quantity, 0);
        const totalPalletsUsed = generatedPallets.length;
        const avgEfficiency = generatedPallets.reduce((sum, p) => sum + Number(p.efficiency || 0), 0) / (totalPalletsUsed || 1);

        // Score: Penalize unplaced items and extra pallets heavily. Reward density.
        const score = (totalUnplaced * -10000) + (totalPalletsUsed * -1000) + avgEfficiency;

        if (score > highestScore) {
            highestScore = score;
            championResult = {
                pallets: generatedPallets,
                totalPallets: totalPalletsUsed,
                totalUnplaced: totalUnplaced,
                winningAlgorithm: generatedPallets[0]?.engineName || currentAlgo
            };
        }
    }

    // Send the winning result back to the main UI thread
    self.postMessage(championResult);
};