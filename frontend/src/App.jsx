import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { WoodenPallet } from './components/WoodenPallet';
import { MaxHeightGuide } from './components/MaxHeightGuide';
import { PackedItem3D } from './components/PackedItem3D';
import { CogMarker3D } from './components/CogMarker3D';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import { generatePalletPDF, generateWarehouseGuidePDF } from './utils/pdfGenerator';
import { runPalletOptimization, OPTIMIZER_STRATEGIES } from './utils/palletOptimizers';
import { t, conv, UNITS } from './utils/i18n';
import './App.css';
import { PalletAccessories3D } from "./components/PalletAccessories3D.jsx";
import Papa from 'papaparse';

const PALLET_SPECS = {
    eur: { name: 'EUR 1 (1200 x 800 mm)', width: 1200, length: 800, height: 144 },
    iso: { name: 'ISO / Industrial (1200 x 1000 mm)', width: 1200, length: 1000, height: 144 },
    us: { name: 'US Standard (1219 x 1016 mm / 48x40 in)', width: 1219, length: 1016, height: 146 }
};

const COLOR_PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function App() {
    const [lang, setLang] = useState('en');
    const [unit, setUnit] = useState(UNITS.METRIC);

    const [activeTab, setActiveTab] = useState('inventory');
    const [optimizerType, setOptimizerType] = useState(OPTIMIZER_STRATEGIES.EXTREME_POINT);
    const [palletType, setPalletType] = useState('eur');

    const [maxHeight, setMaxHeight] = useState(1800);
    const [overhangX, setOverhangX] = useState(0);
    const [overhangY, setOverhangY] = useState(0);
    const [minSupportFraction, setMinSupportFraction] = useState(75);
    const [visibleHeight, setVisibleHeight] = useState(1800);
    const [isAuthOpen, setIsAuthOpen] = useState(false);

    const [accessories, setAccessories] = useState({
        useBottomSheet: false,
        useTopSheet: false,
        interlayerCount: 0,
        padEveryLayer: false,
        sheetThickness: 3,
        sheetWeight: 0.5,
        useCornerPosts: false,
        postThickness: 5,
        postFlange: 50,
        postWeight: 0.8
    });

    const [cargoList, setCargoList] = useState([]);
    const [packedData, setPackedData] = useState(null);
    const [selectedPalletIdx, setSelectedPalletIdx] = useState(0);
    const [savedProjects, setSavedProjects] = useState([]);
    const [projectNameInput, setProjectNameInput] = useState('');

    const { token, user, logout } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    // ========================================================================
    // BULLETPROOF PUBLIC DATA LOADER (Products & Boxes)
    // Uses "Stale-While-Revalidate" Cache + Sync Pattern
    // ========================================================================
    useEffect(() => {
        let isActive = true;

        const loadPublicCatalog = async () => {
            // 1. INSTANT LOAD FROM CACHE (Ensures UI never waits on subsequent loads)
            try {
                const cachedProducts = localStorage.getItem('catalog_products');
                const cachedBoxes = localStorage.getItem('catalog_boxes');
                if (cachedProducts) setAvailableProducts(JSON.parse(cachedProducts));
                if (cachedBoxes) setAvailableBoxes(JSON.parse(cachedBoxes));
            } catch (e) {
                console.warn("Failed to read catalog cache");
            }

            // 2. RESILIENT BACKGROUND SYNC (With Auto-Retry for cold starts)
            const fetchWithBackoff = async (url, retries = 3) => {
                for (let i = 1; i <= retries; i++) {
                    try {
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return await res.json();
                    } catch (err) {
                        if (i === retries) throw err;
                        // Wait 2s, then 4s, then give up
                        await new Promise(resolve => setTimeout(resolve, i * 2000));
                    }
                }
            };

            try {
                const [productsRes, boxesRes] = await Promise.allSettled([
                    fetchWithBackoff(`${API_BASE_URL}/api/v1/products`),
                    fetchWithBackoff(`${API_BASE_URL}/api/v1/boxes`)
                ]);

                if (!isActive) return;

                // 3. UPDATE STATE & RE-CACHE IF SUCCESSFUL
                if (productsRes.status === 'fulfilled' && Array.isArray(productsRes.value)) {
                    setAvailableProducts(productsRes.value);
                    localStorage.setItem('catalog_products', JSON.stringify(productsRes.value));
                }

                if (boxesRes.status === 'fulfilled' && Array.isArray(boxesRes.value)) {
                    setAvailableBoxes(boxesRes.value);
                    localStorage.setItem('catalog_boxes', JSON.stringify(boxesRes.value));
                }
            } catch (err) {
                console.error("Background catalog sync failed completely.", err);
            } finally {
                if (isActive) {
                    setIsLoadingProducts(false);
                    setIsLoadingBoxes(false);
                }
            }
        };

        loadPublicCatalog();

        return () => { isActive = false; };
    }, [API_BASE_URL]); // Dependencies do NOT include user or token!

    useEffect(() => {
        let isActive = true;
        const controller = new AbortController();

        const fetchWithRetry = async (endpoint, isText = false, retries = 3) => {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers, signal: controller.signal });
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return isText ? await res.text() : await res.json();
                } catch (err) {
                    if (err.name === 'AbortError' || !isActive) throw err;
                    if (attempt === retries) throw err;
                    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                }
            }
        };

        const loadAllData = async () => {
            // ==========================================
            // PROTECTED DATA (Only loads if logged in)
            // ==========================================
            if (user) {
                // 3. LOAD DRAFT
                fetchWithRetry(`/api/v1/pallet-drafts/${encodeURIComponent(user)}`, true)
                    .then(text => {
                        if (!isActive || !text) return;
                        try {
                            const data = JSON.parse(text);
                            if (data && data.cargoListJson && data.cargoListJson !== "[]") {
                                setCargoList(JSON.parse(data.cargoListJson));
                            }
                        } catch (e) { console.error("Draft Parse Error:", e.message); }
                    })
                    .catch(err => { if (isActive && err.name !== 'AbortError') console.warn("Draft fetch failed:", err.message); });

                // 4. LOAD SAVED PROJECTS FROM SUPABASE
                fetchWithRetry(`/api/v1/projects/${encodeURIComponent(user)}`, false)
                    .then(data => {
                        if (isActive && Array.isArray(data)) {
                            const parsed = data.map(p => ({
                                ...p,
                                cargoList: typeof p.cargoList === 'string' ? JSON.parse(p.cargoList) : p.cargoList,
                                packedData: typeof p.packedData === 'string' ? JSON.parse(p.packedData) : p.packedData
                            }));
                            setSavedProjects(parsed.sort((a, b) => new Date(b.date) - new Date(a.date)));
                        }
                    })
                    .catch(err => { if (isActive && err.name !== 'AbortError') console.warn("Project fetch failed:", err.message); });
            }
        };

        loadAllData();

        return () => {
            isActive = false;
            controller.abort();
        };
    }, [token, user, API_BASE_URL]);

    // AUTO-SAVE INVENTORY WHEN CHANGES HAPPEN
    const saveTimeoutRef = useRef(null);

    useEffect(() => {
        if (!user || !token || cargoList.length === 0) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            fetch(`${API_BASE_URL}/api/v1/pallet-drafts/${encodeURIComponent(user)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(cargoList)
            })
                .catch(err => console.error("Failed to sync pallet draft", err));
        }, 1500);

        return () => clearTimeout(saveTimeoutRef.current);
    }, [cargoList, user, token, API_BASE_URL]);

    // Custom Item Form State
    const [newItem, setNewItem] = useState({
        name: '', type: 'box', width: 350, length: 300, height: 250, diameter: 300, weight: 12.5
    });

    // Database Fetch States
    const [availableProducts, setAvailableProducts] = useState([]);
    const [availableBoxes, setAvailableBoxes] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isLoadingBoxes, setIsLoadingBoxes] = useState(true);

    const [selectedProductId, setSelectedProductId] = useState('');
    const [productQty, setProductQty] = useState(1);
    const [selectedBoxId, setSelectedBoxId] = useState('');
    const [boxQty, setBoxQty] = useState(1);

    // ========================================================================
    // INVENTORY MODIFICATION FIXES: ALL CHANGES NOW RESET PACKED DATA
    // ========================================================================

    const handleAddProduct = () => {
        const product = availableProducts.find(p => p.id === Number(selectedProductId));
        if (!product) return;

        const box = product.standardBox || availableBoxes.find(b => b.id === Number(selectedBoxId));
        const profile = product.packagingProfile || {};

        const existingId = `prod-${product.id}`;
        const qtyToAdd = Math.max(1, Number(productQty) || 1);

        if (cargoList.some(c => c.id === existingId)) {
            handleQuantityChange(existingId, qtyToAdd);
            return;
        }

        const l = Number(box?.length || profile.length) || 300;
        const w = Number(box?.width || profile.width) || 200;
        const h = Number(box?.height || profile.height) || 150;
        const wt = Number(product.box_weight || product.boxWeight || box?.emptyWeight || profile.grossBoxWeight) || 1.0;
        const boxQtyVal = Number(product.box_qty ?? product.boxQty ?? profile.boxQty ?? 24);
        const renderType = boxQtyVal === 1 ? 'barrel' : 'box';

        const packType = product.packaging || profile.packagingType || '';
        // Tell the PDF to call it a bucket if it's a PET container
        let displayType = renderType;
        if (renderType === 'barrel' && String(packType).toUpperCase().includes('PET')) {
            displayType = 'bucket';
        }
        const rawDrained = product.drained_weight ?? product.drainedWeight;
        const drainedStr = rawDrained ? (String(rawDrained).endsWith('g') ? rawDrained : `${rawDrained}g`) : '';
        const sortNum = product.sortOrder ?? product.sort_order;

        const displayName = [sortNum != null ? sortNum : null, product.sub_category || product.subCategory, product.style, product.flavor, packType, drainedStr].filter(Boolean).join(' - ');

        setCargoList(prev => [...prev, {
            id: existingId,
            cargoId: existingId,
            name: displayName,
            productCode: product.code,
            length: Math.max(10, l),
            width: Math.max(10, w),
            height: Math.max(10, h),
            diameter: renderType === 'barrel' ? Math.min(w, l) : undefined,
            weight: Math.max(0.1, wt),
            quantity: qtyToAdd,
            type: renderType,
            color: '#38bdf8',
            isGlobal: true
        }]);

        setPackedData(null); // Force UI to reset Optimized Tab
    };

    // ========================================================================
    // AUTO-IMPORT INVENTORY FROM URL PARAMETERS
    // ========================================================================
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const importData = params.get('import');

        // Only run if there is data to import AND the database catalog has finished loading
        if (importData && availableProducts.length > 0) {
            const itemsToImport = importData.split(',');

            setCargoList(prevCargoList => {
                let newCargoList = [...prevCargoList];
                let hasChanges = false;

                itemsToImport.forEach(item => {
                    const [sku, qtyStr] = item.split(':');
                    const qty = parseInt(qtyStr, 10);

                    if (sku && !isNaN(qty) && qty > 0) {
                        const product = availableProducts.find(p => p.code === sku);

                        if (product) {
                            const existingIdx = newCargoList.findIndex(c => c.productCode === sku);

                            // If it's already in the list, just add the quantity
                            if (existingIdx >= 0) {
                                newCargoList[existingIdx].quantity += qty;
                                hasChanges = true;
                            } else {
                                // Construct the new item exactly like handleAddProduct does
                                const box = product.standardBox || {};
                                const profile = product.packagingProfile || {};
                                const existingId = `prod-${product.id}`;

                                const l = Number(box.length || profile.length) || 300;
                                const w = Number(box.width || profile.width) || 200;
                                const h = Number(box.height || profile.height) || 150;
                                const wt = Number(product.box_weight || product.boxWeight || box.emptyWeight || profile.grossBoxWeight) || 1.0;
                                const boxQtyVal = Number(product.box_qty ?? product.boxQty ?? profile.boxQty ?? 24);
                                const renderType = boxQtyVal === 1 ? 'barrel' : 'box';

                                const packType = product.packaging || profile.packagingType || '';
                                const rawDrained = product.drained_weight ?? product.drainedWeight;
                                const drainedStr = rawDrained ? (String(rawDrained).endsWith('g') ? rawDrained : `${rawDrained}g`) : '';
                                const sortNum = product.sortOrder ?? product.sort_order;

                                const displayName = [
                                    sortNum != null ? sortNum : null,
                                    product.sub_category || product.subCategory,
                                    product.style,
                                    product.flavor,
                                    packType,
                                    drainedStr
                                ].filter(Boolean).join(' - ');

                                newCargoList.push({
                                    id: existingId,
                                    cargoId: existingId,
                                    name: displayName || sku,
                                    productCode: product.code,
                                    length: Math.max(10, l),
                                    width: Math.max(10, w),
                                    height: Math.max(10, h),
                                    diameter: renderType === 'barrel' ? Math.min(w, l) : undefined,
                                    weight: Math.max(0.1, wt),
                                    quantity: qty,
                                    type: renderType,
                                    color: '#10b981', // Highlight imported items in green
                                    isGlobal: true
                                });
                                hasChanges = true;
                            }
                        } else {
                            console.warn(`URL Import: SKU ${sku} not found in database.`);
                        }
                    }
                });

                if (hasChanges) {
                    setPackedData(null); // Force the optimizer to recognize new items

                    // Wipe the import parameter from the URL address bar silently
                    window.history.replaceState(null, '', window.location.pathname);
                    return newCargoList;
                }

                return prevCargoList;
            });
        }
    }, [availableProducts]);

    const handleAddStandardBox = () => {
        const box = availableBoxes.find(b => b.id === Number(selectedBoxId));
        if (!box) return;

        const existingId = `box-${box.id}`;
        const qtyToAdd = Math.max(1, Number(boxQty) || 1);

        if (cargoList.some(c => c.id === existingId)) {
            handleQuantityChange(existingId, qtyToAdd);
            return;
        }

        const l = Number(box.length) || 300;
        const w = Number(box.width) || 200;
        const h = Number(box.height) || 150;
        const wt = Number(box.emptyWeight) || 0.5;

        setCargoList(prev => [...prev, {
            id: existingId,
            cargoId: existingId,
            name: box.name,
            productCode: box.name,
            length: Math.max(10, l),
            width: Math.max(10, w),
            height: Math.max(10, h),
            weight: Math.max(0.1, wt),
            quantity: qtyToAdd,
            type: 'box',
            color: '#f59e0b',
            isGlobal: true
        }]);

        setPackedData(null); // Force UI to reset Optimized Tab
    };

    const handleAddCustomItem = (e) => {
        e.preventDefault();
        const id = `custom-${Date.now()}`;
        const isImperial = unit === UNITS.IMPERIAL;

        let w = Number(newItem.width) || 300;
        let l = Number(newItem.length) || 300;
        let h = Number(newItem.height) || 200;
        let wt = Number(newItem.weight) || 10;

        if (newItem.type === 'barrel') {
            const d = Number(newItem.diameter) || 300;
            w = d; l = d;
        }

        if (isImperial) {
            w = conv.inToMm(w); l = conv.inToMm(l); h = conv.inToMm(h); wt = conv.lbToKg(wt);
        }

        setCargoList(prev => [...prev, {
            id,
            cargoId: id,
            name: newItem.name || 'Custom Box',
            productCode: 'CUSTOM',
            width: Math.max(10, w),
            length: Math.max(10, l),
            height: Math.max(10, h),
            diameter: newItem.type === 'barrel' ? Math.max(10, w) : undefined,
            weight: Math.max(0.1, wt),
            quantity: 1,
            type: newItem.type || 'box',
            color: COLOR_PALETTE[prev.length % COLOR_PALETTE.length],
            isGlobal: false
        }]);

        setPackedData(null); // Force UI to reset Optimized Tab
    };

    const handleQuantityChange = (id, delta) => {
        setCargoList(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item));
        setPackedData(null); // Force UI to reset Optimized Tab
    };

    const handleQuantityInputChange = (id, value) => {
        const num = parseInt(value, 10);
        setCargoList(prev => prev.map(item => item.id === id ? { ...item, quantity: isNaN(num) || num < 0 ? 0 : num } : item));
        setPackedData(null); // Force UI to reset Optimized Tab
    };

    const handleRemoveItem = (id) => {
        const updated = cargoList.filter(item => item.id !== id);
        setCargoList(updated);
        setPackedData(null); // Always wipe stale packed data when items are removed
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const importedData = results.data;
                let newCargoList = [...cargoList];
                let hasChanges = false;

                importedData.forEach(row => {
                    const sku = row.SKU?.trim();
                    const qty = parseInt(row.Boxes, 10);

                    if (sku && !isNaN(qty) && qty > 0) {
                        hasChanges = true;

                        const existingIdx = newCargoList.findIndex(c => c.productCode === sku);

                        if (existingIdx >= 0) {
                            newCargoList[existingIdx].quantity += qty;
                        } else {
                            const product = availableProducts.find(p => p.code === sku);

                            if (product) {
                                const box = product.standardBox || {};
                                const profile = product.packagingProfile || {};
                                const existingId = `prod-${product.id}`;

                                const l = Number(box.length || profile.length) || 300;
                                const w = Number(box.width || profile.width) || 200;
                                const h = Number(box.height || profile.height) || 150;
                                const wt = Number(product.box_weight || product.boxWeight || box.emptyWeight || profile.grossBoxWeight) || 1.0;
                                const boxQtyVal = Number(product.box_qty ?? product.boxQty ?? profile.boxQty ?? 24);
                                const renderType = boxQtyVal === 1 ? 'barrel' : 'box';

                                // --- START NEW NAME LOGIC (Matches your manual add function) ---
                                const packType = product.packaging || profile.packagingType || '';
                                const rawDrained = product.drained_weight ?? product.drainedWeight;
                                const drainedStr = rawDrained ? (String(rawDrained).endsWith('g') ? rawDrained : `${rawDrained}g`) : '';
                                const sortNum = product.sortOrder ?? product.sort_order;

                                const displayName = [
                                    sortNum != null ? sortNum : null,
                                    product.sub_category || product.subCategory,
                                    product.style,
                                    product.flavor,
                                    packType,
                                    drainedStr
                                ].filter(Boolean).join(' - ');
                                // --- END NEW NAME LOGIC ---

                                newCargoList.push({
                                    id: existingId,
                                    cargoId: existingId,
                                    name: displayName || sku, // Uses the full descriptive name
                                    productCode: product.code,
                                    length: Math.max(10, l),
                                    width: Math.max(10, w),
                                    height: Math.max(10, h),
                                    diameter: renderType === 'barrel' ? Math.min(w, l) : undefined,
                                    weight: Math.max(0.1, wt),
                                    quantity: qty,
                                    type: renderType,
                                    color: '#10b981',
                                    isGlobal: true
                                });
                            } else {
                                console.warn(`CSV Import: SKU ${sku} not found in database.`);
                            }
                        }
                    }
                });

                if (hasChanges) {
                    setCargoList(newCargoList);
                    setPackedData(null);
                }

                event.target.value = null;
            }
        });
    };

    // ========================================================================
    // OPTIMIZATION AND POST-PROCESSING
    // ========================================================================
    const applyAccessoriesToPallet = (rawResult, accessories) => {
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

                // Determine if a pad should be placed on this layer
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

        return {
            ...rawResult,
            placedItems: shiftedItems,
            resultingHeight: finalHeight,
            slipSheets
        };
    };

    const handleOptimize = () => {
        const activeCargo = cargoList.filter(item => item.quantity > 0 && item.width > 0 && item.length > 0 && item.height > 0);
        if (activeCargo.length === 0) return;

        const sanitizedCargo = activeCargo.map(c => ({
            ...c,
            cargoId: c.cargoId || c.id,
            width: Number(c.width),
            length: Number(c.length),
            height: Number(c.height),
            weight: Number(c.weight) || 0,
            quantity: Number(c.quantity) || 1
        }));

        const spec = PALLET_SPECS[palletType];
        let remainingCargo = sanitizedCargo.map(c => ({ ...c }));
        let generatedPallets = [];
        let palletNum = 1;

        while (remainingCargo.some(c => c.quantity > 0)) {
            const currentCargo = remainingCargo.filter(c => c.quantity > 0);
            if (currentCargo.length === 0) break;

            const rawResultsArray = runPalletOptimization(
                optimizerType,
                currentCargo,
                spec,
                maxHeight,
                overhangX,
                overhangY,
                0.75
            );

            // Handle router returns that might be arrays or single objects
            const rawResult = Array.isArray(rawResultsArray) ? rawResultsArray[0] : rawResultsArray;

            if (!rawResult || !rawResult.placedItems || rawResult.placedItems.length === 0) break;

            const result = applyAccessoriesToPallet(rawResult, accessories);

            const placedCounts = {};
            result.placedItems.forEach(p => {
                const cId = p.cargoId || (p.id ? p.id.substring(0, p.id.lastIndexOf('-')) : null) || p.id;
                if (cId) {
                    placedCounts[cId] = (placedCounts[cId] || 0) + 1;
                }
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

        setPackedData({
            pallets: generatedPallets,
            totalPallets: generatedPallets.length,
            totalUnplaced: remainingCargo.reduce((sum, c) => sum + c.quantity, 0)
        });
        setSelectedPalletIdx(0);
        setVisibleHeight(maxHeight);
    };

    useEffect(() => {
        if (packedData && cargoList.some(c => c.quantity > 0)) {
            handleOptimize();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        accessories.useBottomSheet,
        accessories.useTopSheet,
        accessories.useCornerPosts,
        accessories.interlayerCount,
        accessories.padEveryLayer // <-- Add this dependency
    ]);

    const handleSaveProject = async () => {
        if (!projectNameInput.trim()) return;

        const newProj = {
            id: Date.now().toString(),
            userEmail: user || 'guest',
            name: projectNameInput.trim(),
            date: new Date().toISOString().split('T')[0],
            itemsCount: cargoList.reduce((acc, curr) => acc + curr.quantity, 0),
            cargoList: cargoList,
            packedData,
            palletType,
            optimizerType
        };

        // 1. Optimistic UI Update (makes it feel instant)
        setSavedProjects([newProj, ...savedProjects]);
        setProjectNameInput('');

        // 2. Send to Spring Boot / Supabase
        if (user) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/projects`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(newProj)
                });

                if (!res.ok) {
                    throw new Error(`Failed to save: ${res.status}`);
                }
            } catch (err) {
                console.error("Save project error:", err);
                alert("Failed to save project to database. Check your connection.");
            }
        }
    };

    const handleDeleteProject = async (e, projectId) => {
        e.stopPropagation();

        const confirmMsg = lang === 'el' ? "Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το έργο;" : "Are you sure you want to delete this project?";
        if (!window.confirm(confirmMsg)) return;

        // 1. Optimistic UI removal
        setSavedProjects(savedProjects.filter(p => p.id !== projectId));

        // 2. Delete from Spring Boot / Supabase
        if (user) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok && res.status !== 404) {
                    throw new Error(`Failed to delete: ${res.status}`);
                }
            } catch (err) {
                console.error("Delete project error:", err);
            }
        }
    };

    const handleLoadProject = (proj) => {
        setCargoList(proj.cargoList || []);
        setPackedData(proj.packedData || null);
        setSelectedPalletIdx(0);
        if (proj.palletType) setPalletType(proj.palletType);
        if (proj.optimizerType) setOptimizerType(proj.optimizerType);
    };

    const activeSpec = PALLET_SPECS[palletType];
    const palletHeight = activeSpec.height || 144;
    const effectiveWidth = activeSpec.width + (overhangX * 2);
    const effectiveLength = activeSpec.length + (overhangY * 2);

    let cogMetrics = null;
    const activePalletData = packedData?.pallets?.[selectedPalletIdx];

    if (activePalletData && activePalletData.placedItems && activePalletData.placedItems.length > 0) {
        const items = activePalletData.placedItems;
        const totalCargoWeight = items.reduce((sum, i) => sum + (Number(i.weight) || 1), 0);

        if (totalCargoWeight > 0) {
            let sumX = 0, sumY = 0, sumZ = 0;

            items.forEach((item) => {
                const w = Number(item.weight) || 1;
                const h = Number(item.height || item.h) || 100;

                const centerX = Number(item.x);
                const centerY = Number(item.y) + (h / 2);
                const centerZ = Number(item.z);

                sumX += centerX * w;
                sumY += centerY * w;
                sumZ += centerZ * w;
            });

            const absoluteCogX = sumX / totalCargoWeight;
            const absoluteCogY = sumY / totalCargoWeight;
            const absoluteCogZ = sumZ / totalCargoWeight;

            const maxOffsetX = activeSpec.width * 0.10;
            const maxOffsetZ = activeSpec.length * 0.10;

            const isImbalancedX = Math.abs(absoluteCogX) > maxOffsetX;
            const isImbalancedZ = Math.abs(absoluteCogZ) > maxOffsetZ;
            const isTopHeavy = activePalletData.resultingHeight > 0 && (absoluteCogY / activePalletData.resultingHeight) > 0.55;

            cogMetrics = {
                cogX: absoluteCogX,
                cogY: absoluteCogY,
                cogZ: absoluteCogZ,
                isStable: !isImbalancedX && !isImbalancedZ && !isTopHeavy,
                isImbalancedX,
                isImbalancedZ,
                isTopHeavy,
                heightPercent: activePalletData.resultingHeight > 0 ? ((absoluteCogY / activePalletData.resultingHeight) * 100).toFixed(0) : 0
            };
        }
    }

    const isImp = unit === UNITS.IMPERIAL;

    return (
        <div className="app-container">
            {/* TABBED SIDEBAR */}
            <div className="sidebar">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid #334155' }}>
                    <div style={{ minWidth: 0, paddingRight: '6px' }}>
                        <h2 style={{ margin: 0, fontSize: '16px', color: '#ffffff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {t(lang, 'app_title')}
                        </h2>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                        <button onClick={() => setLang(lang === 'en' ? 'el' : 'en')} className="btn-add" style={{ padding: '2px 6px', fontSize: '9px', background: '#334155', whiteSpace: 'nowrap' }}>
                            {lang === 'en' ? '🇬🇷 EL' : '🇬🇧 EN'}
                        </button>
                        <button onClick={() => setUnit(unit === UNITS.METRIC ? UNITS.IMPERIAL : UNITS.METRIC)} className="btn-add" style={{ padding: '2px 6px', fontSize: '9px', background: '#334155', whiteSpace: 'nowrap' }}>
                            {unit === UNITS.METRIC ? '📏 in/lb' : '📏 mm/kg'}
                        </button>

                        {token ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px', paddingLeft: '4px', borderLeft: '1px solid #475569' }}>
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#38bdf8', whiteSpace: 'nowrap' }}>
                                    👋 {user ? user.split('@')[0] : 'User'}
                                </span>
                                <button onClick={() => { logout(); setCargoList([]); }} className="btn-primary" style={{ padding: '2px 6px', fontSize: '9px', whiteSpace: 'nowrap', backgroundColor: '#b91c1c', borderColor: '#991b1b' }}>
                                    {t(lang, 'logout')}
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsAuthOpen(true)} className="btn-primary" style={{ padding: '2px 6px', fontSize: '9px', whiteSpace: 'nowrap', marginLeft: '4px' }}>
                                {t(lang, 'sign_in')}
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid #334155', margin: '2px 0 8px 0' }}>
                    <button type="button" onClick={() => setActiveTab('inventory')} style={tabButtonStyle(activeTab === 'inventory')}>
                        {t(lang, 'tab_inv')} ({cargoList.length})
                    </button>
                    <button type="button" onClick={() => setActiveTab('pallet')} style={tabButtonStyle(activeTab === 'pallet')}>
                        {t(lang, 'tab_pallet')}
                    </button>
                    <button type="button" onClick={() => setActiveTab('projects')} style={tabButtonStyle(activeTab === 'projects')}>
                        {t(lang, 'tab_proj')} ({savedProjects.length})
                    </button>
                </div>

                {activeTab === 'inventory' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                        {/* 1. Add Product Dropdown */}
                        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase' }}>Add Product</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <select
                                    value={selectedProductId}
                                    onChange={e => {
                                        const prodId = e.target.value;
                                        setSelectedProductId(prodId);
                                        if (prodId) {
                                            const product = availableProducts.find(p => p.id === Number(prodId));
                                            const linkedBoxId = product?.standardBox?.id || product?.standard_box_id;
                                            setSelectedBoxId(linkedBoxId || '');
                                        }
                                    }}
                                    className="form-select"
                                    style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis' }}
                                    disabled={isLoadingProducts || availableProducts.length === 0}
                                >
                                    <option value="">
                                        {isLoadingProducts ? "Loading products..." : availableProducts.length === 0 ? "No products available" : "Select inventory product..."}
                                    </option>
                                    {[...availableProducts]
                                        .sort((a, b) => {
                                            const orderA = a.sortOrder ?? a.sort_order ?? 999999;
                                            const orderB = b.sortOrder ?? b.sort_order ?? 999999;
                                            return orderA - orderB;
                                        })
                                        .map(p => {
                                            const sortNum = p.sortOrder ?? p.sort_order;
                                            const packType = p.packaging || p.packagingProfile?.packagingType || p.packagingProfile?.packaging_type || '';
                                            const rawDrained = p.drained_weight ?? p.drainedWeight ?? p.packagingProfile?.drainedWeight ?? p.packagingProfile?.drained_weight;
                                            let drainedStr = '';
                                            if (rawDrained) {
                                                const s = String(rawDrained).trim();
                                                drainedStr = /g$/i.test(s) ? s : `${s}g`;
                                            }
                                            const displayName = [sortNum != null ? sortNum : null, p.sub_category || p.subCategory, p.style, p.flavor, packType, drainedStr].filter(Boolean).join(' - ');
                                            return (<option key={p.id} value={p.id} title={displayName}>{displayName}</option>);
                                        })}
                                </select>
                                <input type="number" min="1" value={productQty} onChange={e => setProductQty(e.target.value)} className="form-input" style={{ width: '45px', textAlign: 'center' }} />
                            </div>
                            <button type="button" className="btn-add" onClick={handleAddProduct} disabled={!selectedProductId} style={{ width: '100%', height: '28px', opacity: selectedProductId ? 1 : 0.5 }}>
                                Add to Pallet
                            </button>
                        </div>

                        {/* 2. Add Standard Box Dropdown */}
                        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase' }}>Add Standard Box</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <select value={selectedBoxId} onChange={e => setSelectedBoxId(e.target.value)} className="form-select" style={{ flex: 1 }} disabled={isLoadingBoxes || availableBoxes.length === 0}>
                                    <option value="">
                                        {isLoadingBoxes ? "Loading standard boxes..." : availableBoxes.length === 0 ? "No standard boxes available" : "Select standard box..."}
                                    </option>
                                    {availableBoxes.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                                </select>
                                <input type="number" min="1" value={boxQty} onChange={e => setBoxQty(e.target.value)} className="form-input" style={{ width: '45px', textAlign: 'center' }} />
                            </div>
                            <button type="button" className="btn-add" onClick={handleAddStandardBox} disabled={!selectedBoxId} style={{ width: '100%', height: '28px', opacity: selectedBoxId ? 1 : 0.5, backgroundColor: '#b45309' }}>
                                Add Box
                            </button>
                        </div>

                        {/* 3. Custom Manual Form */}
                        <form onSubmit={handleAddCustomItem} className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Create Custom Object</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '1px', display: 'block' }}>{t(lang, 'name')}</label>
                                    <input type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} required className="form-input" style={{ width: '100%' }} />
                                </div>
                                <div style={{ width: '90px' }}>
                                    <label style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '1px', display: 'block' }}>{t(lang, 'type')}</label>
                                    <select value={newItem.type} onChange={(e) => setNewItem({...newItem, type: e.target.value})} className="form-select" style={{ width: '100%' }}>
                                        <option value="box">{t(lang, 'box')}</option>
                                        <option value="barrel">{t(lang, 'barrel')}</option>
                                        <option value="container">{t(lang, 'crate')}</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {newItem.type === 'barrel' ? (
                                    <>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '1px', display: 'block' }}>{t(lang, 'dia')} ({conv.unitL(unit)})</label>
                                            <input type="number" step="any" value={newItem.diameter} onChange={(e) => setNewItem({...newItem, diameter: e.target.value})} required className="form-input" style={{ width: '100%' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '1px', display: 'block' }}>{t(lang, 'height')} ({conv.unitL(unit)})</label>
                                            <input type="number" step="any" value={newItem.height} onChange={(e) => setNewItem({...newItem, height: e.target.value})} required className="form-input" style={{ width: '100%' }} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '1px', display: 'block' }}>W ({conv.unitL(unit)})</label>
                                            <input type="number" step="any" value={newItem.width} onChange={(e) => setNewItem({...newItem, width: e.target.value})} required className="form-input" style={{ width: '100%' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '1px', display: 'block' }}>L ({conv.unitL(unit)})</label>
                                            <input type="number" step="any" value={newItem.length} onChange={(e) => setNewItem({...newItem, length: e.target.value})} required className="form-input" style={{ width: '100%' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '1px', display: 'block' }}>H ({conv.unitL(unit)})</label>
                                            <input type="number" step="any" value={newItem.height} onChange={(e) => setNewItem({...newItem, height: e.target.value})} required className="form-input" style={{ width: '100%' }} />
                                        </div>
                                    </>
                                )}
                                <div style={{ width: '80px' }}>
                                    <label style={{ fontSize: '9px', color: '#38bdf8', marginBottom: '1px', display: 'block' }}>{t(lang, 'weight')} ({conv.unitW(unit)})</label>
                                    <input type="number" step="any" value={newItem.weight} onChange={(e) => setNewItem({...newItem, weight: e.target.value})} required className="form-input" style={{ width: '100%' }} />
                                </div>
                            </div>
                            <button type="submit" className="btn-add" style={{ width: '100%', height: '28px', marginTop: '2px', backgroundColor: '#334155' }}>Create Item</button>
                        </form>

                        {/* 4. Bulk CSV Import */}
                        <div className="panel-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px dashed #10b981' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', textTransform: 'uppercase' }}>Bulk CSV Import</span>
                            <div>
                                <input
                                    type="file"
                                    accept=".csv"
                                    id="csv-upload"
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                />
                                <label htmlFor="csv-upload" className="btn-add" style={{ cursor: 'pointer', padding: '4px 12px', background: '#059669', color: 'white', borderRadius: '4px', fontSize: '10px' }}>
                                    Upload File
                                </label>
                            </div>
                        </div>

                        {/* Added Items List */}
                        <div className="panel-card" style={{ flex: 1, overflowY: 'auto' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase' }}>{t(lang, 'obj_qty')} ({cargoList.length})</span>
                            {cargoList.length === 0 ? (
                                <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '8px' }}>{t(lang, 'no_obj')}</p>
                            ) : (
                                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {cargoList.map((item) => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '6px 10px', borderRadius: '4px', borderLeft: `4px solid ${item.color}` }}>
                                            <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                    <strong title={item.name} style={{ fontSize: '11px', color: '#ffffff', lineHeight: '1.25', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>
                                                        {item.name}
                                                    </strong>
                                                    {item.isGlobal ? (
                                                        <span style={{ fontSize: '8px', backgroundColor: '#0284c7', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold', flexShrink: 0 }}>DB</span>
                                                    ) : (
                                                        <span style={{ fontSize: '8px', backgroundColor: '#334155', color: '#94a3b8', padding: '1px 4px', borderRadius: '3px', flexShrink: 0 }}>{t(lang, 'custom')}</span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                                                    {item.type === 'barrel' ? `Ø${conv.formatL(item.diameter || item.width, unit)} x ${conv.formatL(item.height, unit)} ${conv.unitL(unit)}` : `${conv.formatL(item.width, unit)} x ${conv.formatL(item.length, unit)} x ${conv.formatL(item.height, unit)} ${conv.unitL(unit)}`} • <strong style={{ color: '#38bdf8' }}>{conv.formatW(item.weight, unit)} {conv.unitW(unit)}</strong>
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', flexShrink: 0 }}>
                                                <button type="button" onClick={() => handleQuantityChange(item.id, -1)} style={{ width: '22px', height: '22px', background: '#334155', border: '1px solid #475569', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                                <input type="number" min="0" max="999" value={item.quantity} onChange={(e) => handleQuantityInputChange(item.id, e.target.value)} className="form-input" style={{ width: '40px', height: '22px', textAlign: 'center', padding: '0 2px', fontSize: '11px', fontWeight: 600, color: '#38bdf8', background: '#0f172a' }} />
                                                <button type="button" onClick={() => handleQuantityChange(item.id, 1)} style={{ width: '22px', height: '22px', background: '#334155', border: '1px solid #475569', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                                <button type="button" onClick={() => handleRemoveItem(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', padding: '0 0 0 4px' }}>✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'pallet' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                        <div className="panel-card">
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#38bdf8', marginBottom: '4px', textTransform: 'uppercase' }}>
                                {t(lang, 'opt_algo')}
                            </label>
                            <select
                                value={optimizerType}
                                onChange={(e) => { setOptimizerType(e.target.value); setPackedData(null); }}
                                className="form-select"
                                style={{ width: '100%', borderColor: '#38bdf8' }}
                            >
                                <option value={OPTIMIZER_STRATEGIES.HORIZONTAL_GUILLOTINE}>
                                    Horizontal 2D Guillotine
                                </option>
                                <option value={OPTIMIZER_STRATEGIES.WALL_BUILDING_GRASP}>
                                    GRASP Metaheuristic Wall-Building
                                </option>
                                <option value={OPTIMIZER_STRATEGIES.MAXIMAL_GUILLOTINE}>
                                    Advanced Subsumption Guillotine
                                </option>
                                <option value={OPTIMIZER_STRATEGIES.UNIFORM_BLOCK}>
                                    Uniform Surface-Max Block Packer (Mixed-SKU Grouping)
                                </option>
                                <option value={OPTIMIZER_STRATEGIES.COLUMNAR_BLOCK}>
                                    Column-Block Pillar Packer (Retail Distribution Standard)
                                </option>
                                <option value={OPTIMIZER_STRATEGIES.PATTERN_INTERLOCKED}>
                                    Pattern-Based Interlocking Brickwork Packer (Cape Pack / Cube-IQ)
                                </option>
                                <option value={OPTIMIZER_STRATEGIES.TIER_INTERLOCKED}>
                                    Tier-Based Interlocked Layer Packer (Ti-Hi Manual Floor)
                                </option>
                                <option value={OPTIMIZER_STRATEGIES.WALL_BLOCK}>
                                    Sequential Ergonomic Wall-Block Packer (Manual Hand-Loading)
                                </option>
                                <option value={OPTIMIZER_STRATEGIES.DENSE_LAYERED}>
                                    Dense Layered Core Stacker
                                </option>
                                <option value={OPTIMIZER_STRATEGIES.EXTREME_POINT}>
                                    3D Extreme Point Spatial Packer (Automated Volume)
                                </option>
                                <option value={OPTIMIZER_STRATEGIES.FREE_PLACEMENT}>
                                    3D Free Placement (Beam Search & Static Stability)
                                </option>
                            </select>
                        </div>

                        <div className="panel-card">
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>{t(lang, 'pal_spec')}</label>
                            <select value={palletType} onChange={(e) => setPalletType(e.target.value)} className="form-select" style={{ width: '100%', marginBottom: '10px' }}>
                                <option value="eur">EUR 1 (1200 x 800 mm)</option>
                                <option value="iso">ISO / Industrial (1200 x 1000 mm)</option>
                                <option value="us">US Standard (1219 x 1016 mm)</option>
                            </select>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px', display: 'block' }}>{t(lang, 'over_x')} ({conv.unitL(unit)})</label>
                                    <input type="number" min="0" max={isImp ? 12 : 300} value={Math.round(isImp ? conv.mmToIn(overhangX) : overhangX)} onChange={(e) => setOverhangX(isImp ? conv.inToMm(Number(e.target.value)) : Number(e.target.value))} className="form-input" style={{ width: '100%' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px', display: 'block' }}>{t(lang, 'over_y')} ({conv.unitL(unit)})</label>
                                    <input type="number" min="0" max={isImp ? 12 : 300} value={Math.round(isImp ? conv.mmToIn(overhangY) : overhangY)} onChange={(e) => setOverhangY(isImp ? conv.inToMm(Number(e.target.value)) : Number(e.target.value))} className="form-input" style={{ width: '100%' }} />
                                </div>
                            </div>

                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                                {t(lang, 'max_h')}: {isImp ? conv.mmToIn(maxHeight).toFixed(0) + ' in' : (maxHeight / 1000).toFixed(2) + ' m'}
                            </label>
                            <input type="range" min={isImp ? 20 : 500} max={isImp ? 100 : 2500} step={isImp ? 2 : 50} value={isImp ? conv.mmToIn(maxHeight) : maxHeight} onChange={(e) => setMaxHeight(isImp ? conv.inToMm(Number(e.target.value)) : Number(e.target.value))} style={{ width: '100%', marginBottom: '10px' }} />
                        </div>

                        <div className="panel-card">
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#38bdf8', marginBottom: '8px', textTransform: 'uppercase' }}>
                                {t(lang, 'Load Accessories')}
                            </label>

                            {/* Sheets */}
                            <div className="panel-card" style={{ padding: '8px 10px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#38bdf8', marginBottom: '6px', textTransform: 'uppercase' }}>
                                    Accessories
                                </label>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '10px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={accessories.useBottomSheet} onChange={(e) => setAccessories({...accessories, useBottomSheet: e.target.checked})} />
                                        Base Sheet
                                    </label>
                                    <label style={{ fontSize: '10px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={accessories.useTopSheet} onChange={(e) => setAccessories({...accessories, useTopSheet: e.target.checked})} />
                                        Top Cap
                                    </label>
                                    <label style={{ fontSize: '10px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={accessories.useCornerPosts} onChange={(e) => setAccessories({...accessories, useCornerPosts: e.target.checked})} />
                                        Corners
                                    </label>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '10px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={accessories.padEveryLayer}
                                            onChange={(e) => setAccessories({...accessories, padEveryLayer: e.target.checked})}
                                        />
                                        Pad Every Layer
                                    </label>

                                    {!accessories.padEveryLayer && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '2px' }}>
                                            <label style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>Or specific count:</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="15"
                                                value={accessories.interlayerCount}
                                                onChange={(e) => setAccessories({...accessories, interlayerCount: parseInt(e.target.value) || 0})}
                                                className="form-input"
                                                style={{ width: '45px', padding: '2px 4px', fontSize: '11px', height: '22px', textAlign: 'center', fontWeight: 'bold', color: '#38bdf8' }}
                                            />
                                            <span style={{ fontSize: '9px', color: '#64748b' }}>(From bottom up)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button type="button" onClick={handleOptimize} className="btn-primary" disabled={cargoList.every(c => c.quantity === 0)} style={{ opacity: cargoList.every(c => c.quantity === 0) ? 0.5 : 1, cursor: cargoList.every(c => c.quantity === 0) ? 'not-allowed' : 'pointer' }}>
                            {t(lang, 'org_btn')}
                        </button>

                        {packedData && packedData.pallets && packedData.pallets.length > 0 && (
                            <div className="panel-card" style={{ fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase' }}>{packedData.pallets[selectedPalletIdx].engineName}</span>
                                    <span style={{ fontSize: '10px', backgroundColor: '#0ea5e9', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                        {t(lang, 'pal_x_of_y').replace('{x}', selectedPalletIdx + 1).replace('{y}', packedData.totalPallets)}
                                    </span>
                                </div>

                                {packedData.totalPallets > 1 && (
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                                        {packedData.pallets.map((p, idx) => (
                                            <button key={idx} type="button" onClick={() => setSelectedPalletIdx(idx)} style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '4px', border: selectedPalletIdx === idx ? '1px solid #38bdf8' : '1px solid #475569', background: selectedPalletIdx === idx ? '#0284c7' : '#1e293b', color: '#ffffff', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                                Pallet #{idx + 1} ({p.placedItems.length})
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {(() => {
                                    const activePallet = packedData.pallets[selectedPalletIdx];
                                    const totalCargoWeight = activePallet.placedItems.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
                                    const tarePalletWeight = 25;
                                    const grossWeight = totalCargoWeight + tarePalletWeight;
                                    const cargoHeightMm = packedData.pallets[selectedPalletIdx].resultingHeight;
                                    const totalHeightMm = cargoHeightMm + palletHeight;

                                    return (
                                        <>
                                            <div style={{ backgroundColor: '#1e293b', padding: '8px', borderRadius: '4px', marginBottom: '8px', border: '1px solid #334155' }}>
                                                <div><strong>{t(lang, 'cargo_w')}: </strong><span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{conv.formatW(totalCargoWeight, unit)} {conv.unitW(unit)}</span></div>
                                                <div><strong>{t(lang, 'gross_w')}: </strong><span style={{ color: '#10b981', fontWeight: 'bold' }}>{conv.formatW(grossWeight, unit)} {conv.unitW(unit)}</span></div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
                                                <div><strong>{t(lang, 'cargo_stack_h')}: </strong><span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{isImp ? conv.mmToIn(cargoHeightMm).toFixed(1) + ' in' : (cargoHeightMm/1000).toFixed(2) + ' m'}</span></div>
                                                <div><strong>{t(lang, 'total_ship_h')}: </strong><span style={{ color: '#10b981', fontWeight: 'bold' }}>{isImp ? conv.mmToIn(totalHeightMm).toFixed(1) + ' in' : (totalHeightMm/1000).toFixed(2) + ' m'}</span> <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px' }}>({conv.formatL(palletHeight, unit)}{conv.unitL(unit)} {t(lang, 'deck')})</span></div>
                                            </div>
                                        </>
                                    );
                                })()}

                                {cogMetrics && (
                                    <div style={{ backgroundColor: '#1e293b', padding: '8px', borderRadius: '4px', marginBottom: '8px', border: cogMetrics.isStable ? '1px solid #10b981' : '1px solid #f59e0b' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>{t(lang, 'cog')}</span>
                                            {cogMetrics.isStable ? (
                                                <span style={{ fontSize: '9px', backgroundColor: '#065f46', color: '#34d399', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>{t(lang, 'stable')}</span>
                                            ) : (
                                                <span style={{ fontSize: '9px', backgroundColor: '#78350f', color: '#fbbf24', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>{t(lang, 'hazard')}</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div><strong>{t(lang, 'cog_coords')}: </strong><span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>X:{cogMetrics.cogX > 0 ? `+${conv.formatL(cogMetrics.cogX, unit)}` : conv.formatL(cogMetrics.cogX, unit)}{conv.unitL(unit)} | Z:{cogMetrics.cogZ > 0 ? `+${conv.formatL(cogMetrics.cogZ, unit)}` : conv.formatL(cogMetrics.cogZ, unit)}{conv.unitL(unit)}</span></div>
                                            <div><strong>{t(lang, 'cog_elev')}: </strong><span>{conv.formatL(cogMetrics.cogY, unit)} {conv.unitL(unit)} ({cogMetrics.heightPercent}%)</span></div>
                                            {cogMetrics.isImbalancedX && <div style={{ color: '#f59e0b', fontSize: '10px', marginTop: '2px' }}>{t(lang, 'off_x')}</div>}
                                            {cogMetrics.isImbalancedZ && <div style={{ color: '#f59e0b', fontSize: '10px', marginTop: '2px' }}>{t(lang, 'off_z')}</div>}
                                            {cogMetrics.isTopHeavy && <div style={{ color: '#f59e0b', fontSize: '10px', marginTop: '2px' }}>{t(lang, 'top_heavy')}</div>}
                                        </div>
                                    </div>
                                )}

                                <div><strong>{t(lang, 'vol_util')}:</strong> <span style={{ color: '#38bdf8' }}>{packedData.pallets[selectedPalletIdx].efficiency}%</span></div>
                                <div><strong>{t(lang, 'items_placed')}:</strong> {packedData.pallets[selectedPalletIdx].placedItems.length}</div>
                                {packedData.pallets[selectedPalletIdx].totalLayers && (
                                    <div><strong>Layers Built (Ti-Hi):</strong> <span style={{ color: '#10b981' }}>{packedData.pallets[selectedPalletIdx].totalLayers}</span></div>
                                )}
                                {packedData.totalUnplaced > 0 && (<div style={{ color: '#ef4444', marginTop: '6px', fontWeight: 'bold' }}>{t(lang, 'unplaced')}: {packedData.totalUnplaced}</div>)}

                                <div style={{ marginTop: '8px' }}>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>{t(lang, 'inspect_h')}</label>
                                    <input type="range" min="0" max={maxHeight} value={visibleHeight} onChange={(e) => setVisibleHeight(Number(e.target.value))} style={{ width: '100%' }} />
                                </div>

                                <button type="button" onClick={() => generatePalletPDF({ palletData: packedData.pallets[selectedPalletIdx], palletIndex: selectedPalletIdx, totalPallets: packedData.totalPallets, palletSpec: PALLET_SPECS[palletType], lang, unit, customerInfo: { name: user ? user.split('@')[0] : 'Customer Account', address: 'Main Distribution Center, Dock 3', contact: 'Inbound Receiving' }, orderInfo: { poNumber: 'PO-2026-8891', soNumber: 'SO-10042', date: new Date().toISOString().split('T')[0] }})} className="btn-add" style={{ width: '100%', marginTop: '10px', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 'bold' }}>
                                    {t(lang, 'exp_cust')}
                                </button>

                                <button type="button" onClick={() => generateWarehouseGuidePDF({ palletData: packedData.pallets[selectedPalletIdx], palletIndex: selectedPalletIdx, totalPallets: packedData.totalPallets, palletSpec: PALLET_SPECS[palletType], lang, unit })} className="btn-add" style={{ width: '100%', marginTop: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#38bdf8', fontWeight: 'bold' }}>
                                    {t(lang, 'exp_wh')}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'projects' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase' }}>{t(lang, 'save_ws')}</span>
                            <input type="text" placeholder={t(lang, 'proj_name')} value={projectNameInput} onChange={(e) => setProjectNameInput(e.target.value)} className="form-input" style={{ width: '100%' }} />
                            <button type="button" onClick={handleSaveProject} disabled={!projectNameInput.trim()} className="btn-add" style={{ width: '100%', opacity: projectNameInput.trim() ? 1 : 0.5 }}>{t(lang, 'save_proj')}</button>
                        </div>
                        <div className="panel-card" style={{ flex: 1, overflowY: 'auto' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{t(lang, 'saved_proj')} ({savedProjects.length})</span>
                            {savedProjects.length === 0 ? (
                                <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '8px' }}>{t(lang, 'no_proj')}</p>
                            ) : (
                                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {savedProjects.map((proj) => (
                                        <div key={proj.id} style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '6px', border: '1px solid #334155', transition: 'all 0.2s ease', position: 'relative' }}>

                                            {/* Clickable area to LOAD the project */}
                                            <div onClick={() => handleLoadProject(proj)} style={{ cursor: 'pointer', paddingBottom: '4px', paddingRight: '20px' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#38bdf8' }}>{proj.name}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{t(lang, 'items')}: {proj.itemsCount} | {t(lang, 'date')}: {proj.date}</div>
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => handleDeleteProject(e, proj.id)}
                                                style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', padding: '4px' }}
                                                title="Delete Project"
                                            >
                                                ✕
                                            </button>

                                            {/* Export Button (Visible only if the project has packed data) */}
                                            {proj.packedData && proj.packedData.pallets && proj.packedData.pallets.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        generatePalletPDF({
                                                            palletData: proj.packedData.pallets[0],
                                                            palletIndex: 0,
                                                            totalPallets: proj.packedData.totalPallets,
                                                            palletSpec: PALLET_SPECS[proj.palletType || palletType],
                                                            lang,
                                                            unit,
                                                            customerInfo: { name: user ? user.split('@')[0] : 'Customer Account', address: 'Main Distribution Center', contact: 'Inbound Receiving' },
                                                            orderInfo: { poNumber: `PO-${proj.id.slice(-4)}`, soNumber: `PRJ-${proj.id.slice(-4)}`, date: proj.date }
                                                        });
                                                    }}
                                                    className="btn-add"
                                                    style={{ width: '100%', marginTop: '8px', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 'bold', fontSize: '10px', padding: '6px 4px' }}
                                                >
                                                    {t(lang, 'exp_cust')}
                                                </button>
                                            )}

                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ======================================================================== */}
            {/* 3D VIEWPORT: CRITICAL FIX TO KEY MAPPING PREVENTS MESH COLLISION BUG */}
            {/* ======================================================================== */}
            <div className="viewport-container">
                <Canvas camera={{ position: [2200, 1800, 2200], fov: 40, near: 1, far: 10000 }}>
                    <ambientLight intensity={0.7} />
                    <directionalLight position={[1500, 2000, 1000]} intensity={1.2} />
                    <directionalLight position={[-1000, 1000, -1000]} intensity={0.4} />
                    <gridHelper args={[4000, 40, '#334155', '#1e293b']} position={[0, 0, 0]} />
                    <WoodenPallet type={palletType} />
                    <group position={[0, palletHeight, 0]}>
                        <MaxHeightGuide width={effectiveWidth} length={effectiveLength} maxHeight={maxHeight} />
                    </group>

                    {/* The crucial fix is here: key={item.uniqueId || `${item.id}-${idx}`} */}
                    {packedData && packedData.pallets && packedData.pallets[selectedPalletIdx] &&
                        packedData.pallets[selectedPalletIdx].placedItems
                            .filter((item) => item.y + (item.h || item.height) <= visibleHeight)
                            .map((item, idx) => (
                                <PackedItem3D
                                    key={item.uniqueId || `${item.id}-${idx}`}
                                    item={{ ...item, y: item.y + palletHeight }}
                                />
                            ))
                    }

                    <PalletAccessories3D
                        palletSpec={PALLET_SPECS[palletType]}
                        packedData={packedData?.pallets?.[selectedPalletIdx]}
                        accessories={accessories}
                        palletHeight={palletHeight}
                    />
                    {cogMetrics && (
                        <CogMarker3D
                            cogX={cogMetrics.cogX}
                            cogY={cogMetrics.cogY + palletHeight}
                            cogZ={cogMetrics.cogZ}
                            isStable={cogMetrics.isStable}
                        />
                    )}
                    <OrbitControls makeDefault target={[0, (maxHeight + palletHeight) / 2, 0]} />
                </Canvas>
            </div>
            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </div>
    );
}

const tabButtonStyle = (isActive) => ({
    flex: 1,
    padding: '4px 2px',
    background: 'none',
    border: 'none',
    borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
    color: isActive ? '#38bdf8' : '#94a3b8',
    cursor: 'pointer',
    fontWeight: isActive ? 'bold' : '500',
    fontSize: '11px',
    lineHeight: '1.3',
    transition: 'all 0.2s ease',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    overflow: 'hidden'
});