import { describe, it, expect } from "vitest";
import { pickHour } from "./weather";

const archive = {
  hourly: {
    time: ["2026-06-12T17:00", "2026-06-12T18:00", "2026-06-12T19:00"],
    temperature_2m: [20, 24, 22],
    relative_humidity_2m: [50, 45, 48],
    wind_speed_10m: [10, 12, 11],
  },
};

describe("pickHour", () => {
  it("selects the hour matching kickoff", () => {
    expect(pickHour(archive, "2026-06-12T18:00:00+00:00")).toEqual({
      temperatureC: 24, humidity: 45, windKph: 12,
    });
  });
  it("returns nulls when the hour is absent", () => {
    expect(pickHour(archive, "2026-06-12T23:00:00+00:00")).toEqual({
      temperatureC: null, humidity: null, windKph: null,
    });
  });
  it("returns nulls for malformed input", () => {
    expect(pickHour({}, "2026-06-12T18:00:00+00:00")).toEqual({
      temperatureC: null, humidity: null, windKph: null,
    });
  });
});
