import { z } from "zod";

export const LANGUAGES = ["pl", "en", "nl"] as const;
export type ReportLanguage = (typeof LANGUAGES)[number];

export const FetchStatusSchema = z.enum(["ok", "manual", "failed", "thin"]);

export const ScoutContextSchema = z.object({
  url: z.string().max(2048),
  fetchStatus: FetchStatusSchema,
  detectedLanguage: z.string().max(12),
  businessType: z.string().max(200),
  whatThisSiteDoes: z.string().max(600),
  offerClarity: z.enum(["low", "medium", "high"]),
  firstImpression: z.string().max(600),
  visibleCTA: z.array(z.string().max(120)).max(20),
  contactFound: z.boolean(),
  trustSignals: z.array(z.string().max(120)).max(20),
  obviousProblems: z.array(z.string().max(300)).max(20),
  recommendedAuditFocus: z.array(z.string().max(120)).max(12),
  limitations: z.array(z.string().max(300)).max(10),
  page: z.object({
    title: z.string().max(300),
    metaDescription: z.string().max(500),
    h1: z.array(z.string().max(300)).max(5),
    headings: z.array(z.string().max(300)).max(20),
    textLength: z.number().int().nonnegative(),
    textExcerpt: z.string().max(6000),
    hasStructuredData: z.boolean(),
    hasViewport: z.boolean(),
  }),
});
export type ScoutContext = z.infer<typeof ScoutContextSchema>;

export const OperatorInputSchema = z.object({
  companyName: z.string().max(200).optional(),
  industry: z.string().max(200).optional(),
  language: z.enum(LANGUAGES).default("pl"),
  notes: z.string().max(2000).optional(),
});
export type OperatorInput = z.infer<typeof OperatorInputSchema>;

export const ScoutRequestSchema = OperatorInputSchema.extend({
  url: z.string().max(2048).optional(),
  html: z.string().max(1_500_000).optional(),
  text: z.string().max(200_000).optional(),
}).refine((v) => v.url || v.html || v.text, { message: "Provide url, html or text" });
export type ScoutRequest = z.infer<typeof ScoutRequestSchema>;

export const ScoreBreakdownItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  points: z.number(),
  max: z.number(),
});

export const NarrativeSchema = z.object({
  executiveSummary: z.string(),
  whatCompanyOffers: z.string(),
  conversionBlockers: z.array(z.string()),
  seoContentIssues: z.array(z.string()),
  trustGaps: z.array(z.string()),
  quickWins: z.array(z.string()),
  improvementPlan: z.array(z.object({ step: z.string(), why: z.string() })),
  clientMessage: z.string(),
});
export type Narrative = z.infer<typeof NarrativeSchema>;

export const AuditReportSchema = NarrativeSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  url: z.string(),
  companyName: z.string().optional(),
  language: z.enum(LANGUAGES),
  score: z.number().int().min(0).max(100),
  scoreBreakdown: z.array(ScoreBreakdownItemSchema),
  source: z.enum(["ai", "template"]),
  model: z.string().optional(),
  warnings: z.array(z.string()),
  limitations: z.array(z.string()),
  scout: ScoutContextSchema,
});
export type AuditReport = z.infer<typeof AuditReportSchema>;

export const AuditRequestSchema = OperatorInputSchema.extend({
  scout: ScoutContextSchema,
});
export type AuditRequest = z.infer<typeof AuditRequestSchema>;
