import { describe, it, expect } from "vitest";
import { SCOPES, SCOPE_LABELS } from "./scopes";

describe("scopes", () => {
  it("exposes the two v1 scopes with labels", () => {
    expect(SCOPES).toEqual(["team", "match"]);
    expect(SCOPE_LABELS["team"]).toBe("Teams");
    expect(SCOPE_LABELS["match"]).toBe("Matches");
  });
});
