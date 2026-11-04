import type { Metadata } from "next";
import Prototype from "@/components/prototype/Prototype";

export const metadata: Metadata = {
  title: "Prototype",
  description: "A prototype chapter: big content, scroll-played 3D and transitions.",
  robots: { index: false },
};

export default function PrototypePage() {
  return <Prototype />;
}
