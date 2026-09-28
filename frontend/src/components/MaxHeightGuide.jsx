import React from 'react';
import * as THREE from 'three';

export function MaxHeightGuide({ width, length, maxHeight }) {
    return (
        <group position={[0, maxHeight / 2, 0]}>
            {/* Clean rectangular guide frame without sky-crossing diagonal lines */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(width, maxHeight, length)]} />
                <lineBasicMaterial color="#38bdf8" opacity={0.35} transparent linewidth={1} />
            </lineSegments>
        </group>
    );
}