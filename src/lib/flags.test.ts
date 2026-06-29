import { describe, it, expect } from "vitest";
import { flagEmoji } from "./flags";

describe("flagEmoji", () => {
  it("maps a known iso3 to its regional-indicator flag", () => {
    expect(flagEmoji("BRA")).toBe("🇧🇷");
    expect(flagEmoji("FRA")).toBe("🇫🇷");
    expect(flagEmoji("USA")).toBe("🇺🇸");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(flagEmoji("  fra ")).toBe("🇫🇷");
  });

  it("returns the neutral placeholder for unknown or empty codes", () => {
    expect(flagEmoji("XXX")).toBe("🏳️");
    expect(flagEmoji("")).toBe("🏳️");
  });
});
