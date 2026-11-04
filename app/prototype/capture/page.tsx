import { notFound } from "next/navigation";
import Capture from "@/components/prototype/Capture";

// Development only: renders the loft without overlays so scripts/capture-sequence.mjs
// can record a frame sequence. Returns 404 in production.
export default function CapturePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Capture />;
}
