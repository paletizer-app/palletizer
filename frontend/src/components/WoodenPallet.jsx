import React, { useMemo } from 'react';
import { CanvasTexture, MeshStandardMaterial, RepeatWrapping } from 'three';

// --- PALLET STRUCTURAL SPECIFICATIONS (in mm) ---
const PALLET_CONFIGS = {
    eur: { // EPAL 1 EUR Pallet (1200 x 800 x 144 mm)
        width: 1200,   // X-axis length
        length: 800,   // Z-axis width
        height: 144,   // Total height
        topBoards: [
            { width: 145, zPos: -327.5 }, // Outer top
            { width: 100, zPos: -185 },   // Intermediate
            { width: 145, zPos: 0 },      // Center
            { width: 100, zPos: 185 },    // Intermediate
            { width: 145, zPos: 327.5 }   // Outer top
        ],
        crossBoards: 3, // 800mm length across Z
        blocks: { xSize: 145, zSize: 100, height: 78, centerZSize: 145 },
        bottomBoards: [
            { width: 100, zPos: -350 },
            { width: 145, zPos: 0 },
            { width: 100, zPos: 350 }
        ]
    },
    iso: { // EPAL 3 ISO Industrial Pallet (1200 x 1000 x 144 mm)
        width: 1200,
        length: 1000,
        height: 144,
        topBoards: [
            { width: 145, zPos: -427.5 },
            { width: 100, zPos: -285 },
            { width: 100, zPos: -142.5 },
            { width: 145, zPos: 0 },
            { width: 100, zPos: 142.5 },
            { width: 100, zPos: 285 },
            { width: 145, zPos: 427.5 }
        ],
        crossBoards: 3,
        blocks: { xSize: 145, zSize: 145, height: 78, centerZSize: 145 },
        bottomBoards: [
            { width: 145, zPos: -427.5 },
            { width: 145, zPos: 0 },
            { width: 145, zPos: 427.5 }
        ]
    },
    us: { // US Standard Block Pallet (1219 x 1016 x 144 mm)
        width: 1219,
        length: 1016,
        height: 144,
        topBoards: [
            { width: 140, zPos: -438 },
            { width: 89, zPos: -292 },
            { width: 89, zPos: -146 },
            { width: 140, zPos: 0 },
            { width: 89, zPos: 146 },
            { width: 89, zPos: 292 },
            { width: 140, zPos: 438 }
        ],
        crossBoards: 3,
        blocks: { xSize: 140, zSize: 100, height: 78, centerZSize: 140 },
        bottomBoards: [
            { width: 140, zPos: -438 },
            { width: 140, zPos: 0 },
            { width: 140, zPos: 438 }
        ]
    }
};

export function WoodenPallet({ type = 'eur' }) {
    const config = PALLET_CONFIGS[type] || PALLET_CONFIGS.eur;
    const boardThickness = 22;
    const blockHeight = 78;

    // --- PROCEDURAL WOOD TEXTURES & MATERIALS ---
    const materials = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#b48356';
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#8f6037';
        for (let i = 0; i < 400; i++) {
            const y = Math.random() * 512;
            const h = Math.random() * 2 + 0.5;
            ctx.globalAlpha = Math.random() * 0.15 + 0.05;
            ctx.fillRect(0, y, 512, h);
        }

        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#5c3a1e';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(Math.random() * 512, Math.random() * 512, 80, 20, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Use named imports instead of THREE. namespace
        const texture = new CanvasTexture(canvas);
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;

        const baseMaterial = new MeshStandardMaterial({
            map: texture,
            roughness: 0.75,
            metalness: 0.05,
            color: '#cfa276'
        });

        const blockMaterial = new MeshStandardMaterial({
            map: texture,
            roughness: 0.85,
            metalness: 0.02,
            color: '#b08154'
        });

        return { baseMaterial, blockMaterial };
    }, []);

    const bottomY = boardThickness / 2;
    const blockY = boardThickness + (blockHeight / 2);
    const crossY = boardThickness + blockHeight + (boardThickness / 2);
    const topY = boardThickness + blockHeight + boardThickness + (boardThickness / 2);

    const xPositions = [
        -(config.width / 2) + (config.blocks.xSize / 2),
        0,
        (config.width / 2) - (config.blocks.xSize / 2)
    ];

    return (
        <group position={[0, 0, 0]}>
            {config.bottomBoards.map((b, idx) => (
                <group key={`bottom-${idx}`} position={[0, bottomY, b.zPos]}>
                    <mesh material={materials.baseMaterial} castShadow receiveShadow>
                        <boxGeometry args={[config.width, boardThickness, b.width]} />
                    </mesh>
                </group>
            ))}

            {xPositions.map((x, xIdx) => (
                <group key={`block-row-${xIdx}`}>
                    {config.bottomBoards.map((b, zIdx) => {
                        const zSize = (xIdx === 1 && zIdx === 1) ? config.blocks.centerZSize : config.blocks.zSize;
                        return (
                            <mesh
                                key={`block-${xIdx}-${zIdx}`}
                                position={[x, blockY, b.zPos]}
                                material={materials.blockMaterial}
                                castShadow
                                receiveShadow
                            >
                                <boxGeometry args={[config.blocks.xSize, blockHeight, zSize]} />
                            </mesh>
                        );
                    })}
                </group>
            ))}

            {xPositions.map((x, idx) => (
                <mesh
                    key={`cross-${idx}`}
                    position={[x, crossY, 0]}
                    material={materials.baseMaterial}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={[config.blocks.xSize, boardThickness, config.length]} />
                </mesh>
            ))}

            {config.topBoards.map((board, idx) => (
                <mesh
                    key={`top-${idx}`}
                    position={[0, topY, board.zPos]}
                    material={materials.baseMaterial}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={[config.width, boardThickness, board.width]} />
                </mesh>
            ))}

            <mesh position={[0, blockY, (config.length / 2) - 1]} rotation={[0, 0, 0]}>
                <planeGeometry args={[90, 45]} />
                <meshBasicMaterial color="#3a2312" transparent opacity={0.65} />
            </mesh>
        </group>
    );
}