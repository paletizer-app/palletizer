import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { t, conv, UNITS, PRODUCT_TRANSLATIONS } from './i18n';

// ============================================================================
// TRANSLATION HELPER (SKU-BASED)
// ============================================================================
export const getTranslatedProductName = (item, lang = 'en') => {
    // Attempt to pull the unique identifier
    const sku = item.productCode || item.code || item.cargoId;

    // 1. Try to find the exact SKU in the translation dictionary
    if (sku && PRODUCT_TRANSLATIONS[sku] && PRODUCT_TRANSLATIONS[sku][lang]) {
        return PRODUCT_TRANSLATIONS[sku][lang];
    }

    // 2. Fallback: use the raw name, but strip the leading "1 - " off of it
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
// 1. CUSTOMER PACKING SLIP & SHIPPING MANIFEST (DYNAMIC OVERLAP-PROOF)
// ============================================================================
export async function generatePalletPDF({
                                            palletData,
                                            palletIndex,
                                            totalPallets,
                                            palletSpec,
                                            orderInfo = {},
                                            lang = 'en',
                                            unit = UNITS.METRIC
                                        }) {
    const doc = jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    await loadUnicodeFonts(doc);
    doc.setFont('Roboto', 'normal');

    const primaryColor = [15, 23, 42];
    const accentColor = [2, 132, 199];
    const lightBgColor = [241, 245, 249];

    const palletDeckHeight = palletSpec.height || 144;
    const totalCargoWeight = palletData.placedItems.reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
    const tareWeight = 25;
    const grossWeight = totalCargoWeight + tareWeight;

    const totalHeightMeters = ((palletData.resultingHeight + palletDeckHeight) / 1000);
    const displayHeight = unit === UNITS.IMPERIAL ? (totalHeightMeters * 3.28084).toFixed(2) : totalHeightMeters.toFixed(2);
    const displayHeightUnit = conv.unitM(unit);
    const displayWeightUnit = conv.unitW(unit);

    // 1. TOP HEADER BAR
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(11);
    doc.text(t(lang, 'app_title'), 8, 7.5);

    doc.setFontSize(9);
    doc.setFont('Roboto', 'normal');
    doc.text(t(lang, 'pdf_slip'), 202, 7.5, { align: 'right' });

    // 2. SUB-HEADER METADATA LINE
    let y = 15;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('Roboto', 'bold');

    const palletIdText = `${t(lang, 'pdf_id')}: PALLET ${palletIndex + 1} OF ${totalPallets}`;
    doc.text(palletIdText, 8, y);

    const palletIdWidth = doc.getTextWidth(palletIdText);
    const poXPos = Math.max(85, 8 + palletIdWidth + 8);
    doc.text(`${t(lang, 'pdf_po')}:`, poXPos, y);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8);
    doc.text(`${t(lang, 'date')}: ${orderInfo.date || new Date().toISOString().split('T')[0]}`, 202, y, { align: 'right' });

    // 3. COMPACT SHIPPER STRIP
    y += 3;
    doc.setFillColor(...lightBgColor);
    doc.rect(8, y, 194, 9, 'F');

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...accentColor);

    const senderLabelText = `${t(lang, 'pdf_ship')}:`;
    doc.text(senderLabelText, 11, y + 5.5);

    const senderLabelWidth = doc.getTextWidth(senderLabelText);
    const senderDetailsXPos = 11 + senderLabelWidth + 3;

    doc.setFont('Roboto', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text('LAZAROS KALANTZIS FOODS GP  •  Logistics & Warehouse Dept.  •  Astakos Aitoloakarnanias', senderDetailsXPos, y + 5.5);

    // 4. BLANK CONSIGNEE DETAILS PLACEHOLDER
    y += 10;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225); // Slate 300 border
    doc.rect(8, y, 194, 15, 'FD'); // 15mm height white box

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...accentColor);

    const consLabelText = `${t(lang, 'pdf_cons')}:`;
    doc.text(consLabelText, 11, y + 5.5);

    const consLabelWidth = doc.getTextWidth(consLabelText);

    // Draw subtle lines for handwriting
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(11 + consLabelWidth + 3, y + 5.5, 198, y + 5.5); // Line 1 (Top right of label)
    doc.line(11, y + 10.5, 198, y + 10.5); // Line 2 (Full width)

    // 5. COMPACT METRICS STRIP
    y += 17; // Jump past the consignee box
    const cardWidth = 62;
    const cardHeight = 8;
    const cardGap = 4;
    const metrics = [
        { label: t(lang, 'pdf_ptype'), val: palletSpec.name.split('(')[0].trim() },
        { label: t(lang, 'pdf_gw'), val: `${conv.formatW(grossWeight, unit)} ${displayWeightUnit}` },
        { label: t(lang, 'pdf_th'), val: `${displayHeight} ${displayHeightUnit}` }
    ];

    metrics.forEach((m, idx) => {
        const xPos = 8 + (idx * (cardWidth + cardGap));
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.rect(xPos, y, cardWidth, cardHeight, 'FD');

        doc.setFont('Roboto', 'bold');

        let labelFontSize = 6;
        doc.setFontSize(labelFontSize);
        while (doc.getTextWidth(m.label) > (cardWidth - 5) && labelFontSize > 4.5) {
            labelFontSize -= 0.5;
            doc.setFontSize(labelFontSize);
        }

        doc.setTextColor(100, 116, 139);
        doc.text(m.label, xPos + 2.5, y + 3);

        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(m.val, xPos + 2.5, y + 6.8);
    });

    // 6. MANIFEST TABLE TITLE
    y += 11;
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(t(lang, 'pdf_manifest'), 8, y);

    // 7. Clean and Translate Product Names via SKU Dictionary
    const itemSummaryMap = {};
    palletData.placedItems.forEach(item => {

        const finalDisplayName = getTranslatedProductName(item, lang);

        // Render 6kg PET objects as Buckets instead of Barrels
        let resolvedDisplayType = item.displayType || item.type;
        if (item.type === 'barrel' && (finalDisplayName.toUpperCase().includes('PET') || (item.name && item.name.toUpperCase().includes('PET')))) {
            resolvedDisplayType = 'bucket';
        }

        const key = finalDisplayName;
        if (!itemSummaryMap[key]) {
            let dimStr = item.type === 'barrel'
                ? `Ø${conv.formatL(item.diameter || item.width, unit)} x ${conv.formatL(item.height, unit)}`
                : `${conv.formatL(item.width, unit)} x ${conv.formatL(item.length, unit)} x ${conv.formatL(item.height, unit)}`;
            itemSummaryMap[key] = {
                name: finalDisplayName,
                type: t(lang, resolvedDisplayType),
                dimensions: dimStr,
                unitWeight: Number(item.weight) || 0,
                qty: 0,
                totalWeight: 0
            };
        }
        itemSummaryMap[key].qty += 1;
        itemSummaryMap[key].totalWeight += (Number(item.weight) || 0);
    });

    const tableRows = Object.values(itemSummaryMap).map((row, index) => [
        index + 1,
        row.name,
        row.type.toUpperCase(),
        row.dimensions,
        `${conv.formatW(row.unitWeight, unit)}`,
        row.qty,
        `${conv.formatW(row.totalWeight, unit)}`
    ]);

    // 8. HYPER-COMPACT AUTOTABLE
    autoTable(doc, {
        startY: y + 2,
        margin: { left: 8, right: 8 },
        head: [['#', t(lang, 'pdf_desc'), t(lang, 'type'), `${t(lang, 'pdf_dims')} (${conv.unitL(unit)})`, `${t(lang, 'pdf_uwt')} (${displayWeightUnit})`, t(lang, 'pdf_qty'), `${t(lang, 'pdf_twt')} (${displayWeightUnit})`]],
        body: tableRows,
        theme: 'striped',
        styles: {
            font: 'Roboto',
            cellPadding: { top: 0.7, bottom: 0.7, left: 1.5, right: 1.5 },
            overflow: 'linebreak'
        },
        headStyles: {
            font: 'Roboto',
            fontStyle: 'bold',
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontSize: 7,
            cellPadding: { top: 1.2, bottom: 1.2, left: 1.5, right: 1.5 }
        },
        bodyStyles: {
            font: 'Roboto',
            fontSize: 7,
            textColor: [30, 41, 59]
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 18 },
            3: { cellWidth: 38 },
            4: { cellWidth: 18, halign: 'right' },
            5: { cellWidth: 12, halign: 'right' },
            6: { cellWidth: 22, halign: 'right' }
        },
        foot: [['', '', '', '', t(lang, 'pdf_totals'), palletData.placedItems.length, `${conv.formatW(totalCargoWeight, unit)}`]],
        footStyles: {
            font: 'Roboto',
            fontStyle: 'bold',
            fillColor: lightBgColor,
            textColor: [15, 23, 42],
            fontSize: 7,
            halign: 'right',
            cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 }
        }
    });

    // 9. COMPACT SIGNATURE FOOTER
    let finalY = doc.lastAutoTable.finalY + 8;
    if (finalY > 275) {
        doc.addPage();
        finalY = 15;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(8, finalY + 8, 62, finalY + 8);
    doc.line(74, finalY + 8, 128, finalY + 8);
    doc.line(140, finalY + 8, 202, finalY + 8);

    doc.setFontSize(6.5);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(t(lang, 'pdf_pby'), 8, finalY + 11.5);
    doc.text(t(lang, 'pdf_qa'), 74, finalY + 11.5);
    doc.text(t(lang, 'pdf_drv'), 140, finalY + 11.5);

    doc.save(`Packing_Sheet_Pallet_${palletIndex + 1}.pdf`);
}

// ============================================================================
// 2. WAREHOUSE LAYER-BY-LAYER ASSEMBLY GUIDE (BLUEPRINT SCHEMATIC)
// ============================================================================
export async function generateWarehouseGuidePDF({
                                                    palletData,
                                                    palletIndex,
                                                    totalPallets,
                                                    palletSpec,
                                                    lang = 'en',
                                                    unit = UNITS.METRIC
                                                }) {
    const doc = jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    await loadUnicodeFonts(doc);
    doc.setFont('Roboto', 'normal');

    const primaryColor = [15, 23, 42];
    const accentColor = [2, 132, 199];

    const layerMap = {};
    palletData.placedItems.forEach(item => {
        const yKey = Math.round(item.y);
        if (!layerMap[yKey]) layerMap[yKey] = [];
        layerMap[yKey].push(item);
    });
    const sortedYLevels = Object.keys(layerMap).map(Number).sort((a, b) => a - b);

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(12);
    doc.text(t(lang, 'pdf_whg'), 14, 14);

    doc.setFontSize(9);
    doc.setFont('Roboto', 'normal');
    doc.text(`PALLET #${palletIndex + 1} OF ${totalPallets} | ${palletSpec.name.split('(')[0]}`, 200, 14, { align: 'right' });

    let currentY = 28;

    sortedYLevels.forEach((yLevel, layerIdx) => {
        const layerItems = layerMap[yLevel];
        const layerThickness = Math.max(...layerItems.map(i => i.height));

        if (currentY + 110 > 280) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFillColor(...accentColor);
        doc.rect(14, currentY, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(9);

        let layerHeader = `${t(lang, 'pdf_layer')} ${layerIdx + 1}  •  ${t(lang, 'pdf_base')}: ${conv.formatL(yLevel, unit)}${conv.unitL(unit)}  |  ${t(lang, 'pdf_maxth')}: ${conv.formatL(layerThickness, unit)}${conv.unitL(unit)}  |  ${t(lang, 'items')}: ${layerItems.length} ${t(lang, 'pdf_pcs')}`;
        doc.text(layerHeader, 18, currentY + 5.5);

        currentY += 12;

        const diagW = 85;
        const diagH = diagW * (palletSpec.length / palletSpec.width);
        const startX = 14;
        const startY = currentY;

        doc.setFillColor(226, 232, 240);
        doc.setDrawColor(71, 85, 105);
        doc.setLineWidth(0.5);
        doc.rect(startX, startY, diagW, diagH, 'FD');

        const scale = diagW / palletSpec.width;
        const palletHalfW = palletSpec.width / 2;
        const palletHalfL = palletSpec.length / 2;

        layerItems.forEach((item, itemIdx) => {
            const itemW = item.width;
            const itemL = item.length;
            const cornerX = item.x - itemW / 2;
            const cornerZ = item.z - itemL / 2;
            const paperX = startX + (cornerX + palletHalfW) * scale;
            const paperY = startY + (cornerZ + palletHalfL) * scale;
            const paperW = itemW * scale;
            const paperL = itemL * scale;

            doc.setFillColor(254, 215, 170);
            doc.setDrawColor(194, 65, 12);
            doc.setLineWidth(0.3);

            if (item.type === 'barrel') {
                doc.circle(paperX + paperW / 2, paperY + paperL / 2, paperW / 2, 'FD');
            } else {
                doc.rect(paperX, paperY, paperW, paperL, 'FD');
            }

            doc.setFontSize(6.5);
            doc.setTextColor(15, 23, 42);
            doc.setFont('Roboto', 'bold');
            doc.text(`${itemIdx + 1}`, paperX + paperW / 2, paperY + paperL / 2 + 2, { align: 'center' });
        });

        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.setFont('Roboto', 'bold');
        doc.text(t(lang, 'pdf_front'), startX + diagW / 2, startY - 1.5, { align: 'center' });

        const tableStartX = startX + diagW + 6;
        const tableWidth = 182 - diagW - 6;

        const itemSummaryMap = {};
        layerItems.forEach(item => {

            const finalDisplayName = getTranslatedProductName(item, lang);

            const key = finalDisplayName;
            if (!itemSummaryMap[key]) {
                itemSummaryMap[key] = {
                    name: finalDisplayName,
                    dims: item.type === 'barrel' ? `Ø${conv.formatL(item.diameter, unit)}x${conv.formatL(item.height, unit)}` : `${conv.formatL(item.width, unit)}x${conv.formatL(item.length, unit)}x${conv.formatL(item.height, unit)}`,
                    qty: 0
                };
            }
            itemSummaryMap[key].qty += 1;
        });

        const rows = Object.values(itemSummaryMap).map((row) => [row.name, row.dims, row.qty]);

        autoTable(doc, {
            startY: startY,
            margin: { left: tableStartX },
            tableWidth: tableWidth,
            head: [['Item', `${t(lang, 'pdf_dims')} (${conv.unitL(unit)})`, t(lang, 'pdf_qty')]],
            body: rows,
            theme: 'grid',
            styles: { font: 'Roboto' },
            headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 7 },
            bodyStyles: { font: 'Roboto', fontSize: 7, textColor: [30, 41, 59] },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 32 }, 2: { cellWidth: 12, halign: 'center' } }
        });

        currentY = Math.max(startY + diagH + 12, doc.lastAutoTable.finalY + 12);
    });

    doc.save(`Warehouse_Assembly_Pallet_${palletIndex + 1}.pdf`);
}