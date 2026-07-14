import type { BrokenImageRecord, Finding } from "@/shared/types";
import { severityForBrokenImage } from "../findings/severity";

export const CHECK_ID = "broken-image-check";

export function runBrokenImageCheck(images: BrokenImageRecord[], nextId: () => string): Finding[] {
  return images.map((img) => ({
    id: nextId(),
    category: "broken-image" as const,
    severity: severityForBrokenImage(),
    title: "Image failed to load",
    description: `Image with source "${img.src}" reported zero natural width after loading completed.`,
    pageUrl: img.pageUrl,
    selector: img.selector,
    reproductionSteps: [`Open ${img.pageUrl}`, `Inspect image element ${img.selector}`],
    evidenceRefs: ["screenshots/initial.png"],
    timestamp: img.timestamp,
    confidence: 0.9,
    checkId: CHECK_ID,
  }));
}
