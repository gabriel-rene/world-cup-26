import { describe, it, expect } from "vitest";
import { SCOPES, SCOPE_LABELS } from "./scopes";

describe("scopes", () => {
  it("exposes the two v1 scopes with labels", () => {
    expect(SCOPES).toEqual(["2026-team", "2026-match"]);
    expect(SCOPE_LABELS["2026-team"]).toBe("2026 · Teams");
    expect(SCOPE_LABELS["2026-match"]).toBe("2026 · Matches");
  });
});
