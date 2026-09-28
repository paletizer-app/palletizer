import React from 'react';
import * as THREE from 'three';

const DISTINCT_COLORS = [
    '#38bdf8', '#f59e0b', '#10b981', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'
];

export function PackedItem3D({ item }) {
    if (!item) return null;

    const {
        x = 0, y = 0, z = 0,
        length = 300, width = 200, height = 150,
        color, id = '', cargoId = '', type = 'box', isBarrel = false, diameter
    } = item;

    // Direct mapping from optimizer output:
    // width  = X-axis dimension (left-right)
    // height = Y-axis dimension (up-down)
    // length = Z-axis dimension (front-back)
    const boxW = Number(width) || 200;
    const boxH = Number(height) || 150;
    const boxL = Number(length) || 300;

    const posX = Number(x) || 0;
    const posY = Number(y) || 0;
    const posZ = Number(z) || 0;

    // Y position center calculation
    const centerY = posY + (boxH / 2);

    // Pick distinct color by product/cargo ID
    const colorKey = cargoId || id || `${boxW}-${boxL}-${boxH}`;
    let boxColor = color;
    if (!boxColor || boxColor === '#38bdf8') {
        let hash = 0;
        for (let i = 0; i < colorKey.length; i++) {
            hash = colorKey.charCodeAt(i) + ((hash << 5) - hash);
        }
        boxColor = DISTINCT_COLORS[Math.abs(hash) % DISTINCT_COLORS.length];
    }

    // Determine if item is cylindrical/bucket/pet/container
    const packType = String(type).toLowerCase();
    const isCylindrical = type === 'barrel' || type === 'container';

    // 1. RENDER PLASTIC BUCKET MESH (SMOOTH SURFACES - ZERO VERTICAL LINES)
    if (isCylindrical) {
        const radiusTop = (Number(diameter) || Math.min(boxW, boxL)) / 2;
        const radiusBottom = radiusTop * 0.88; // Downward taper for bucket shape
        const bodyHeight = boxH * 0.88;
        const rimHeight = boxH * 0.12;
        const rimRadiusTop = radiusTop * 1.04;
        const rimRadiusBottom = radiusTop * 1.02;

        return (
            <group position={[posX, centerY, posZ]}>
                {/* A. Main Tapered Bucket Body */}
                <mesh position={[0, -boxH * 0.06, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[radiusTop, radiusBottom, bodyHeight, 32]} />
                    <meshStandardMaterial
                        color={boxColor}
                        roughness={0.25}
                        metalness={0.08}
                    />
                </mesh>

                {/* B. Upper Overhanging Rim / Collar */}
                <mesh position={[0, (boxH / 2) - (rimHeight / 2), 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[rimRadiusTop, rimRadiusBottom, rimHeight, 32]} />
                    <meshStandardMaterial
                        color={boxColor}
                        roughness={0.2}
                        metalness={0.12}
                    />
                </mesh>

                {/* C. Top Lid Surface */}
                <mesh position={[0, (boxH / 2) + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[rimRadiusTop * 0.96, 32]} />
                    <meshStandardMaterial
                        color="#f8fafc"
                        roughness={0.3}
                        metalness={0.05}
                    />
                </mesh>

                {/* D. Inner Lid Ring Detail */}
                <mesh position={[0, (boxH / 2) + 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[rimRadiusTop * 0.70, rimRadiusTop * 0.78, 32]} />
                    <meshBasicMaterial color="#cbd5e1" />
                </mesh>

                {/* E. Clean Top Rim Circle Outline */}
                <mesh position={[0, (boxH / 2) + 1.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[rimRadiusTop - 0.6, rimRadiusTop + 0.6, 64]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>

                {/* F. Collar Bottom Ring Outline */}
                <mesh position={[0, (boxH / 2) - rimHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[rimRadiusBottom - 0.5, rimRadiusBottom + 0.5, 64]} />
                    <meshBasicMaterial color="#0f172a" opacity={0.6} transparent />
                </mesh>

                {/* G. Base Bottom Ring Outline */}
                <mesh position={[0, -boxH / 2 + 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radiusBottom - 0.5, radiusBottom + 0.5, 64]} />
                    <meshBasicMaterial color="#0f172a" opacity={0.4} transparent />
                </mesh>
            </group>
        );
    }

    // 2. RENDER RECTANGULAR CARDBOARD BOX MESH
    const isLongAlongX = boxW >= boxL;
    const tapeWidth = Math.max(14, (isLongAlongX ? boxL : boxW) * 0.22);
    const tapeArgs = isLongAlongX ? [boxW - 2, tapeWidth] : [tapeWidth, boxL - 2];
    const seamArgs = isLongAlongX ? [boxW - 4, 1.5] : [1.5, boxL - 4];

    return (
        <group position={[posX, centerY, posZ]}>
            {/* Solid Cardboard Box Mesh */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[boxW, boxH, boxL]} />
                <meshStandardMaterial color={boxColor} roughness={0.4} metalness={0.05} />
            </mesh>

            {/* Top Seam Line */}
            <mesh position={[0, (boxH / 2) + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={seamArgs} />
                <meshBasicMaterial color="#0f172a" opacity={0.65} transparent />
            </mesh>

            {/* Top Packing Tape Strip */}
            <mesh position={[0, (boxH / 2) + 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={tapeArgs} />
                <meshStandardMaterial color="#d97706" roughness={0.2} transparent opacity={0.9} />
            </mesh>

            {/* Clean Outer Edges */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(boxW + 0.4, boxH + 0.4, boxL + 0.4)]} />
                <lineBasicMaterial color="#000000" linewidth={1.5} />
            </lineSegments>
        </group>
    );
}