export type ServerConfidenceLevel = "high" | "medium" | "low";
export type ServerDataSource = "aeso_pool" | "forecast_dataset" | "tier_inputs" | "compliance_pack";

export interface SourceConfidenceResult {
  source: ServerDataSource;
  level: ServerConfidenceLevel;
  score: number;
  maxAgeHours: number;
  ageHours: number;
  lastUpdated: string;
  reason?: string;
}

export interface ServerExportGateResult {
  allowed: boolean;
  confidence: ServerConfidenceLevel;
  decision: "allow" | "allow_with_disclaimer" | "block";
  reason?: string;
  requiredSources: ServerDataSource[];
  results: SourceConfidenceResult[];
  evaluatedAt: string;
  disclaimerRequired: boolean;
  snapshot: Record<string, unknown>;
}

interface ConfidenceConfig {
  aesoPeakHours: number;
  aesoOffPeakHours: number;
  forecastHours: number;
  tierInputDays: number;
}

const DEFAULT_CONFIG: ConfidenceConfig = {
  aesoPeakHours: 1,
  aesoOffPeakHours: 6,
  forecastHours: 24,
  tierInputDays: 7,
};

function parsePositiveEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getConfig(): ConfidenceConfig {
  return {
    aesoPeakHours: parsePositiveEnv("AESO_POOL_STALE_HOURS_PEAK", DEFAULT_CONFIG.aesoPeakHours),
    aesoOffPeakHours: parsePositiveEnv("AESO_POOL_STALE_HOURS_OFFPEAK", DEFAULT_CONFIG.aesoOffPeakHours),
    forecastHours: parsePositiveEnv("FORECAST_DATA_STALE_HOURS", DEFAULT_CONFIG.forecastHours),
    tierInputDays: parsePositiveEnv("TIER_INPUT_STALE_DAYS", DEFAULT_CONFIG.tierInputDays),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toHours(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 3_600_000);
}

function confidenceWeight(level: ServerConfidenceLevel): number {
  if (level === "high") return 2;
  if (level === "medium") return 1;
  return 0;
}

function scoreToLevel(score: number): ServerConfidenceLevel {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function isPeakHour(now: Date): boolean {
  const hour = now.getUTCHours();
  return (hour >= 13 && hour <= 16) || (hour >= 23 || hour <= 2);
}

function getThresholdHours(source: ServerDataSource, now: Date, config: ConfidenceConfig): number {
  if (source === "aeso_pool") {
    return isPeakHour(now) ? config.aesoPeakHours : config.aesoOffPeakHours;
  }
  if (source === "forecast_dataset") {
    return config.forecastHours;
  }
  return config.tierInputDays * 24;
}

function getRequiredSourcesForTemplate(template: string): ServerDataSource[] {
  const normalized = template.toLowerCase();
  if (normalized.includes("forecast")) {
    return ["forecast_dataset", "aeso_pool"];
  }
  if (normalized.includes("tier")) {
    return ["aeso_pool", "tier_inputs"];
  }
  if (normalized.includes("regulatory") || normalized.includes("compliance") || normalized.includes("bank")) {
    return ["aeso_pool", "tier_inputs", "compliance_pack"];
  }
  return ["aeso_pool", "tier_inputs"];
}

async function fetchTableTimestamp(
  supabase: any,
  table: string,
  columns: string[]
): Promise<string | null> {
  for (const column of columns) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .order(column, { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && typeof data[column] === "string") {
        return data[column] as string;
      }
    } catch {
      // Try next column candidate
    }
  }
  return null;
}

function getContextTimestamp(context: Record<string, unknown>, key: string): string | null {
  const value = context[key];
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function getLastUpdatedForSource(
  source: ServerDataSource,
  context: Record<string, unknown>,
  supabase: any
): Promise<string | null> {
  if (source === "aeso_pool") {
    return fetchTableTimestamp(supabase, "alberta_grid_prices", ["timestamp", "created_at", "updated_at"]);
  }

  if (source === "forecast_dataset") {
    return fetchTableTimestamp(supabase, "forecast_performance_metrics", [
      "timestamp",
      "calculated_at",
      "date",
      "created_at",
    ]);
  }

  if (source === "tier_inputs") {
    return (
      getContextTimestamp(context, "tier_inputs_updated_at")
      || getContextTimestamp(context, "input_updated_at")
      || getContextTimestamp(context, "submitted_at")
      || getContextTimestamp(context, "client_generated_at")
    );
  }

  return (
    getContextTimestamp(context, "compliance_pack_updated_at")
    || getContextTimestamp(context, "input_updated_at")
    || getContextTimestamp(context, "submitted_at")
    || getContextTimestamp(context, "client_generated_at")
  );
}

export async function assertExportAllowedServerSide(args: {
  template: string;
  requestContext?: Record<string, unknown>;
  sources?: ServerDataSource[];
  forceExport?: boolean;
  canForceExport?: boolean;
  supabase: any;
  now?: Date;
}): Promise<ServerExportGateResult> {
  const now = args.now ?? new Date();
  const config = getConfig();
  const requestContext = args.requestContext ?? {};
  const requiredSources = args.sources && args.sources.length > 0
    ? args.sources
    : getRequiredSourcesForTemplate(args.template);

  const results: SourceConfidenceResult[] = [];

  for (const source of requiredSources) {
    const lastUpdatedRaw = await getLastUpdatedForSource(source, requestContext, args.supabase);
    const threshold = getThresholdHours(source, now, config);

    if (!lastUpdatedRaw) {
      results.push({
        source,
        level: "low",
        score: 0,
        maxAgeHours: threshold,
        ageHours: Number.POSITIVE_INFINITY,
        lastUpdated: "unknown",
        reason: `No authoritative timestamp found for ${source}.`,
      });
      continue;
    }

    const lastUpdatedDate = new Date(lastUpdatedRaw);
    if (Number.isNaN(lastUpdatedDate.getTime())) {
      results.push({
        source,
        level: "low",
        score: 0,
        maxAgeHours: threshold,
        ageHours: Number.POSITIVE_INFINITY,
        lastUpdated: lastUpdatedRaw,
        reason: `${source} timestamp is invalid.`,
      });
      continue;
    }

    const ageHours = toHours(lastUpdatedDate, now);
    const score = clamp(1 - ageHours / threshold, 0, 1);
    const level = scoreToLevel(score);
    const reason = level === "low"
      ? `${source} is stale (${ageHours.toFixed(1)}h old; max ${threshold}h).`
      : undefined;

    results.push({
      source,
      level,
      score: Number(score.toFixed(2)),
      maxAgeHours: threshold,
      ageHours: Number(ageHours.toFixed(2)),
      lastUpdated: lastUpdatedDate.toISOString(),
      reason,
    });
  }

  const confidence = results.reduce<ServerConfidenceLevel>((lowest, current) =>
    confidenceWeight(current.level) < confidenceWeight(lowest) ? current.level : lowest
  , "high");

  const blockedReasons = results.filter((entry) => entry.level === "low").map((entry) => entry.reason).filter(Boolean) as string[];
  const mediumPresent = results.some((entry) => entry.level === "medium");
  const forceExport = Boolean(args.forceExport);
  const canForceExport = Boolean(args.canForceExport);

  let decision: ServerExportGateResult["decision"] = "allow";
  let allowed = true;
  let disclaimerRequired = false;
  let reason: string | undefined;

  if (confidence === "low") {
    if (forceExport && canForceExport) {
      decision = "allow_with_disclaimer";
      disclaimerRequired = true;
      reason = blockedReasons.join(" ") || "Low confidence data forced by entitled principal.";
    } else {
      decision = "block";
      allowed = false;
      reason = blockedReasons.join(" ") || "Low confidence data blocks official export.";
    }
  } else if (mediumPresent) {
    decision = "allow_with_disclaimer";
    disclaimerRequired = true;
  }

  const snapshot = {
    evaluated_at: now.toISOString(),
    template: args.template,
    required_sources: requiredSources,
    confidence,
    decision,
    reason: reason ?? null,
    results,
    force_export_requested: forceExport,
    force_export_granted: forceExport && canForceExport,
  };

  return {
    allowed,
    confidence,
    decision,
    reason,
    requiredSources,
    results,
    evaluatedAt: now.toISOString(),
    disclaimerRequired,
    snapshot,
  };
}
