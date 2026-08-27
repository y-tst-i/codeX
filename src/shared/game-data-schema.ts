import { z } from "zod";

const statsSchema = z.object({
  protection: z.number().int().nonnegative(),
  drainage: z.number().int().nonnegative(),
  access: z.number().int().nonnegative(),
  lifeline: z.number().int().nonnegative()
});

const statDeltaSchema = z.object({
  protection: z.number().int().optional(),
  drainage: z.number().int().optional(),
  access: z.number().int().optional(),
  lifeline: z.number().int().optional()
});

const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["normal", "grc"]),
  statDelta: statDeltaSchema,
  hpRecovery: z.number().int().nonnegative(),
  preparedReductionPhase: z.string().nullable(),
  preparedReduction: z.number().int().nonnegative(),
  autoInstallOnAcquire: z.boolean(),
  starter: z.boolean()
});

export const gameDataSchema = z.object({
  version: z.literal("0.30.1"),
  designVersion: z.literal("0.30"),
  sessionRules: z.object({
    teamCount: z.literal(2),
    minPlayersPerTeam: z.number().int().min(1),
    maxPlayersPerTeam: z.number().int().min(1),
    maxParticipants: z.number().int().min(2)
  }),
  limits: z.object({
    statMax: z.number().int().positive(),
    hpMax: z.number().int().positive(),
    normalActionsPerDay: z.number().int().positive(),
    normalDays: z.array(z.number().int()).min(1),
    hpDisplayMin: z.number().int()
  }),
  initial: z.object({
    hp: z.number().int(),
    materials: z.number().int().nonnegative(),
    stats: statsSchema,
    tutorialPracticeMaterials: z.number().int().nonnegative(),
    tutorialBuildIncrement: z.number().int().positive()
  }),
  actions: z.object({
    beachExplore: z.object({ materialsDelta: z.number().int() }),
    build: z.object({
      materialsCost: z.number().int().nonnegative(),
      statIncrement: z.number().int().positive()
    })
  }),
  yard: z.object({ visibleCount: z.number().int().positive() }),
  grc: z.object({
    availableDays: z.array(z.number().int()),
    visibleCount: z.number().int().positive(),
    acquireMax: z.number().int().positive()
  }),
  products: z.array(productSchema).min(1),
  typhoons: z.record(
    z.enum(["heavy_rain", "coastal", "mountain"]),
    z.object({ name: z.string(), requirements: statsSchema })
  ),
  damageByShortage: z.object({
    "0": z.number().int().nonnegative(),
    "1": z.number().int().nonnegative(),
    "2": z.number().int().nonnegative(),
    "3": z.number().int().nonnegative(),
    "4": z.number().int().nonnegative(),
    "5+": z.number().int().nonnegative()
  }),
  survivalGrades: z.record(
    z.string(),
    z.object({
      minHp: z.number().int().optional(),
      maxHp: z.number().int().optional(),
      label: z.string().min(1)
    })
  ),
  events: z.object({
    day2: z.object({
      parts: z.object({ materialsDelta: z.number().int() }),
      sensor: z.object({
        materialsDelta: z.number().int(),
        day3DamageReduction: z.number().int().nonnegative(),
        eliminateOneRoute: z.boolean()
      })
    }),
    day3: z.object({
      damageByDrainage: z.object({
        "1": z.number().int().nonnegative(),
        "2": z.number().int().nonnegative(),
        "3+": z.number().int().nonnegative()
      })
    }),
    day4: z.object({
      data: z.object({ revealFinalRequirements: z.boolean() }),
      cargo: z.object({ materialsDelta: z.number().int() })
    }),
    day5: z.object({
      routeFailure: z.object({
        damageIfAccessBelow: z.number().int(),
        damage: z.number().int().nonnegative()
      })
    }),
    day6: z.object({
      explorationAllowedMorning: z.boolean(),
      explorationAllowedAfternoon: z.boolean()
    })
  }),
  final: z.object({
    phases: z.array(
      z.object({
        id: z.enum(["final_rain", "final_route", "final_wind", "final_blackout"]),
        name: z.string(),
        stat: z.enum(["protection", "drainage", "access", "lifeline"])
      })
    ).length(4),
    emergencyInstallMax: z.number().int().nonnegative()
  })
});

export type GameData = z.infer<typeof gameDataSchema>;

export function parseGameData(value: unknown): GameData {
  const parsed = gameDataSchema.parse(value);
  const ids = new Set(parsed.products.map((product) => product.id));
  if (ids.size !== parsed.products.length) {
    throw new Error("ISLAND7_GAME_DATA.jsonに重複した製品IDがあります。");
  }
  return parsed;
}
