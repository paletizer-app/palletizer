import React from 'react';
import { Box } from '@react-three/drei';

export function PalletAccessories3D({ palletSpec, packedData, accessories, palletHeight }) {
    if (!packedData || !accessories) return null;

    const { width: W, length: L } = palletSpec;
    const maxCargoHeight = packedData.resultingHeight || 0;
    const halfW = W / 2;
    const halfL = L / 2;

    if (maxCargoHeight <= 0) return null;

    const VISUAL_SHEET_THICKNESS = 10;

    return (
        <group position={[0, palletHeight, 0]}>

            {/* CORNER POSTS */}
            {accessories.useCornerPosts && (
                <>
                    <CornerPost x={-halfW + 2} z={halfL - 2} h={maxCargoHeight} rotY={0} />
                    <CornerPost x={halfW - 2} z={halfL - 2} h={maxCargoHeight} rotY={Math.PI / 2} />
                    <CornerPost x={halfW - 2} z={-halfL + 2} h={maxCargoHeight} rotY={Math.PI} />
                    <CornerPost x={-halfW + 2} z={-halfL + 2} h={maxCargoHeight} rotY={-Math.PI / 2} />
                </>
            )}

            {/* GENERATED SLIP SHEETS */}
            {packedData.slipSheets && packedData.slipSheets.map((sheet, idx) => (
                <Box
                    key={`sheet-${idx}`}
                    args={[W, VISUAL_SHEET_THICKNESS, L]}
                    position={[0, sheet.y + (VISUAL_SHEET_THICKNESS / 2), 0]}
                >
                    <meshStandardMaterial color="#c28e5c" roughness={1.0} />
                </Box>
            ))}
        </group>
    );
}

function CornerPost({ x, z, h, rotY }) {
    const flange = 50;
    const thick = 8;

    return (
        <group position={[x, h / 2, z]} rotation={[0, rotY, 0]}>
            <Box args={[flange, h, thick]} position={[flange/2 - thick/2, 0, 0]}>
                <meshStandardMaterial color="#854d0e" roughness={0.9} />
            </Box>
            <Box args={[thick, h, flange]} position={[0, 0, -flange/2 + thick/2]}>
                <meshStandardMaterial color="#854d0e" roughness={0.9} />
            </Box>
        </group>
    );
}