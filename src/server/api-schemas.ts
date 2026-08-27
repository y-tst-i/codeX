import { z } from "zod";

const teamIdSchema = z.enum(["A", "B"]);
const statKeySchema = z.enum(["protection", "drainage", "access", "lifeline"]);
const statsSchema = z.object({
  protection: z.number(),
  drainage: z.number(),
  access: z.number(),
  lifeline: z.number()
}).strict();

const normalActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("beach") }).strict(),
  z.object({ kind: z.literal("yard"), productId: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("grc"), productId: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("build"), stat: statKeySchema }).strict(),
  z.object({ kind: z.literal("install"), productId: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("wait") }).strict()
]);

const answerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("starter"), productId: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("tutorialBuild"), stat: statKeySchema }).strict(),
  z.object({ kind: z.literal("day2"), choice: z.enum(["parts", "sensor"]) }).strict(),
  z.object({ kind: z.literal("day4"), choice: z.enum(["data", "cargo"]) }).strict(),
  z.object({ kind: z.literal("normalAction"), action: normalActionSchema }).strict(),
  z.object({ kind: z.literal("finalChoice"), emergencyProductId: z.string().min(1).nullable() }).strict()
]);

const manualPatchSchema = z.object({
  hpInternal: z.number().optional(),
  stats: statsSchema.optional(),
  materials: z.number().optional(),
  ownedNormalProductIds: z.array(z.string()).optional(),
  installedNormalProductIds: z.array(z.string()).optional(),
  installedGrcProductIds: z.array(z.string()).optional(),
  grcAcquiredCount: z.number().optional(),
  emergencyInstallUsed: z.boolean().optional()
}).strict();

const hostCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SUBMIT_ANSWER"), teamId: teamIdSchema, answer: answerSchema }).strict(),
  z.object({ type: z.literal("ADVANCE") }).strict(),
  z.object({ type: z.literal("PAUSE") }).strict(),
  z.object({ type: z.literal("RESUME") }).strict(),
  z.object({ type: z.literal("TIMER_START") }).strict(),
  z.object({ type: z.literal("TIMER_STOP") }).strict(),
  z.object({ type: z.literal("TIMER_RESET"), seconds: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal("TIMER_ADJUST"), deltaSeconds: z.number().int() }).strict(),
  z.object({
    type: z.literal("MANUAL_CORRECTION"),
    teamId: teamIdSchema,
    patch: manualPatchSchema,
    stateId: z.string().optional()
  }).strict(),
  z.object({ type: z.literal("UNDO") }).strict()
]);

export const hostCommandEnvelopeSchema = z.object({
  commandId: z.string().min(8).max(100),
  revision: z.number().int().nonnegative(),
  command: hostCommandSchema
}).strict();

const teamSetupSchema = z.object({
  islandName: z.string().min(1).max(40),
  memberNames: z.array(z.string().min(1).max(30)).min(3).max(4)
}).strict();

export const createGameRequestSchema = z.object({
  seed: z.string().min(1).max(100).optional(),
  teams: z.object({ A: teamSetupSchema, B: teamSetupSchema }).strict()
}).strict();
