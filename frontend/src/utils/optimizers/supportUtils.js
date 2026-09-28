// ============================================================================
// STRUCTURAL SUPPORT & SUBSTRATE COMPATIBILITY CHECK
// ============================================================================
export function isSupported(candidate, placed, minSupportFraction = 0.75) {
    if (candidate.y <= 0.1) return true;
    if (!placed || placed.length === 0) return candidate.y <= 0.1;

    const supportingItems = placed.filter(p => Math.abs((p.y + p.h) - candidate.y) < 0.1);
    if (supportingItems.length === 0) return false;

    // Broadened detection to catch pails, buckets, and drums
    const candType = (candidate.type || '').toLowerCase();
    const isCandidateCylinder = candidate.isBarrel || ['barrel', 'container', 'pail', 'bucket', 'drum', 'cylinder'].includes(candType);

    const directCylinders = supportingItems.filter(p => {
        const pType = (p.type || '').toLowerCase();
        return p.isBarrel || ['barrel', 'container', 'pail', 'bucket', 'drum', 'cylinder'].includes(pType);
    });

    // 1. DIRECT CYLINDER-ON-CYLINDER COLUMNAR ALIGNMENT
    if (isCandidateCylinder && directCylinders.length > 0) {
        const candidateCenterX = candidate.x + candidate.w / 2;
        const candidateCenterZ = candidate.z + candidate.l / 2;

        for (let p of directCylinders) {
            const pCenterX = p.x + p.w / 2;
            const pCenterZ = p.z + p.l / 2;

            if (Math.abs(pCenterX - candidateCenterX) < 15 && Math.abs(pCenterZ - candidateCenterZ) < 15) {
                return true;
            }
        }
        return false; // Cylinders must sit directly on matching cylinders below
    }

    // 2. FLAT SURFACE SUPPORT CHECK
    const numericMinSupport = Number(minSupportFraction) || 0.75;
    const normalizedMinSupport = numericMinSupport > 1 ? numericMinSupport / 100 : numericMinSupport;
    const effectiveMinSupport = Math.max(0, normalizedMinSupport - 0.005);

    const itemArea = candidate.w * candidate.l;
    let supportedArea = 0;

    for (let p of supportingItems) {
        const overlapX = Math.max(0, Math.min(candidate.x + candidate.w, p.x + p.w) - Math.max(candidate.x, p.x));
        const overlapZ = Math.max(0, Math.min(candidate.z + candidate.l, p.z + p.l) - Math.max(candidate.z, p.z));

        if (overlapX > 0 && overlapZ > 0) {
            supportedArea += overlapX * overlapZ;
        }
    }

    return (supportedArea / itemArea) >= effectiveMinSupport;
}