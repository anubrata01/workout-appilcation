import reducer, {
  exerciseAdded,
  exerciseRemoved,
  sessionCleared,
  sessionStarted,
  setAdded,
  setDoneToggled,
  setUpdated,
} from "../activeSessionSlice";

const initial = reducer(undefined, { type: "@@INIT" });

describe("sessionStarted / sessionCleared", () => {
  it("starts a session empty, active, with a timestamp", () => {
    const state = reducer(initial, sessionStarted());
    expect(state.status).toBe("active");
    expect(state.exercises).toEqual([]);
    expect(state.startedAt).not.toBeNull();
  });

  it("clears back to the exact initial state, dropping any unsaved exercises", () => {
    let state = reducer(initial, sessionStarted());
    state = reducer(state, exerciseAdded({ key: "a", name: "Squat", category: "strength", isBodyweight: false }));
    state = reducer(state, sessionCleared());
    expect(state).toEqual(initial);
  });
});

describe("exerciseAdded", () => {
  it("adding a second, distinct exercise keeps both — this is the exact flow the 'can't log other exercises' report turned out not to be broken in", () => {
    let state = reducer(initial, sessionStarted());
    state = reducer(state, exerciseAdded({ key: "a", name: "Bench Press", category: "strength", isBodyweight: false }));
    state = reducer(state, exerciseAdded({ key: "b", name: "Cable Fly", category: "strength", isBodyweight: false }));
    state = reducer(state, exerciseAdded({ key: "c", name: "Lateral Raise", category: "strength", isBodyweight: false }));

    expect(state.exercises.map((e) => e.name)).toEqual(["Bench Press", "Cable Fly", "Lateral Raise"]);
    // Each starts with exactly one blank, not-done set.
    for (const ex of state.exercises) {
      expect(ex.sets).toHaveLength(1);
      expect(ex.sets[0].done).toBe(false);
    }
  });

  it("keeps exercises with the same name as separate entries (two different local keys)", () => {
    let state = reducer(initial, sessionStarted());
    state = reducer(state, exerciseAdded({ key: "a", name: "Push-Up", category: "strength", isBodyweight: true }));
    state = reducer(state, exerciseAdded({ key: "b", name: "Push-Up", category: "strength", isBodyweight: true }));
    expect(state.exercises).toHaveLength(2);
    expect(state.exercises[0].key).not.toBe(state.exercises[1].key);
  });
});

describe("exerciseRemoved", () => {
  it("removes only the targeted exercise by key, leaving the others untouched", () => {
    let state = reducer(initial, sessionStarted());
    state = reducer(state, exerciseAdded({ key: "a", name: "Squat", category: "strength", isBodyweight: false }));
    state = reducer(state, exerciseAdded({ key: "b", name: "Deadlift", category: "strength", isBodyweight: false }));
    state = reducer(state, exerciseRemoved({ key: "a" }));
    expect(state.exercises.map((e) => e.name)).toEqual(["Deadlift"]);
  });
});

describe("setAdded", () => {
  it("carries the previous set's weight/reps forward as a starting point", () => {
    let state = reducer(initial, sessionStarted());
    state = reducer(state, exerciseAdded({ key: "a", name: "Squat", category: "strength", isBodyweight: false }));
    state = reducer(state, setUpdated({ key: "a", index: 0, field: "weight", value: 80 }));
    state = reducer(state, setUpdated({ key: "a", index: 0, field: "reps", value: 5 }));
    state = reducer(state, setAdded({ key: "a" }));

    expect(state.exercises[0].sets).toHaveLength(2);
    expect(state.exercises[0].sets[1]).toMatchObject({ weight: 80, reps: 5, done: false });
  });

  it("does nothing if the exercise key doesn't exist (no crash on a stale key)", () => {
    const state = reducer(initial, setAdded({ key: "nonexistent" }));
    expect(state).toEqual(initial);
  });
});

describe("setUpdated / setDoneToggled", () => {
  it("updates only the targeted set's field on the targeted exercise", () => {
    let state = reducer(initial, sessionStarted());
    state = reducer(state, exerciseAdded({ key: "a", name: "Bench Press", category: "strength", isBodyweight: false }));
    state = reducer(state, exerciseAdded({ key: "b", name: "Cable Fly", category: "strength", isBodyweight: false }));
    state = reducer(state, setUpdated({ key: "b", index: 0, field: "weight", value: 15 }));

    expect(state.exercises[0].sets[0].weight).toBe(0); // Bench Press untouched
    expect(state.exercises[1].sets[0].weight).toBe(15); // Cable Fly updated
  });

  it("toggles done independently per set", () => {
    let state = reducer(initial, sessionStarted());
    state = reducer(state, exerciseAdded({ key: "a", name: "Squat", category: "strength", isBodyweight: false }));
    state = reducer(state, setAdded({ key: "a" }));
    state = reducer(state, setDoneToggled({ key: "a", index: 0 }));

    expect(state.exercises[0].sets[0].done).toBe(true);
    expect(state.exercises[0].sets[1].done).toBe(false);
  });
});
