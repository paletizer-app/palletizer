import React from 'react';

export function CogMarker3D({ cogX, cogY, cogZ, isStable }) {
    if (isNaN(cogX) || isNaN(cogY) || isNaN(cogZ)) return null;

    // Green if stable, Bright Red if imbalanced
    const markerColor = isStable ? '#10b981' : '#ef4444';

    return (
        <group position={[cogX, cogY, cogZ]}>
            {/* The inner core sphere */}
            <mesh>
                <sphereGeometry args={[40, 32, 32]} />
                <meshStandardMaterial color={markerColor} emissive={markerColor} emissiveIntensity={0.5} roughness={0.2} />
            </mesh>

            {/* The outer transparent halo for visibility */}
            <mesh>
                <sphereGeometry args={[55, 16, 16]} />
                <meshBasicMaterial color={markerColor} transparent={true} opacity={0.3} wireframe={true} />
            </mesh>

            {/* Crosshairs to pinpoint exact center */}
            <mesh position={[0, 60, 0]}>
                <cylinderGeometry args={[2, 2, 120]} />
                <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[60, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[2, 2, 120]} />
                <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0, 60]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2, 2, 120]} />
                <meshBasicMaterial color="#ffffff" />
            </mesh>
        </group>
    );
}