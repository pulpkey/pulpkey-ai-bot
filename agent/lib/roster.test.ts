import { describe, expect, it } from "vitest";

import { memberProfiles, PEOPLE } from "#data/people.js";

import { findInRoster, matchPerson, ROSTER } from "./roster.js";

const rosterNames = (): string[] => ROSTER.map((e) => e.name);

describe("roster entries", () => {
  it("has unique names", () => {
    const names = rosterNames();
    expect(new Set(names).size).toBe(names.length);
  });

  it("derives only members from the profile data (non-members excluded)", () => {
    // The roster is the machine-readable mirror of people.ts members; it must
    // stay consistent with the source so drift detection can't go stale.
    expect(rosterNames()).toStrictEqual(memberProfiles().map((p) => p.name));

    const nonMembers = PEOPLE.filter((p) => p.member === false).map(
      (p) => p.name
    );
    for (const name of nonMembers) {
      expect(rosterNames()).not.toContain(name);
    }
  });

  it("ships without fake production members", () => {
    expect(ROSTER).toStrictEqual([]);
  });
});

describe(findInRoster, () => {
  it("returns undefined for an unknown name", () => {
    expect(findInRoster("Some Randomperson")).toBeUndefined();
  });

  it("returns undefined for empty input", () => {
    expect(findInRoster("")).toBeUndefined();
    expect(findInRoster()).toBeUndefined();
  });
});

describe(matchPerson, () => {
  it("resolves a member by alias against supplied profile data", () => {
    const people = [{ aliases: ["Ari"], name: "Aria Shah" }];
    expect(matchPerson(people, "Ari")?.name).toBe("Aria Shah");
    expect(PEOPLE).toStrictEqual([]);
  });
});
