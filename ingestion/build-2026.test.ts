import { describe, it, expect } from "vitest";
import { parseFotmobStats, countryObservation, alignGoalMinutes } from "./build-2026";
import { getTeams, getMatches, getMeta } from "../src/lib/snapshot";
import { getWaveMatches } from "../src/lib/waves";
import groups from "../public/data/2026/groups.json";

describe("2026 provider boundary", () => {
  it("preserves zeros, parses percentages, ignores title rows and keeps missing values null", () => {
    const content = {stats:{Periods:{All:{stats:[{stats:[
      {key:"expected_goals",type:"title",stats:[null,null]},
      {key:"expected_goals",type:"text",stats:["0.00","1.25"]},
      {key:"accurate_passes",type:"text",stats:["467 (90%)","100 (75%)"]},
      {key:"yellow_cards",type:"text",stats:[0,2]},
      {key:"red_cards",type:"text",stats:[0,1]},
    ]}]}}}};
    expect(parseFotmobStats(content,0)).toEqual({possession:null,shots:null,xg:0,passAccuracy:90,cards:0});
    expect(parseFotmobStats(content,1).cards).toBe(3);
  });
  it("never uses post-tournament indicator years or converts missing values to zero", () => {
    const rows = [{countryiso3code:"MEX",date:"2026",value:999},{countryiso3code:"MEX",date:"2025",value:null},{countryiso3code:"MEX",date:"2024",value:123}];
    expect(countryObservation(rows,"MEX")).toEqual({value:123,year:2024});
    expect(countryObservation(rows,"SCO")).toEqual({value:null,year:null});
  });
  it("keeps added-time goals inside the provider timeline and preserves their labels", () => {
    const wave = structuredClone(getWaveMatches()[0]);
    wave.goals = [{minute:94,side:"home",player:"Example",scoreAfter:[1,0]}];
    alignGoalMinutes(wave,[{type:"Goal",time:90,overloadTime:4}]);
    expect(wave.goals[0].minute).toBeGreaterThan(90);
    expect(wave.goals[0].minute).toBeLessThan(90.5);
    expect(wave.goals[0].displayMinute).toBe("90+4");
  });
});

describe("active tournament integrity", () => {
  it("uses 2026 on every shared data surface", () => {
    expect(getMeta().tournament).toBe("FIFA World Cup 2026");
    expect(getTeams()).toHaveLength(48);
    expect(getMatches()).toHaveLength(208);
    expect(new Set(getMatches().map(m=>m.fixtureId)).size).toBe(104);
    expect(getMatches().every(m=>m.kickoffUtc.startsWith("2026-") && m.xg != null && m.possession != null && m.shots != null && m.temperatureC != null)).toBe(true);
    for (const team of getTeams()) {
      const rows = getMatches().filter(m=>m.teamId===team.teamId);
      expect(team.matchesPlayed).toBe(rows.length);
      expect(team.goalsFor).toBe(rows.reduce((s,m)=>s+m.goals,0));
      expect(team.xg).toBeCloseTo(rows.reduce((s,m)=>s+(m.xg??0),0));
    }
  });
  it("keeps shootouts separate and every goal reachable during playback", () => {
    for (const wave of getWaveMatches()) {
      let score = [0,0];
      for (const goal of wave.goals) {
        score[goal.side === "home" ? 0 : 1]++;
        expect(goal.scoreAfter).toEqual(score);
        expect(goal.minute).toBeLessThanOrEqual(wave.momentum.at(-1)!.minute);
      }
      expect(score).toEqual(wave.score);
    }
  });
  it("agrees with the independently imported group-stage scores", () => {
    const alias:Record<string,string> = {"Czech Republic":"Czechia","Bosnia & Herzegovina":"Bosnia and Herzegovina","Curaçao":"Curacao","Turkey":"Turkiye"};
    for (const result of groups.matches) {
      const home = alias[result.home] ?? result.home;
      const away = alias[result.away] ?? result.away;
      const wave = getWaveMatches().find(m=>m.home.name===home && m.away.name===away && m.stage===`Group ${result.group}`);
      expect(wave,`${home} v ${away}`).toBeDefined();
      expect(wave!.score).toEqual([result.homeGoals,result.awayGoals]);
      expect(wave!.kickoff).toBe(result.kickoffUtc);
    }
  });
});
