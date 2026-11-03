"use client";

import { Center, Text3D } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";

export const BLOCK_FONT = "/fonts/archivo-black.typeface.json";

/** Big extruded "monument" letters standing on the ground. */
export function Letters({
  text,
  size = 4,
  depth = 1.4,
  color = "#c4525a",
  ...props
}: ThreeElements["group"] & { text: string; size?: number; depth?: number; color?: string }) {
  return (
    <group {...props}>
      <Center disableY>
        <Text3D
          font={BLOCK_FONT}
          size={size}
          height={depth}
          letterSpacing={size * 0.04}
          curveSegments={4}
          bevelEnabled
          bevelSize={size * 0.012}
          bevelThickness={size * 0.02}
          bevelSegments={1}
          castShadow
          receiveShadow
        >
          {text}
          <meshStandardMaterial color={color} roughness={0.65} />
        </Text3D>
      </Center>
    </group>
  );
}
