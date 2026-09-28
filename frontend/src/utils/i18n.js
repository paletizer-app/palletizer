export const UNITS = {
    METRIC: 'metric',
    IMPERIAL: 'imperial'
};

export const conv = {
    mmToIn: (mm) => mm / 25.4,
    inToMm: (inch) => inch * 25.4,
    kgToLbs: (kg) => kg * 2.20462,
    lbsToKg: (lbs) => lbs / 2.20462,

    // Display Formatters
    formatL: (mm, unit, decimals = 1) => unit === UNITS.IMPERIAL ? (mm / 25.4).toFixed(decimals) : mm.toFixed(0),
    formatW: (kg, unit, decimals = 1) => unit === UNITS.IMPERIAL ? (kg * 2.20462).toFixed(decimals) : kg.toFixed(decimals),

    unitL: (unit) => unit === UNITS.IMPERIAL ? 'in' : 'mm',
    unitW: (unit) => unit === UNITS.IMPERIAL ? 'lbs' : 'kg',
    unitM: (unit) => unit === UNITS.IMPERIAL ? 'ft' : 'm',
};

const dictionary = {
    en: {
        app_title: "LAZAROS KALANTZIS FOODS GP",
        app_sub: "High-Density Spatial Packer",
        sign_in: "Sign In",
        logout: "Logout",
        tab_inv: "Inventory",
        tab_pallet: "Pallet & Engine",
        tab_proj: "Projects",

        define_obj: "1. Define New Object",
        name: "NAME",
        type: "TYPE",
        box: "Box",
        barrel: "Barrel",
        crate: "Crate",
        dia: "DIAMETER",
        height: "HEIGHT",
        weight: "WEIGHT",
        create_btn: "+ Create Object",

        obj_qty: "2. Object Quantities",
        no_obj: "No objects defined.",
        catalog: "CATALOG",
        custom: "CUSTOM",

        opt_algo: "OPTIMIZER ALGORITHM",
        surface: "Maximal Surface Contact Optimizer",
        extreme: "Extreme Point 3D Spatial Packer",
        interlock: "Interlocked Layer-Based Pattern Packer",
        wall: "Wall-Building / Vertical Slice Packer",
        block: "Homogeneous Block Composite Packer",

        pal_spec: "PALLET SPECIFICATION",
        over_x: "OVERHANG X",
        over_y: "OVERHANG Y",
        max_h: "MAX CARGO HEIGHT",
        min_sup: "MIN SUPPORT AREA RULE",
        org_btn: "Organize Pallet",

        pal_x_of_y: "Pallet {x} of {y}",
        cargo_w: "Cargo Weight",
        gross_w: "Gross Weight (incl. Pallet)",
        cargo_stack_h: "Cargo Stacking Height",
        total_ship_h: "Total Shipping Height",
        deck: "deck",

        cog: "CENTER OF GRAVITY (CoG)",
        stable: "🟢 STABLE LOAD",
        hazard: "⚠️ TIPPING HAZARD",
        cog_coords: "CoG Coordinates",
        cog_elev: "CoG Elevation",
        off_x: "• Off-center weight along Width (X)",
        off_z: "• Off-center weight along Length (Z)",
        top_heavy: "• Load is Top-Heavy (CoG > 55% height)",

        vol_util: "Vol Utilization",
        items_placed: "Items Placed on this Pallet",
        floor_cov: "Floor Area Covered",
        gen_layers: "Generated Layers",
        gen_walls: "Generated Walls/Slices",
        comp_blocks: "Composite Blocks Formed",
        unplaced: "Total Unplaced Items Across All Pallets",
        inspect_h: "INSPECT LAYER HEIGHT",

        exp_cust: "📄 Export Customer Packing Sheet",
        exp_wh: "📦 Export Warehouse Layer Build Guide",

        save_ws: "Save Active Workspace",
        proj_name: "Project Name (e.g. Q3 Shipment)",
        save_proj: "Save Project Build",
        saved_proj: "Saved Projects",
        no_proj: "No saved projects yet.",
        items: "Items",
        date: "Date",

        // PDF Strings
        pdf_slip: "PACKING LIST",
        pdf_id: "PALLET IDENTIFIER",
        pdf_po: "Purchase Order (PO)",
        pdf_so: "Sales Order (SO)",
        pdf_ship: "SHIPPER / ORIGIN",
        pdf_cons: "CONSIGNEE / SHIP TO",
        pdf_ptype: "PALLET TYPE",
        pdf_gw: "GROSS WEIGHT",
        pdf_th: "TOTAL HEIGHT",
        pdf_vu: "VOL UTILIZATION",
        pdf_manifest: "ITEMIZED PALLET MANIFEST",
        pdf_desc: "Item Description",
        pdf_dims: "Dimensions",
        pdf_uwt: "Unit Wt",
        pdf_qty: "Qty",
        pdf_twt: "Total Wt",
        pdf_totals: "TOTALS",
        pdf_hand: "HANDLING & COMPLIANCE DIRECTIVES:",
        pdf_ispm: "• ISPM 15 Heat-Treated Timber Compliant | 4-Way Forklift Access",
        pdf_dnst: "• DO NOT DOUBLE STACK | Secure with Stretch Wrap and Strapping",
        pdf_tare: "• Pallet Tare Weight: {tare} | Net Cargo Weight: {net}",
        pdf_pby: "PACKED & CHECKED BY",
        pdf_qa: "WAREHOUSE QA APPROVAL",
        pdf_drv: "CARRIER DRIVER RECEIPT",
        pdf_whg: "WAREHOUSE PALLET ASSEMBLY & LAYER GUIDE",
        pdf_layer: "LAYER",
        pdf_base: "Base Height",
        pdf_maxth: "Max Layer Thickness",
        pdf_pcs: "pcs",
        pdf_front: "▲ FORKLIFT FRONT FACING ▲",
        'barrel': 'BARREL',
        'bucket': 'BUCKET',
        'box': 'BOX',
    },
    el: {
        app_title: "LAZAROS KALANTZIS FOODS OE",
        app_sub: "Χωρική Συσκευασία Υψηλής Πυκνότητας",
        sign_in: "Σύνδεση",
        logout: "Αποσύνδεση",
        tab_inv: "Αποθήκη",
        tab_pallet: "Παλέτα & Αλγόριθμος",
        tab_proj: "Έργα",

        define_obj: "1. Ορισμος Νεου Αντικειμενου",
        name: "ΟΝΟΜΑ",
        type: "ΤΥΠΟΣ",
        box: "ΚΙΒΩΤΙΟ",
        barrel: "ΒΑΡΕΛΙ",
        crate: "ΞΥΛΙΝΟ ΚΙΒΩΤΙΟ",
        dia: "ΔΙΑΜΕΤΡΟΣ",
        height: "ΥΨΟΣ",
        weight: "ΒΑΡΟΣ",
        create_btn: "+ Δημιουργία",

        obj_qty: "2. Ποσοτητες Αντικειμενων",
        no_obj: "Δεν έχουν οριστεί αντικείμενα.",
        catalog: "ΚΑΤΑΛΟΓΟΣ",
        custom: "ΠΡΟΣΑΡΜ.",

        opt_algo: "ΑΛΓΟΡΙΘΜΟΣ ΒΕΛΤΙΣΤΟΠΟΙΗΣΗΣ",
        surface: "Μέγιστη Επαφή Επιφάνειας",
        extreme: "Χωρικός Αλγόριθμος Extreme Point 3D",
        interlock: "Διαπλεκόμενη Στρώση (Brick/Pinwheel)",
        wall: "Κάθετη Φέτα / Οικοδόμηση Τοίχου",
        block: "Σύνθετο Ομοιογενές Μπλοκ",

        pal_spec: "ΠΡΟΔΙΑΓΡΑΦΕΣ ΠΑΛΕΤΑΣ",
        over_x: "ΠΡΟΕΞΟΧΗ X",
        over_y: "ΠΡΟΕΞΟΧΗ Y",
        max_h: "ΜΕΓΙΣΤΟ ΥΨΟΣ ΦΟΡΤΙΟΥ",
        min_sup: "ΕΛΑΧΙΣΤΗ ΕΠΙΦΑΝΕΙΑ ΣΤΗΡΙΞΗΣ",
        org_btn: "Οργάνωση Παλέτας",

        pal_x_of_y: "Παλέτα {x} από {y}",
        cargo_w: "Βάρος Φορτίου",
        gross_w: "Μικτό Βάρος (με Παλέτα)",
        cargo_stack_h: "Ύψος Στοίβαξης",
        total_ship_h: "Συνολικό Ύψος Αποστολής",
        deck: "βάση",

        cog: "ΚΕΝΤΡΟ ΒΑΡΟΥΣ (CoG)",
        stable: "🟢 ΣΤΑΘΕΡΟ ΦΟΡΤΙΟ",
        hazard: "⚠️ ΚΙΝΔΥΝΟΣ ΑΝΑΤΡΟΠΗΣ",
        cog_coords: "Συντεταγμένες CoG",
        cog_elev: "Υψόμετρο CoG",
        off_x: "• Έκκεντρο βάρος κατά Πλάτος (X)",
        off_z: "• Έκκεντρο βάρος κατά Μήκος (Z)",
        top_heavy: "• Βαρύ στην κορυφή (CoG > 55%)",

        vol_util: "Χρήση Όγκου",
        items_placed: "Αντικείμενα σε αυτή την Παλέτα",
        floor_cov: "Κάλυψη Επιφάνειας Βάσης",
        gen_layers: "Δημιουργημένες Στρώσεις",
        gen_walls: "Δημιουργημένοι Τοίχοι/Φέτες",
        comp_blocks: "Σύνθετα Μπλοκ",
        unplaced: "Μη Τοποθετημένα Αντικείμενα:",
        inspect_h: "ΕΠΙΘΕΩΡΗΣΗ ΥΨΟΥΣ ΣΤΡΩΣΗΣ",

        exp_cust: "📄 Εξαγωγή Δελτίου Πελάτη (PDF)",
        exp_wh: "📦 Εξαγωγή Οδηγού Αποθήκης (PDF)",

        save_ws: "Αποθήκευση Χώρου Εργασίας",
        proj_name: "Όνομα (π.χ. Αποστολή Q3)",
        save_proj: "Αποθήκευση Έργου",
        saved_proj: "Αποθηκευμένα Έργα",
        no_proj: "Δεν υπάρχουν έργα.",
        items: "Αντικείμενα",
        date: "Ημερομηνία",

        // PDF Strings
        pdf_slip: "ΔΕΛΤΙΟ ΠΑΛΕΤΟΠΟΙΗΣΗΣ",
        pdf_id: "ΑΝΑΓΝΩΡΙΣΤΙΚΟ ΠΑΛΕΤΑΣ",
        pdf_po: "Αρ. Αγοράς (PO)",
        pdf_so: "Αρ. Παραγγελίας (SO)",
        pdf_ship: "ΑΠΟΣΤΟΛΕΑΣ / ΠΡΟΕΛΕΥΣΗ",
        pdf_cons: "ΠΑΡΑΛΗΠΤΗΣ / ΠΡΟΟΡΙΣΜΟΣ",
        pdf_ptype: "ΤΥΠΟΣ ΠΑΛΕΤΑΣ",
        pdf_gw: "ΜΙΚΤΟ ΒΑΡΟΣ",
        pdf_th: "ΣΥΝΟΛΙΚΟ ΥΨΟΣ",
        pdf_vu: "ΧΡΗΣΗ ΟΓΚΟΥ",
        pdf_manifest: "ΑΝΑΛΥΤΙΚΗ ΛΙΣΤΑ ΠΑΛΕΤΑΣ",
        pdf_desc: "Περιγραφή Αντικειμένου",
        pdf_dims: "Διαστάσεις",
        pdf_uwt: "Βάρος Μον.",
        pdf_qty: "Ποσ.",
        pdf_twt: "Συν. Βάρος",
        pdf_totals: "ΣΥΝΟΛΑ",
        pdf_hand: "ΟΔΗΓΙΕΣ ΧΕΙΡΙΣΜΟΥ & ΣΥΜΜΟΡΦΩΣΗΣ:",
        pdf_ispm: "• Συμμόρφωση ISPM 15 | Πρόσβαση Περονοφόρου 4 Κατευθύνσεων",
        pdf_dnst: "• ΜΗΝ ΣΤΟΙΒΑΖΕΤΕ ΔΙΠΛΑ | Ασφαλίστε με Μεμβράνη και Ιμάντες",
        pdf_tare: "• Απόβαρο Παλέτας: {tare} | Καθαρό Βάρος: {net}",
        pdf_pby: "ΣΥΣΚΕΥΑΣΙΑ & ΕΛΕΓΧΟΣ",
        pdf_qa: "ΕΓΚΡΙΣΗ ΠΟΙΟΤΗΤΑΣ",
        pdf_drv: "ΥΠΟΓΡΑΦΗ ΟΔΗΓΟΥ",
        pdf_whg: "ΟΔΗΓΟΣ ΣΥΝΑΡΜΟΛΟΓΗΣΗΣ ΠΑΛΕΤΑΣ",
        pdf_layer: "ΣΤΡΩΣΗ",
        pdf_base: "Υψόμετρο",
        pdf_maxth: "Μέγιστο Πάχος",
        pdf_pcs: "τμχ",
        pdf_front: "▲ ΕΜΠΡΟΣΘΙΑ ΟΨΗ ΠΕΡΟΝΟΦΟΡΟΥ ▲",
        'barrel': 'ΒΑΡΕΛΙ',
        'bucket': 'ΚΟΥΒΑΣ',
        'box': 'ΚΙΒΩΤΙΟ',
    }
};

export function t(lang, key) {
    return dictionary[lang]?.[key] || key;
}

export const PRODUCT_TRANSLATIONS = {
    "J2KBXJPCL": {
        "en": "Kalamata Olive Paste - Regular - Classic - Glass Jar - 100g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ ΚΛΑΣΙΚΗ 100γρ"
    },
    "J2KBXJPRG": {
        "en": "Kalamata Olive Paste - Regular - Oregano - Glass Jar - 100g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ ΜΕ ΡΙΓΑΝΗ 100γρ"
    },
    "J2KBXJPSP": {
        "en": "Kalamata Olive Paste - Regular - Spicy - Glass Jar - 100g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ ΠΙΚΑΝΤΙΚΗ 100γρ"
    },
    "J2KBXJPSR": {
        "en": "Kalamata Olive Paste - Regular - Spirulina - Glass Jar - 100g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ ΣΠΙΡΟΥΛΙΝΑ 100γρ"
    },
    "J3KBXJPCL": {
        "en": "Kalamata Olive Paste - Regular - Classic - Glass Jar - 200g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ ΚΛΑΣΙΚΗ 200γρ"
    },
    "J3KBXJPRG": {
        "en": "Kalamata Olive Paste - Regular - Oregano - Glass Jar - 200g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ ΜΕ ΡΙΓΑΝΗ 200γρ"
    },
    "J3KBXJPSP": {
        "en": "Kalamata Olive Paste - Regular - Spicy - Glass Jar - 200g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ ΠΙΚΑΝΤΙΚΗ 200γρ"
    },
    "J3KBXJPSR": {
        "en": "Kalamata Olive Paste - Regular - Spirulina - Glass Jar - 200g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ ΣΠΙΡΟΥΛΙΝΑ 200γρ"
    },
    "J2KVXJPCL": {
        "en": "Kalamata Olive Paste - Bio - Classic - Glass Jar - 100g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ ΚΛΑΣΙΚΗ 100g ΑΠΟ ΒΙΟΛΟΓΙΚΕΣ ΕΛΙΕΣ"
    },
    "J2KVXJPSR": {
        "en": "Kalamata Olive Paste - Bio - Spirulina - Glass Jar - 100g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ ΣΠΙΡΟΥΛΙΝΑ 100g ΑΠΟ ΒΙΟΛΟΓΙΚΕΣ ΕΛΙΕΣ"
    },
    "J2KVXJPPR": {
        "en": "Kalamata Olive Paste - Bio - Protein - Glass Jar - 100g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ ΜΕ ΠΡΩΤΕΪΝΗ 100g ΑΠΟ ΒΙΟΛΟΓΙΚΕΣ ΕΛΙΕΣ"
    },
    "J2AGXJPCL": {
        "en": "Green Olive Paste - Regular - Classic - Glass Jar - 100g",
        "el": "ΠΑΣΤΑ ΠΡΑΣΙΝΩΝ ΕΛΙΩΝ ΚΛΑΣΙΚΗ 100γρ"
    },
    "J2AGXJPRG": {
        "en": "Green Olive Paste - Regular - Oregano - Glass Jar - 100g",
        "el": "ΠΑΣΤΑ ΠΡΑΣΙΝΩΝ ΕΛΙΩΝ ΡΙΓΑΝΗ 100γρ"
    },
    "J2AGXJPSP": {
        "en": "Green Olive Paste - Regular - Spicy - Glass Jar - 100g",
        "el": "ΠΑΣΤΑ ΠΡΑΣΙΝΩΝ ΕΛΙΩΝ ΠΙΚΑΝΤΙΚΗ 100γρ"
    },
    "J3AGXJPCL": {
        "en": "Green Olive Paste - Regular - Classic - Glass Jar - 200g",
        "el": "ΠΑΣΤΑ ΠΡΑΣΙΝΩΝ ΕΛΙΩΝ ΚΛΑΣΙΚΗ 200γρ"
    },
    "J3AGXJPRG": {
        "en": "Green Olive Paste - Regular - Oregano - Glass Jar - 200g",
        "el": "ΠΑΣΤΑ ΠΡΑΣΙΝΩΝ ΕΛΙΩΝ ΜΕ ΡΙΓΑΝΗ 200γρ"
    },
    "J3AGXJPSP": {
        "en": "Green Olive Paste - Regular - Spicy - Glass Jar - 200g",
        "el": "ΠΑΣΤΑ ΠΡΑΣΙΝΩΝ ΕΛΙΩΝ ΠΙΚΑΝΤΙΚΗ 200γρ"
    },
    "J1KMLGWAS": {
        "en": "Kalamata Olives - Early Harvest - Classic - Glass Jar - 165 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΠΡΩΙΜΕΣ ΓΥΑΛΙ 345g/165g"
    },
    "J1KBLGWKA": {
        "en": "Kalamata Olives - Regular - Classic - Glass Jar - 165 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΠΑΡΑΔΟΣΙΑΚΕΣ ΓΥΑΛΙ 345g/165g"
    },
    "J1KBLGΕKA": {
        "en": "Kalamata Olives - Pitted - Classic - Glass Jar - 130 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΕΚΠΥΡΗΝΩΜΕΝΕΣ ΓΥΑΛΙ 345g/130g"
    },
    "J1KBXJSKA": {
        "en": "Kalamata Olives - Sliced - Classic - Glass Jar - 130 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΦΕΤΕΣ ΓΥΑΛΙ 345g/130g"
    },
    "J1KBLGWRG": {
        "en": "Kalamata Olives - Regular - Oregano - Glass Jar - 165 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΡΙΓΑΝΗ ΓΥΑΛΙ 345g/165g"
    },
    "J1KBLGWBU": {
        "en": "Kalamata Olives - Regular - Bukovo - Glass Jar - 165 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΜΠΟΥΚΟΒΟ ΓΥΑΛΙ 345γρ/165γρ"
    },
    "J1KBLGWHB": {
        "en": "Kalamata Olives - Regular - Herbs & Spices - Glass Jar - 165 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΜΕ ΒΟΤΑΝΑ & ΜΠΑΧΑΡΙΚΑ ΓΥΑΛΙ 345g/165g"
    },
    "J1KBLGWLA": {
        "en": "Kalamata Olives - Less Salt - Classic - Glass Jar - 165 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ 40% ΛΙΓΟΤΕΡΟ ΑΛΑΤΙ ΓΥΑΛΙ 345g/165g"
    },
    "J1KBLGWBO": {
        "en": "Kalamata Olives - Bio - Classic - Glass Jar - 145 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΠΑΡΑΔΟΣΙΑΚΕΣ ΒΙΟΛΟΓΙΚΕΣ ΓΥΑΛΙ 235g/145g"
    },
    "J1AGXJWCL": {
        "en": "Green Olives - Regular - Classic - Glass Jar - 165 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΥΑΛΙ 345g/165g"
    },
    "J1AGXJEKA": {
        "en": "Green Olives - Pitted - Classic - Glass Jar - 130 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΥΑΛΙ ΕΚΠΥΡΗΝΩΜΕΝΕΣ 345g/130g"
    },
    "J1AGXLSKA": {
        "en": "Green Olives - Sliced - Classic - Glass Jar - 130 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΦΕΤΕΣ ΓΥΑΛΙ 345g/130g"
    },
    "J1AGXJWLA": {
        "en": "Green Olives - Less Salt - Classic - Glass Jar - 165 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ 40% ΛΙΓΟΤΕΡΟ ΑΛΑΤΙ ΓΥΑΛΙ 345g/165g"
    },
    "J1AGXJFAL": {
        "en": "Green Olives - Filled With Almonds - Classic - Glass Jar - 120 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΑΜΥΓΔΑΛΑ ΓΥΑΛΙ 235g/120g"
    },
    "J1AGXJFPE": {
        "en": "Green Olives - Filled With Red Pepper - Classic - Glass Jar - 120 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΚΟΚΚΙΝΗ ΠΙΠΕΡΙΑ ΓΥΑΛΙ 235g/120g"
    },
    "J1AGXJFGA": {
        "en": "Green Olives - Filled With Garlic - Classic - Glass Jar - 120 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΣΚΟΡΔΟ ΓΥΑΛΙ 235g/120g"
    },
    "P1KMLGWAS": {
        "en": "Kalamata Olives - Early Harvest - Classic - PET - 420 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΠΡΩΙΜΕΣ PET 730g/420g"
    },
    "P1KBLGWΚΑ": {
        "en": "Kalamata Olives - Regular - Classic - PET - 420 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΠΑΡΑΔΟΣΙΑΚΕΣ PET 730g/420g"
    },
    "P1KBLGEΚΑ": {
        "en": "Kalamata Olives - Pitted - Classic - PET - 360 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΕΚΠΥΡΗΝΩΜΕΝΕΣ PET 750g/360g"
    },
    "P1KBXJSKA": {
        "en": "Kalamata Olives - Sliced - Classic - PET - 360 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΦΕΤΕΣ PET 760g/360g"
    },
    "P1KBLGWBO": {
        "en": "Kalamata Olives - Bio - Classic - PET - 280 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΠΑΡΑΔΟΣΙΑΚΕΣ ΒΙΟΛΟΓΙΚΕΣ PET 540g/280g"
    },
    "P1KALGWCL": {
        "en": "Green Olives - Regular - Classic - PET - 420 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ PET 730g/420g"
    },
    "P1AGXLEKA": {
        "en": "Green Olives - Pitted - Classic - PET - 360 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΕΚΠΥΡΗΝΩΜΕΝΕΣ PET 760g/360g"
    },
    "P1AGXLSKA": {
        "en": "Green Olives - Sliced - Classic - PET - 360 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΦΕΤΕΣ PET 760g/360g"
    },
    "P1AGXJFAL": {
        "en": "Green Olives - Filled With Almonds - Classic - PET - 260 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΑΜΥΓΔΑΛΑ PET 540g/260g"
    },
    "P1AGXJFPE": {
        "en": "Green Olives - Filled With Red Pepper - Classic - PET - 260 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΚΟΚΚΙΝΗ ΠΙΠΕΡΙΑ PET 540g/260g"
    },
    "P1AGXJFGA": {
        "en": "Green Olives - Filled With Garlic - Classic - PET - 260 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΣΚΟΡΔΟ PET 540g/260g"
    },
    "V1KVJMWCL": {
        "en": "Kalamata Olives - Bio - Classic - Vacuum - 235 g",
        "el": "ΒΙΟΛΟΓΙΚΕΣ ΕΛΙΕΣ ΚΑΛΑΜΩΝ VACUUM 235γρ"
    },
    "V1KBLGWHS": {
        "en": "Kalamata Olives - Regular - Herbs & Spices - Vacuum - 250 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΜΕ ΒΟΤΑΝΑ & ΜΠΑΧΑΡΙΚΑ VACUUM 250γρ"
    },
    "V1KBLGEKA": {
        "en": "Kalamata Olives - Pitted - Classic - Vacuum - 210 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΕΚΠΥΡΗΝΩΜΕΝΕΣ VACUUM 210γρ"
    },
    "V1KBGTWCL": {
        "en": "Kalamata Olives - Large - Classic - Vacuum - 200 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΜΕΓΑΛΕΣ VACUUM 200γρ"
    },
    "V1KBXLWCL": {
        "en": "Kalamata Olives - Medium - Classic - Vacuum - 250 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΜΕΣΑΙΕΣ VACUUM 250γρ"
    },
    "V1KBBRWCL": {
        "en": "Kalamata Olives - Small - Classic - Vacuum - 380 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΜΙΚΡΕΣ VACUUM 380γρ (2x190γρ)"
    },
    "V1KMLGWCL": {
        "en": "Kalamata Olives - Early Harvest (Small) - Classic - Vacuum - 380 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΠΡΩΙΜΕΣ ΜΙΚΡΕΣ VACUUM 380g (2x190g)"
    },
    "V1KMJMWCL": {
        "en": "Kalamata Olives - Early Harvest (Large) - Classic - Vacuum - 250 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΠΡΩΙΜΕΣ ΜΕΓΑΛΕΣ VACUUM 250g"
    },
    "V1AGGTWCL": {
        "en": "Green Olives - Large - Classic - Vacuum - 200 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΜΕΓΑΛΕΣ VACUUM 200γρ"
    },
    "V1AGGTWBK": {
        "en": "Green Olives - Large - Bukovo - Vacuum - 200 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΜΕ ΜΠΟΥΚΟΒΟ ΜΕΓΑΛΟ ΜΕΓΕΘΟΣ VACUUM 200γρ"
    },
    "V1AGXJWCL": {
        "en": "Green Olives - Regular - Classic - Vacuum - 250 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ VACUUM 250γρ"
    },
    "V1AGXJWBK": {
        "en": "Green Olives - Regular - Bukovo - Vacuum - 250 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΜΕ ΜΠΟΥΚΟΒΟ VACUUM 250γρ"
    },
    "V1AGXJWRG": {
        "en": "Green Olives - Regular - Oregano - Vacuum - 250 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΡΙΓΑΝΗ & ΘΥΜΑΡΙ VACUUM 250γρ"
    },
    "V1AGXJWPP": {
        "en": "Green Olives - Regular - Pepper - Vacuum - 250 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΚΟΚΚΙΝΗ ΠΙΠΕΡΙΑ ΚΑΙ ΠΑΠΡΙΚΑ VACUUM 250γρ"
    },
    "V1AGXJFAL": {
        "en": "Green Olives - Filled With Almonds - Classic - Vacuum - 130 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΑΜΥΓΔΑΛΑ VACUUM 130γρ"
    },
    "V1AGXJFPE": {
        "en": "Green Olives - Filled With Red Pepper - Classic - Vacuum - 130 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΚΟΚΚΙΝΗ ΠΙΠΕΡΙΑ VACUUM 130γρ"
    },
    "V1AGXJFGA": {
        "en": "Green Olives - Filled With Garlic - Classic - Vacuum - 130 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΣΚΟΡΔΟ VACUUM 130γρ"
    },
    "V1AGBRWCL": {
        "en": "Green Olives - Small - Classic - Vacuum - 380 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΜΙΚΡΕΣ VACUUM 380g (2x190g)"
    },
    "P8KMLGWKA": {
        "en": "Kalamata Olives - Early Harvest - Classic - PET - 600 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΠΡΩΙΜΕΣ 1200g/600g"
    },
    "P8KBLGWKA": {
        "en": "Kalamata Olives - Large - Classic - PET - 600 g",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΕΚΛΕΚΤΕΣ LARGE 1200g/600g"
    },
    "P3KBXJWKA": {
        "en": "Kalamata Olives - Extra Jumbo - Classic - PET - 2 kg",
        "el": "PET ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΕΚΛΕΚΤΕΣ EXTRA JUMBO 3200g/2Kg"
    },
    "P8KBXJPKA": {
        "en": "Kalamata Olive Paste - Regular - Classic - PET - 1000g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ PET ΚΛΑΣΙΚΗ 1000g"
    },
    "P8KBXJPRG": {
        "en": "Kalamata Olive Paste - Regular - Oregano - PET - 1000g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ PET ΜΕ ΡΙΓΑΝΗ 1000g"
    },
    "P8KBXJPSP": {
        "en": "Kalamata Olive Paste - Regular - Spicy - PET - 1000g",
        "el": "ΠΑΣΤΑ ΕΛΙΩΝ ΚΑΛΑΜΩΝ PET ΠΙΚΑΝΤΙΚΗ 1000g"
    },
    "P4KΒLGWKA": {
        "en": "Kalamata Olives - Large - Classic - PET - 3 kg",
        "el": "PET ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΕΚΛΕΚΤΕΣ LARGE 5300g/3Kg"
    },
    "P4KMXJWKA": {
        "en": "Kalamata Olives - Extra Jumbo - Classic - PET - 3 kg",
        "el": "PET ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΕΚΛΕΚΤΕΣ EXTRA JUMBO 5300g/3Kg"
    },
    "P2KMLGWKA": {
        "en": "Kalamata Olives - Early Harvest - Classic - PET - 1 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΠΡΩΙΜΕΣ 1600g/1Kg"
    },
    "P2KBLGWKA": {
        "en": "Kalamata Olives - Large - Classic - PET - 1 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΕΚΛΕΚΤΕΣ LARGE 1600g/1Kg"
    },
    "P2KBXJWKA": {
        "en": "Kalamata Olives - Extra Jumbo - Classic - PET - 1 kg",
        "el": "PET ΕΛΙΕΣ ΚΑΛΑΜΩΝ ΕΚΛΕΚΤΕΣ EXTRA JUMBO 1600g/1Kg"
    },
    "P2KBXLEKA": {
        "en": "Kalamata Olives - Pitted - Classic - PET - 1 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΕΚΠΥΡΗΝΩΜΕΝΕΣ 1600g/1Kg"
    },
    "P2KBLGWBO": {
        "en": "Kalamata Olives - Bio - Classic - PET - 1 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΠΑΡΑΔΟΣΙΑΚΕΣ ΒΙΟΛΟΓΙΚΕΣ 1600g/1Kg"
    },
    "P2AGLGWKA": {
        "en": "Green Olives - Regular - Classic - PET - 1 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ PET 1600g/1Kg"
    },
    "P3KMLGWKA": {
        "en": "Kalamata Olives - Early Harvest - Classic - PET - 2 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΠΡΩΙΜΕΣ 3200g/2Kg"
    },
    "P3KBLGWKA": {
        "en": "Kalamata Olives - Large - Classic - PET - 2 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΕΚΛΕΚΤΕΣ LARGE 3200g/2Kg"
    },
    "P3KBLGWBO": {
        "en": "Kalamata Olives - Bio - Classic - PET - 2 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΠΑΡΑΔΟΣΙΑΚΕΣ ΒΙΟΛΟΓΙΚΕΣ 3200g/2Kg"
    },
    "P3AGLGWCL": {
        "en": "Green Olives - Regular - Classic - PET - 2 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ PET 3200g/2Kg"
    },
    "P4KMLGWKA": {
        "en": "Kalamata Olives - Early Harvest - Classic - PET - 3 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΠΡΩΙΜΕΣ 5300g/3Kg"
    },
    "P4KMLGWBO": {
        "en": "Kalamata Olives - Bio - Classic - PET - 3 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΠΑΡΑΔΟΣΙΑΚΕΣ ΒΙΟΛΟΓΙΚΕΣ 5300g/3Kg"
    },
    "P4AGSCWKA": {
        "en": "Green Olives - Regular - Classic - PET - 3 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ PET 5200g/3Kg"
    },
    "P6KBSPWKA": {
        "en": "Kalamata Olives - Superior - Classic - PET - 3 kg",
        "el": "PET ΕΛΙΕΣ ΚΑΛΑΜΩΝ SUPERIOR 5300g/3Kg"
    },
    "P6KBJMWKA": {
        "en": "Kalamata Olives - Jumbo - Classic - PET - 3 kg",
        "el": "PET ΕΛΙΕΣ ΚΑΛΑΜΩΝ JUMBO 5300g/3Kg"
    },
    "P6KBLGEKA": {
        "en": "Kalamata Olives - Pitted - Classic - PET - 3 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΕΚΠΥΡΗΝΩΜΕΝΕΣ 5200g/3Kg"
    },
    "P6KBXJSKA": {
        "en": "Kalamata Olives - Sliced - Classic - PET - 3 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΦΕΤΕΣ 5200g/3Kg"
    },
    "P6AGXJEKA": {
        "en": "Green Olives - Pitted - Classic - PET - 3 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ PET ΕΚΠΥΡΗΝΩΜΕΝΕΣ 5200g/3Kg"
    },
    "P6AGXJSKA": {
        "en": "Green Olives - Sliced - Classic - PET - 3 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ PET ΦΕΤΕΣ 5200g/3Kg"
    },
    "P6AGXJFAL": {
        "en": "Green Olives - Filled With Almonds - Classic - PET - 3 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΑΜΥΓΔΑΛΑ PET 5300g/3Kg"
    },
    "P6AGXJFPE": {
        "en": "Green Olives - Filled With Red Pepper - Classic - PET - 3 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ PET ΓΕΜΙΣΤΕΣ ΜΕ ΚΟΚΚΙΝΗ ΠΙΠΕΡΙΑ 5300g/3Kg"
    },
    "P6AGXJFGA": {
        "en": "Green Olives - Filled With Garlic - Classic - PET - 3 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΣΚΟΡΔΟ PET 5300g/3Kg"
    },
    "P6KBXJPCL": {
        "en": "Kalamata Olive Paste - Regular - Classic - PET - 4000g",
        "el": "ΠΑΣΤΑ ΕΛΙΑΣ ΚΑΛΑΜΩΝ PET ΚΛΑΣΙΚΗ 4Kg"
    },
    "P6KBXJPRG": {
        "en": "Kalamata Olive Paste - Regular - Oregano - PET - 4000g",
        "el": "ΠΑΣΤΑ ΕΛΙΑΣ ΚΑΛΑΜΩΝ PET ΡΙΓΑΝΗ 4Kg"
    },
    "P6KBXJPSP": {
        "en": "Kalamata Olive Paste - Regular - Spicy - PET - 4000g",
        "el": "ΠΑΣΤΑ ΕΛΙΑΣ ΚΑΛΑΜΩΝ PET ΠΙΚΑΝΤΙΚΗ 4Kg"
    },
    "P6AGXJPCL": {
        "en": "Green Olive Paste - Regular - Classic - PET - 4000g",
        "el": "ΠΑΣΤΑ ΠΡΑΣΙΝΩΝ ΕΛΙΩΝ PET ΚΛΑΣΙΚΗ 4Kg"
    },
    "P5KBSCWKA": {
        "en": "Kalamata Olives - Super Colossal - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET SUPER COLOSSAL 9560g/6Kg"
    },
    "P5KBCLWKA": {
        "en": "Kalamata Olives - Colossal - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET COLOSSAL 9560g/6Kg"
    },
    "P5KBGTWKA": {
        "en": "Kalamata Olives - Giants - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET GIANTS 9560g/6Kg"
    },
    "P5KBXJWKA": {
        "en": "Kalamata Olives - Extra Jumbo - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET EXTRA JUMBO 9560g/6Kg"
    },
    "P5KBJMWKA": {
        "en": "Kalamata Olives - Jumbo - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET JUMBO 9560g/6Kg"
    },
    "P5KBXLWKA": {
        "en": "Kalamata Olives - Extra Large - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET EXTRA LARGE 9560g/6Kg"
    },
    "P5KBLGWKA": {
        "en": "Kalamata Olives - Large - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET LARGE 9560g/6Kg"
    },
    "P5KBSPWKA": {
        "en": "Kalamata Olives - Superior - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET SUPERIOR 9560g/6Kg"
    },
    "P5KBBRWKA": {
        "en": "Kalamata Olives - Brilliant - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET BRILLIANT 9560g/6Kg"
    },
    "P5KBFNWKA": {
        "en": "Kalamata Olives - Fine - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET FINE 9560g/6Kg"
    },
    "P5KMJMWKA": {
        "en": "Kalamata Olives - Early Harvest (Large) - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΠΡΩΙΜΕΣ ΜΕΓΑΛΟ ΜΕΓΕΘΟΣ 9560g/6Kg"
    },
    "P5KMBRWKA": {
        "en": "Kalamata Olives - Early Harvest (Small) - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΠΡΩΙΜΕΣ ΜΙΚΡΟ ΜΕΓΕΘΟΣ 9560g/6Kg"
    },
    "P5KBLGWBO": {
        "en": "Kalamata Olives - Bio - Classic - PET - 6 kg",
        "el": "ΕΛΙΕΣ ΚΑΛΑΜΩΝ PET ΠΑΡΑΔΟΣΙΑΚΕΣ ΒΙΟΛΟΓΙΚΕΣ 9560g/6Kg"
    },
    "P5AGSCWKA": {
        "en": "Green Olives - Regular - Classic - PET - 6 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ PET 9000g/6Kg"
    },
    "P5AGXJFAL": {
        "en": "Green Olives - Filled With Almonds - Classic - PET - 6 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ PET ΓΕΜΙΣΤΕΣ ΜΕ ΑΜΥΓΔΑΛΑ 9000g/6Kg"
    },
    "P5AGXJFPE": {
        "en": "Green Olives - Filled With Red Pepper - Classic - PET - 6 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ PET ΓΕΜΙΣΤΕΣ ΜΕ ΚΟΚΚΙΝΗ ΠΙΠΕΡΙΑ 9000g/6Kg"
    },
    "P5AGXJFGA": {
        "en": "Green Olives - Filled With Garlic - Classic - PET - 6 kg",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ ΓΕΜΙΣΤΕΣ ΜΕ ΣΚΟΡΔΟ PET 9000g/6Kg"
    },
    "LDEVT1": {
        "en": "Extra Virgin Olive Oil - Regular - Classic - Glass Bottle - 250ml",
        "el": "ΕΞΑΙΡΕΤΙΚΟ ΠΑΡΘΕΝΟ ΕΛΑΙΟΛΑΔΟ 250ml"
    },
    "LDEVT2": {
        "en": "Extra Virgin Olive Oil - Regular - Classic - Glass Bottle - 500ml",
        "el": "ΕΞΑΙΡΕΤΙΚΟ ΠΑΡΘΕΝΟ ΕΛΑΙΟΛΑΔΟ 500ml"
    },
    "LDEVT3": {
        "en": "Extra Virgin Olive Oil - Regular - Classic - Glass Bottle - 1L",
        "el": "ΕΞΑΙΡΕΤΙΚΟ ΠΑΡΘΕΝΟ ΕΛΑΙΟΛΑΔΟ 1L"
    },
    "LDEVT4": {
        "en": "Extra Virgin Olive Oil - Regular - Classic - PET - 5L",
        "el": "ΕΞΑΙΡΕΤΙΚΟ ΠΑΡΘΕΝΟ ΕΛΑΙΟΛΑΔΟ 5L"
    },
    "LDEVT5": {
        "en": "Extra Virgin Olive Oil - Regular - Classic - Tin Container - 17 kg",
        "el": "ΕΞΑΙΡΕΤΙΚΟ ΠΑΡΘΕΝΟ ΕΛΑΙΟΛΑΔΟ 17Kg"
    },
    "LDORT1": {
        "en": "Organic EVOO - Bio - Classic - Glass Bottle - 250ml",
        "el": "ΒΙΟΛΟΓΙΚΟ ΕΞΑΙΡΕΤΙΚΟ ΠΑΡΘΕΝΟ ΕΛΑΙΟΛΑΔΟ 250ml"
    },
    "LDORT2": {
        "en": "Organic EVOO - Bio - Classic - Glass Bottle - 500ml",
        "el": "ΒΙΟΛΟΓΙΚΟ ΕΞΑΙΡΕΤΙΚΟ ΠΑΡΘΕΝΟ ΕΛΑΙΟΛΑΔΟ 500ml"
    },
    "LDORT3": {
        "en": "Organic EVOO - Bio - Classic - Glass Bottle - 1L",
        "el": "ΒΙΟΛΟΓΙΚΟ ΕΞΑΙΡΕΤΙΚΟ ΠΑΡΘΕΝΟ ΕΛΑΙΟΛΑΔΟ 1L"
    },
    "LDORT4": {
        "en": "Organic EVOO - Bio - Classic - PET - 5L",
        "el": "ΒΙΟΛΟΓΙΚΟ ΕΞΑΙΡΕΤΙΚΟ ΠΑΡΘΕΝΟ ΕΛΑΙΟΛΑΔΟ 5L"
    },
    "LDORT5": {
        "en": "Organic EVOO - Bio - Classic - Tin Container - 17 kg",
        "el": "ΒΙΟΛΟΓΙΚΟ ΕΞΑΙΡΕΤΙΚΟ ΠΑΡΘΕΝΟ ΕΛΑΙΟΛΑΔΟ 17Kg"
    },
    "P8KALGWCL": {
        "en": "Green Olives - Regular - Classic - PET - 600 g",
        "el": "ΠΡΑΣΙΝΕΣ ΕΛΙΕΣ PET 1200g/600g"
    }
};