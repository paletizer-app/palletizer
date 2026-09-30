import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { t, conv, UNITS, PRODUCT_TRANSLATIONS } from './i18n';

// ============================================================================
// TRANSLATION HELPER (SKU-BASED)
// ============================================================================
export const getTranslatedProductName = (item, lang = 'en') => {
    const sku = item.productCode || item.code || item.cargoId;
    if (sku && PRODUCT_TRANSLATIONS[sku] && PRODUCT_TRANSLATIONS[sku][lang]) {
        return PRODUCT_TRANSLATIONS[sku][lang];
    }
    return (item.name || '').replace(/^\d+\s*-\s*/, '');
};

// ============================================================================
// FONT LOADING
// ============================================================================
let cachedRegularFont = null;
let cachedBoldFont = null;

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function loadUnicodeFonts(doc) {
    if (!cachedRegularFont || !cachedBoldFont) {
        const [regRes, boldRes] = await Promise.all([
            fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf'),
            fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf')
        ]);
        cachedRegularFont = arrayBufferToBase64(await regRes.arrayBuffer());
        cachedBoldFont = arrayBufferToBase64(await boldRes.arrayBuffer());
    }
    doc.addFileToVFS('Roboto-Regular.ttf', cachedRegularFont);
    doc.addFileToVFS('Roboto-Medium.ttf', cachedBoldFont);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');
}

// ============================================================================
// 1. CUSTOMER PACKING SLIP & SHIPPING MANIFEST (Retained from previous)
// ============================================================================
export async function generatePalletPDF({ palletData, palletIndex, totalPallets, palletSpec, orderInfo = {}, lang = 'en', unit = UNITS.METRIC }) {
    const doc = jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadUnicodeFonts(doc);
    doc.setFont('Roboto', 'normal');

    const primaryColor = [15, 23, 42];
    const accentColor = [2, 132, 199];
    const lightBgColor = [241, 245, 249];

    const palletDeckHeight = palletSpec.height || 144;
    const totalCargoWeight = palletData.placedItems.reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
    const grossWeight = totalCargoWeight + 25;
    const totalHeightMeters = ((palletData.resultingHeight + palletDeckHeight) / 1000);
    const displayHeight = unit === UNITS.IMPERIAL ? (totalHeightMeters * 3.28084).toFixed(2) : totalHeightMeters.toFixed(2);

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(11);
    doc.text(t(lang, 'app_title'), 8, 7.5);

    let y = 15;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.text(`PALLET ${palletIndex + 1} OF ${totalPallets}`, 8, y);
    doc.text(`PO: ${orderInfo.poNumber || 'N/A'}`, 85, y);
    doc.text(`Date: ${orderInfo.date || new Date().toISOString().split('T')[0]}`, 202, y, { align: 'right' });

    y += 15;
    const metrics = [
        { label: 'Pallet Type', val: palletSpec.name.split('(')[0].trim() },
        { label: 'Gross Weight', val: `${conv.formatW(grossWeight, unit)} ${conv.unitW(unit)}` },
        { label: 'Total Height', val: `${displayHeight} ${conv.unitM(unit)}` }
    ];

    metrics.forEach((m, idx) => {
        const xPos = 8 + (idx * 66);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.rect(xPos, y, 62, 8, 'FD');
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(6);
        doc.text(m.label, xPos + 2.5, y + 3);
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(m.val, xPos + 2.5, y + 6.8);
    });

    y += 11;
    doc.setFontSize(8.5);
    doc.text('CARGO MANIFEST', 8, y);

    const itemSummaryMap = {};
    palletData.placedItems.forEach(item => {
        const finalName = getTranslatedProductName(item, lang);
        if (!itemSummaryMap[finalName]) {
            itemSummaryMap[finalName] = { name: finalName, dims: `${conv.formatL(item.width, unit)}x${conv.formatL(item.length || item.width, unit)}x${conv.formatL(item.height, unit)}`, uWeight: Number(item.weight) || 0, qty: 0 };
        }
        itemSummaryMap[finalName].qty += 1;
    });

    const tableRows = Object.values(itemSummaryMap).map((r, i) => [i + 1, r.name, r.dims, `${conv.formatW(r.uWeight, unit)}`, r.qty, `${conv.formatW(r.uWeight * r.qty, unit)}`]);

    autoTable(doc, {
        startY: y + 2,
        margin: { left: 8, right: 8 },
        head: [['#', 'Description', `Dimensions`, `Unit Wt`, 'Qty', `Total Wt`]],
        body: tableRows,
        styles: { font: 'Roboto', fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: primaryColor, textColor: 255 },
        foot: [['', '', '', 'TOTAL', palletData.placedItems.length, `${conv.formatW(totalCargoWeight, unit)}`]],
        footStyles: { fillColor: lightBgColor, textColor: [15, 23, 42], fontStyle: 'bold' }
    });

    doc.save(`Packing_Sheet_Pallet_${palletIndex + 1}.pdf`);
}

// ============================================================================
// 2. LOGISTICS & TRANSPORT PALLET SPECIFICATION (WITH NATIVE 3D ISOMETRIC ENGINE)
// ============================================================================
export async function generateLogisticsSpecPDF({ palletData, palletIndex, totalPallets, palletSpec, lang = 'en', unit = UNITS.METRIC }) {
    const doc = jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadUnicodeFonts(doc);
    doc.setFont('Roboto', 'normal');

    const primaryColor = [15, 23, 42];
    const lightBg = [241, 245, 249];

    // --- Core Calculations ---
    const palletDeckHeight = palletSpec.height || 144;
    const totalCargoWeight = palletData.placedItems.reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
    const tareWeight = 25;
    const grossWeight = totalCargoWeight + tareWeight;
    const totalHeightMm = palletData.resultingHeight + palletDeckHeight;
    const displayHeight = unit === UNITS.IMPERIAL ? (totalHeightMm / 25.4).toFixed(1) : (totalHeightMm / 1000).toFixed(2);
    const displayHeightUnit = unit === UNITS.IMPERIAL ? 'in' : 'm';

    // Footprint & Overhang Checks
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    palletData.placedItems.forEach(item => {
        const halfW = (item.w || item.width) / 2;
        const halfL = (item.l || item.length) / 2;
        const cx = item.x, cz = item.z;
        if (cx - halfW < minX) minX = cx - halfW;
        if (cx + halfW > maxX) maxX = cx + halfW;
        if (cz - halfL < minZ) minZ = cz - halfL;
        if (cz + halfL > maxZ) maxZ = cz + halfL;
    });

    const cargoW = maxX - minX;
    const cargoL = maxZ - minZ;
    const hasOverhang = Math.max(0, cargoW - palletSpec.width) > 0 || Math.max(0, cargoL - palletSpec.length) > 0;

    // --- Fragility & Stackability Scanning ---
    const hasFragileItems = palletData.placedItems.some(item => {
        const name = (item.name || '').toLowerCase();
        return name.includes('glass') || name.includes('jar') || name.includes('bottle') || name.includes('fragile');
    });

    let sumY = 0;
    palletData.placedItems.forEach(item => {
        sumY += (item.y + ((item.h || item.height) / 2)) * (Number(item.weight) || 1);
    });
    const cogY = sumY / Math.max(1, totalCargoWeight);
    const isTopHeavy = palletData.resultingHeight > 0 && (cogY / palletData.resultingHeight) > 0.55;

    // STRICT OVERRIDE: All pallets are unstackable.
    const isStackable = false;

    // --- 1. HEADER ---
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(14);
    doc.text('LOGISTICS PALLET SPECIFICATION', 14, 13);
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.text(`UNIT ${palletIndex + 1} OF ${totalPallets}`, 196, 13, { align: 'right' });

    let y = 28;

    // --- 2. TRANSPORT METRICS ---
    doc.setFillColor(...lightBg);
    doc.rect(14, y, 182, 38, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(10);
    doc.text('TRANSPORT DIMENSIONS & WEIGHTS', 18, y + 6);
    doc.setDrawColor(203, 213, 225);
    doc.line(18, y + 9, 192, y + 9);

    doc.setFontSize(8);
    doc.setFont('Roboto', 'normal'); doc.text('Base Type:', 18, y + 15);
    doc.setFont('Roboto', 'bold'); doc.text(`${palletSpec.name}`, 45, y + 15);
    doc.setFont('Roboto', 'normal'); doc.text('Gross Weight:', 18, y + 21);
    doc.setFont('Roboto', 'bold'); doc.text(`${conv.formatW(grossWeight, unit)} ${conv.unitW(unit)}`, 45, y + 21);
    doc.setFont('Roboto', 'normal'); doc.text('Net Cargo Wt:', 18, y + 27);
    doc.setFont('Roboto', 'bold'); doc.text(`${conv.formatW(totalCargoWeight, unit)} ${conv.unitW(unit)}`, 45, y + 27);

    doc.setFont('Roboto', 'normal'); doc.text('Shipping Height:', 105, y + 15);
    doc.setFont('Roboto', 'bold'); doc.text(`${displayHeight} ${displayHeightUnit}`, 145, y + 15);
    doc.setFont('Roboto', 'normal'); doc.text('Max Footprint:', 105, y + 21);
    doc.setFont('Roboto', 'bold'); doc.text(`${conv.formatL(Math.max(palletSpec.width, cargoW), unit)} x ${conv.formatL(Math.max(palletSpec.length, cargoL), unit)} ${conv.unitL(unit)}`, 145, y + 21);
    doc.setFont('Roboto', 'normal'); doc.text('Total Items:', 105, y + 27);
    doc.setFont('Roboto', 'bold'); doc.text(`${palletData.placedItems.length} pcs`, 145, y + 27);

    y += 44;

    // --- 3. HANDLING ALERTS ---
    doc.setTextColor(...primaryColor);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(10);
    doc.text('HANDLING ALERTS & 3D LOAD VISUALIZATION', 14, y);
    y += 5;

    const alertX = 110;
    let alertY = y;

    const drawAlert = (title, status, isDanger, isWarning) => {
        const bg = isDanger ? [254, 226, 226] : (isWarning ? [254, 243, 199] : [240, 253, 244]);
        const tc = isDanger ? [185, 28, 28] : (isWarning ? [180, 83, 9] : [21, 128, 61]);

        doc.setFillColor(...bg);
        doc.rect(alertX, alertY, 86, 12, 'F');
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...tc);
        doc.text(title, alertX + 3, alertY + 5);
        doc.setFontSize(8.5);
        doc.text(status, alertX + 3, alertY + 9.5);
        alertY += 15;
    };

    drawAlert('OVERHANG STATUS', hasOverhang ? 'FAIL: PERIMETER OVERHANG DETECTED' : 'PASS: LOAD IS FLUSH TO PALLET', hasOverhang, false);
    drawAlert('LOAD STABILITY (CoG)', isTopHeavy ? 'WARNING: TOP HEAVY LOAD / TIP RISK' : 'PASS: BOTTOM HEAVY', isTopHeavy, isTopHeavy);

    // Default stackability to standard strict policy, or provide specific physical reasoning if applicable.
    let stackStatus = 'NO - DO NOT DOUBLE STACK';
    if (hasFragileItems) stackStatus = 'NO - FRAGILE MATERIALS (GLASS) DETECTED';
    else if (isTopHeavy) stackStatus = 'NO - TOP HEAVY LOAD UNSTABLE';
    else if (palletData.efficiency <= 80) stackStatus = 'NO - UNEVEN LOAD SURFACE';
    else if (palletData.resultingHeight >= 1500) stackStatus = 'NO - EXCEEDS HEIGHT LIMITS';

    // Hardcoded to true (Danger status) since stackability is universally false
    drawAlert('STACKABILITY', stackStatus, true, false);

    // --- 4. NATIVE 3D ISOMETRIC PROJECTION ENGINE ---
    const diagSize = 85;
    const diagX = 14;

    // Background placeholder for drawing
    doc.setFillColor(248, 250, 252);
    doc.rect(diagX, y, diagSize, diagSize, 'F');

    // Isometric Math (30-degree projection)
    const angle = Math.PI / 6;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Calculate maximum bounds to fit the drawing perfectly in the box
    const isoTotalW = (palletSpec.width + palletSpec.length) * cosA;
    const isoTotalH = totalHeightMm + (palletSpec.width + palletSpec.length) * sinA;
    const scale = Math.min((diagSize - 10) / isoTotalW, (diagSize - 10) / isoTotalH);

    const originX = diagX + (diagSize / 2);
    const originY = y + diagSize - 10; // Anchor at the bottom of the bounding box

    const toIso = (bx, by, bz) => {
        return {
            x: originX + (bx - bz) * cosA * scale,
            y: originY - (by * scale) + (bx + bz) * sinA * scale
        };
    };

    function drawIsoBox(bx, by, bz, bw, bh, bl, cFront, cRight, cTop) {
        const p0 = toIso(bx, by, bz+bl);       // Front-Bottom
        const p1 = toIso(bx+bw, by, bz+bl);    // Right-Bottom
        const p2 = toIso(bx+bw, by+bh, bz+bl); // Right-Top
        const p3 = toIso(bx, by+bh, bz+bl);    // Front-Top
        const p4 = toIso(bx+bw, by, bz);       // Back-Right-Bottom
        const p5 = toIso(bx+bw, by+bh, bz);    // Back-Right-Top
        const p6 = toIso(bx, by+bh, bz);       // Back-Left-Top

        doc.setLineWidth(0.2);
        doc.setDrawColor(15, 23, 42);

        // Front Face (parallel to X axis)
        doc.setFillColor(...cFront);
        doc.lines([[p1.x-p0.x, p1.y-p0.y], [p2.x-p1.x, p2.y-p1.y], [p3.x-p2.x, p3.y-p2.y], [p0.x-p3.x, p0.y-p3.y]], p0.x, p0.y, [1,1], 'FD', true);

        // Right Face (parallel to Z axis)
        doc.setFillColor(...cRight);
        doc.lines([[p4.x-p1.x, p4.y-p1.y], [p5.x-p4.x, p5.y-p4.y], [p2.x-p5.x, p2.y-p5.y], [p1.x-p2.x, p1.y-p2.y]], p1.x, p1.y, [1,1], 'FD', true);

        // Top Face
        doc.setFillColor(...cTop);
        doc.lines([[p2.x-p3.x, p2.y-p3.y], [p5.x-p2.x, p5.y-p2.y], [p6.x-p5.x, p6.y-p5.y], [p3.x-p6.x, p3.y-p6.y]], p3.x, p3.y, [1,1], 'FD', true);
    }

    // Depth Sorting (Painter's Algorithm)
    // Render lowest items first (Y), then back-most (Z), then left-most (X)
    const sortedItems = [...palletData.placedItems].sort((a, b) => {
        if (Math.abs(a.y - b.y) > 0.1) return a.y - b.y;
        const aMinZ = a.minZ ?? (a.z - (a.l || a.length)/2);
        const bMinZ = b.minZ ?? (b.z - (b.l || b.length)/2);
        if (Math.abs(aMinZ - bMinZ) > 0.1) return aMinZ - bMinZ;
        const aMinX = a.minX ?? (a.x - (a.w || a.width)/2);
        const bMinX = b.minX ?? (b.x - (b.w || b.width)/2);
        return aMinX - bMinX;
    });

    // 1. Draw Wooden Pallet Base
    const pW = palletSpec.width, pL = palletSpec.length, pH = palletDeckHeight;
    drawIsoBox(-pW/2, 0, -pL/2, pW, pH, pL, [180, 83, 9], [120, 53, 15], [217, 119, 6]);

    // 2. Draw Cargo Boxes
    sortedItems.forEach(item => {
        const bx = item.minX ?? (item.x - (item.w || item.width)/2);
        const by = item.y + palletDeckHeight;
        const bz = item.minZ ?? (item.z - (item.l || item.length)/2);
        const bw = item.w || item.width;
        const bh = item.h || item.height;
        const bl = item.l || item.length;

        // Cargo colors (Cardboard Orange styling with shading)
        drawIsoBox(bx, by, bz, bw, bh, bl, [249, 115, 22], [194, 65, 12], [253, 186, 116]);
    });

    y += diagSize + 10;

    // --- 5. LOAD MANIFEST SUMMARY ---
    doc.setTextColor(...primaryColor);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(10);
    doc.text('CARGO MANIFEST', 14, y);

    const itemSummaryMap = {};
    palletData.placedItems.forEach(item => {
        const finalDisplayName = getTranslatedProductName(item, lang);
        if (!itemSummaryMap[finalDisplayName]) {
            itemSummaryMap[finalDisplayName] = {
                name: finalDisplayName,
                dims: item.type === 'barrel' ? `Ø${conv.formatL(item.diameter || item.width, unit)}x${conv.formatL(item.height, unit)}` : `${conv.formatL(item.width, unit)}x${conv.formatL(item.length, unit)}x${conv.formatL(item.height, unit)}`,
                unitWeight: Number(item.weight) || 0,
                qty: 0
            };
        }
        itemSummaryMap[finalDisplayName].qty += 1;
    });

    const rows = Object.values(itemSummaryMap).map((row) => [
        row.name,
        row.dims,
        `${conv.formatW(row.unitWeight, unit)}`,
        row.qty,
        `${conv.formatW(row.unitWeight * row.qty, unit)}`
    ]);

    autoTable(doc, {
        startY: y + 4,
        margin: { left: 14, right: 14 },
        head: [['SKU / Description', `Dimensions (${conv.unitL(unit)})`, `Unit Wt (${conv.unitW(unit)})`, 'Qty', `Total Wt (${conv.unitW(unit)})`]],
        body: rows,
        theme: 'grid',
        styles: { font: 'Roboto' },
        headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 8, cellPadding: 2 },
        bodyStyles: { font: 'Roboto', fontSize: 8, textColor: [30, 41, 59], cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 40 }, 2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 15, halign: 'center' }, 4: { cellWidth: 25, halign: 'right' } }
    });

    doc.save(`Logistics_Spec_Pallet_${palletIndex + 1}.pdf`);
}