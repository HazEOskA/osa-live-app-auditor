import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildUserPrompt, SYSTEM_PROMPT } from "./promptBuilder";
import { computeScore } from "./scoring";
import { buildTemplateNarrative } from "./templateNarrative";
import {
  AuditReportSchema,
  NarrativeSchema,
  type AuditReport,
  type AuditRequest,
  type Narrative,
} from "./schemas";

export const DEFAULT_MODEL = "claude-opus-5-5";

export interface AuditEngineOptions {
  /** Injected in tests. When omitted, a client is created if ANTHROPIC_API_KEY is set. */
  client?: Pick<Anthropic, "messages"> | null;
  model?: string;
  now?: () => Date;
  makeId?: () => string;
}

function resolveClient(opts: AuditEngineOptions): Pick<Anthropic, "messages"> | null {
  if (opts.client !== undefined) return opts.client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ timeout: 45_000, maxRetries: 1 });
}

/** Score is deterministic (scoring.ts); only the narrative may come from the model. */
export async function runAuditEngine(req: AuditRequest, opts: AuditEngineOptions = {}): Promise<AuditReport> {
  const { scout } = req;
  const language = req.language ?? "pl";
  const { score, breakdown } = computeScore(scout, language);
  const model = opts.model ?? (process.env.AUDIT_MODEL?.trim() || DEFAULT_MODEL);
  const warnings: string[] = [];

  let narrative: Narrative | null = null;
  let source: AuditReport["source"] = "template";

  const client = resolveClient(opts);
  if (client) {
    try {
      narrative = await generateNarrative(client, model, req, score, breakdown);
      source = "ai";
    } catch (e) {
      warnings.push(`AI narrative unavailable, template used (${e instanceof Error ? e.message : "unknown error"}).`);
    }
  } else {
    warnings.push("No ANTHROPIC_API_KEY configured: template audit generated (score and facts are real, wording is generic).");
  }
  if (!narrative) narrative = buildTemplateNarrative(scout, score, { companyName: req.companyName, language });

  const report: AuditReport = {
    ...narrative,
    id: opts.makeId ? opts.makeId() : crypto.randomUUID(),
    createdAt: (opts.now ?? (() => new Date()))().toISOString(),
    url: scout.url,
    companyName: req.companyName,
    language,
    score,
    scoreBreakdown: breakdown,
    source,
    model: source === "ai" ? model : undefined,
    warnings,
    limitations: scout.limitations,
    scout,
  };
  return AuditReportSchema.parse(report);
}

async function generateNarrative(
  client: Pick<Anthropic, "messages">,
  model: string,
  req: AuditRequest,
  score: number,
  breakdown: ReturnType<typeof computeScore>["breakdown"],
): Promise<Narrative> {
  let lastError = "no output";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.messages.parse({
      model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(req.scout, score, breakdown, req) }],
      output_config: { effort: "low", format: zodOutputFormat(NarrativeSchema) },
    });
    if (res.stop_reason === "refusal") throw new Error("model declined the request");
    const parsed = NarrativeSchema.safeParse(res.parsed_output);
    if (parsed.success) return parsed.data;
    lastError = "invalid structured output";
  }
  throw new Error(lastError);
}
