import { z } from "zod";
import { FINDING_CATEGORIES, SEVERITIES } from "@/shared/types";

export const findingSchema = z.object({
  id: z.string().min(1),
  category: z.enum(FINDING_CATEGORIES),
  severity: z.enum(SEVERITIES),
  title: z.string().min(1),
  description: z.string().min(1),
  pageUrl: z.string().min(1),
  selector: z.string().optional(),
  reproductionSteps: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  timestamp: z.string(),
  confidence: z.number().min(0).max(1),
  checkId: z.string().min(1),
});

export const auditEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  timestamp: z.string(),
  type: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

export const evidenceManifestEntrySchema = z.object({
  path: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.number().int().nonnegative(),
  contentType: z.string().min(1),
});

export const proofBundleSchema = z.object({
  schemaVersion: z.string(),
  runId: z.string().min(1),
  target: z.object({
    requestedUrl: z.string(),
    normalizedUrl: z.string(),
    host: z.string(),
    protocol: z.string(),
  }),
  startedAt: z.string(),
  completedAt: z.string(),
  status: z.string(),
  environment: z.object({
    node: z.string(),
    playwright: z.string(),
    os: z.string(),
    arch: z.string(),
    mode: z.enum(["demo", "ai-assisted"]),
  }),
  executedChecks: z.array(z.string()),
  eventCount: z.number().int().nonnegative(),
  findingCount: z.number().int().nonnegative(),
  evidence: z.array(evidenceManifestEntrySchema),
  eventStreamHash: z.string().regex(/^[a-f0-9]{64}$/),
  rootHash: z.string().regex(/^[a-f0-9]{64}$/),
  verification: z.object({
    instructions: z.string(),
    command: z.string(),
  }),
});

export type ProofBundleParsed = z.infer<typeof proofBundleSchema>;

export const PROOF_SCHEMA_VERSION = "1.0.0";
