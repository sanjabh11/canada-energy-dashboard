import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/apiKeyAccess.ts"),
  "utf8",
);

describe("API key rate-limit failure contract", () => {
  it("does not allow requests when the fallback usage lookup fails", () => {
    expect(source).toContain("return { allowed: false, remaining: 0, dailyLimit, unavailable: true }");
    expect(source).not.toContain("return { allowed: true, remaining: dailyLimit, dailyLimit }");
  });

  it("returns a service-unavailable response when rate protection is unavailable", () => {
    expect(source).toContain("if (limitResult.unavailable)");
    expect(source).toContain('status: 503');
    expect(source).toContain('error: "Rate limit unavailable"');
  });

  it("fails closed when usage recording cannot be persisted", () => {
    expect(source).toContain("let usageRecorded = true");
    expect(source).toContain("if (!usageRecorded)");
    expect(source).toContain("usageRecorded = await fallbackRecordUsage");
  });
});
