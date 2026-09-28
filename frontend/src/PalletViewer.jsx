import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export default function PalletViewer({ packedItems, visibleHeight }) {
    return (
        <Canvas camera={{ position: [1500, 1000, 1500], fov: 50 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[1000, 1000, 500]} intensity={1} />

            {/* Wooden Pallet Base (EUR 1200x800) */}
            <mesh position={[0, -72.5, 0]}>
                <boxGeometry args={[1200, 145, 800]} />
                <meshStandardMaterial color="#8b5a2b" />
            </mesh>

            {/* Packed Items */}
            {packedItems
                .filter(item => item.y <= visibleHeight)
                .map((item, index) => (
                    <mesh
                        key={index}
                        position={[item.x, item.y + item.height / 2, item.z]}
                    >
                        <boxGeometry args={[item.width, item.height, item.length]} />
                        <meshStandardMaterial color={item.color || "orange"} />
                    </mesh>
                ))}

            <OrbitControls makeDefault />
        </Canvas>
    );
}