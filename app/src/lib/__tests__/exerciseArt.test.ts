import { muscleFamilyFor, muscleHighlightFor } from "../exerciseArt";

describe("muscleFamilyFor", () => {
  it("uses the library muscle group when it is known", () => {
    expect(muscleFamilyFor("Anything", "strength", "Chest")).toBe("chest");
    expect(muscleFamilyFor("Anything", "strength", "hamstrings")).toBe("legs");
    expect(muscleFamilyFor("Anything", "strength", "glutes")).toBe("glutes");
    expect(muscleFamilyFor("Anything", "strength", "triceps")).toBe("arms");
    expect(muscleFamilyFor("Anything", "strength", "lower back")).toBe("back");
  });

  it("cardio is always cardio, whatever the muscle says", () => {
    expect(muscleFamilyFor("Barbell Squat", "cardio", "quads")).toBe("cardio");
  });

  it("falls back to the exercise name when the muscle group is missing or unknown", () => {
    expect(muscleFamilyFor("Barbell Bench Press", "strength")).toBe("chest");
    expect(muscleFamilyFor("Seated Cable Row", "strength", "")).toBe("back");
    expect(muscleFamilyFor("Dumbbell Lateral Raise", "strength", null)).toBe("shoulders");
    expect(muscleFamilyFor("Hammer Curl", "strength", "mystery")).toBe("arms");
    expect(muscleFamilyFor("Rope Tricep Pushdown", "strength")).toBe("arms");
    expect(muscleFamilyFor("Walking Lunge", "strength")).toBe("legs");
    expect(muscleFamilyFor("Hip Thrust", "strength")).toBe("glutes");
    expect(muscleFamilyFor("Cable Crunch", "strength")).toBe("core");
  });

  it("an unrecognised custom exercise is whole-body", () => {
    expect(muscleFamilyFor("My Weird Move", "strength")).toBe("full");
  });
});

describe("muscleHighlightFor", () => {
  it("lights exactly the named muscle and picks the side it is seen from", () => {
    expect(muscleHighlightFor("Bench Press", "strength", "chest")).toEqual({ side: "front", worked: ["chest"], support: [] });
    expect(muscleHighlightFor("Pulldown", "strength", "back")).toMatchObject({ side: "back", worked: ["upper-back"] });
    expect(muscleHighlightFor("Skull Crusher", "strength", "triceps")).toMatchObject({ side: "back", worked: ["triceps"] });
    expect(muscleHighlightFor("Curl", "strength", "biceps")).toMatchObject({ side: "front", worked: ["biceps"] });
    expect(muscleHighlightFor("Hip Thrust", "strength", "glutes")).toMatchObject({ side: "back", worked: ["gluteal"] });
  });

  it("core lights both abs and obliques from the front", () => {
    const h = muscleHighlightFor("Plank", "strength", "core");
    expect(h.side).toBe("front");
    expect(h.worked).toEqual(expect.arrayContaining(["abs", "obliques"]));
  });

  it("with no muscle group it lights the whole family guessed from the name", () => {
    expect(muscleHighlightFor("Barbell Row", "strength").worked).toEqual(expect.arrayContaining(["upper-back", "lower-back"]));
    expect(muscleHighlightFor("Barbell Row", "strength").side).toBe("back");
    expect(muscleHighlightFor("Bench Press", "strength").worked).toEqual(["chest"]);
  });

  it("cardio and unknown moves show pale support regions, not a specific muscle", () => {
    const cardio = muscleHighlightFor("Treadmill", "cardio");
    expect(cardio.worked).toEqual([]);
    expect(cardio.support.length).toBeGreaterThan(0);
    expect(muscleHighlightFor("My Weird Move", "strength").worked).toEqual([]);
  });
});
