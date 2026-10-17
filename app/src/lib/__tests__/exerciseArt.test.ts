import { ART_COLORS, artGroupFor } from "../exerciseArt";

describe("artGroupFor", () => {
  it("uses the library muscle group when it is known", () => {
    expect(artGroupFor("Anything", "strength", "Chest")).toBe("chest");
    expect(artGroupFor("Anything", "strength", "hamstrings")).toBe("legs");
    expect(artGroupFor("Anything", "strength", "glutes")).toBe("glutes");
    expect(artGroupFor("Anything", "strength", "triceps")).toBe("arms");
    expect(artGroupFor("Anything", "strength", "lower back")).toBe("back");
  });

  it("cardio always gets the pulse artwork, whatever the muscle says", () => {
    expect(artGroupFor("Barbell Squat", "cardio", "quads")).toBe("cardio");
  });

  it("falls back to the exercise name when the muscle group is missing or unknown", () => {
    expect(artGroupFor("Barbell Bench Press", "strength")).toBe("chest");
    expect(artGroupFor("Seated Cable Row", "strength", "")).toBe("back");
    expect(artGroupFor("Dumbbell Lateral Raise", "strength", null)).toBe("shoulders");
    expect(artGroupFor("Hammer Curl", "strength", "mystery")).toBe("arms");
    expect(artGroupFor("Walking Lunge", "strength")).toBe("legs");
    expect(artGroupFor("Hip Thrust", "strength")).toBe("glutes");
    expect(artGroupFor("Cable Crunch", "strength")).toBe("core");
  });

  it("an unrecognised custom exercise gets the neutral full-body artwork", () => {
    expect(artGroupFor("My Weird Move", "strength")).toBe("full");
  });

  it("every group has a tint and a shape colour", () => {
    for (const group of Object.keys(ART_COLORS) as (keyof typeof ART_COLORS)[]) {
      expect(ART_COLORS[group].bg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(ART_COLORS[group].fg).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
