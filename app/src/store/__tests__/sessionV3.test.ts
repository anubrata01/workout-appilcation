import reducer, {
  SET_TYPE_ORDER,
  exerciseAdded,
  exerciseNoteChanged,
  sessionCleared,
  sessionStarted,
  setAdded,
  setRemoved,
  setTypeCycled,
  setUpdated,
} from "../activeSessionSlice";
import preferences, { REST_PRESETS, restSecondsChanged, vibrateOnRestEndChanged } from "../preferencesSlice";

const initial = reducer(undefined, { type: "@@INIT" });

describe("starting from a routine", () => {
  it("pre-fills exercises with the routine's set counts and remembers its name", () => {
    const state = reducer(
      initial,
      sessionStarted({
        routineName: "Push Day",
        exercises: [
          { key: "a", name: "Bench Press", category: "strength", isBodyweight: false, imageUrl: "https://x/b.jpg", setCount: 4 },
          { key: "b", name: "Push-Ups", category: "strength", isBodyweight: true, setCount: 3 },
        ],
      })
    );
    expect(state.status).toBe("active");
    expect(state.routineName).toBe("Push Day");
    expect(state.exercises.map((e) => [e.name, e.sets.length])).toEqual([
      ["Bench Press", 4],
      ["Push-Ups", 3],
    ]);
    expect(state.exercises[0].imageUrl).toBe("https://x/b.jpg");
    expect(state.exercises[0].sets.every((s) => !s.done && s.set_type === "normal")).toBe(true);
  });

  it("an empty start has no routine name and no exercises", () => {
    const state = reducer(initial, sessionStarted());
    expect(state.routineName).toBeNull();
    expect(state.exercises).toEqual([]);
  });

  it("clamps absurd set counts instead of rendering hundreds of rows", () => {
    const state = reducer(
      initial,
      sessionStarted({ exercises: [{ key: "a", name: "X", category: "strength", isBodyweight: false, setCount: 999 }] })
    );
    expect(state.exercises[0].sets).toHaveLength(10);
    const zero = reducer(initial, sessionStarted({ exercises: [{ key: "a", name: "X", category: "strength", isBodyweight: false, setCount: 0 }] }));
    expect(zero.exercises[0].sets).toHaveLength(1);
  });

  it("clearing the session also forgets the routine", () => {
    let state = reducer(initial, sessionStarted({ routineName: "Legs", exercises: [] }));
    state = reducer(state, sessionCleared());
    expect(state).toEqual(initial);
  });
});

describe("set types", () => {
  function withOneExercise() {
    let state = reducer(initial, sessionStarted());
    state = reducer(state, exerciseAdded({ key: "a", name: "Squat", category: "strength", isBodyweight: false }));
    return state;
  }

  it("cycles normal, warm-up, drop, failure, then back to normal", () => {
    let state = withOneExercise();
    const seen = [state.exercises[0].sets[0].set_type];
    for (let i = 0; i < SET_TYPE_ORDER.length; i++) {
      state = reducer(state, setTypeCycled({ key: "a", index: 0 }));
      seen.push(state.exercises[0].sets[0].set_type);
    }
    expect(seen).toEqual(["normal", "warmup", "drop", "failure", "normal"]);
  });

  it("a set persisted before set types existed cycles to warm-up, not undefined", () => {
    let state = withOneExercise();
    delete state.exercises[0].sets[0].set_type;
    state = reducer(state, setTypeCycled({ key: "a", index: 0 }));
    expect(state.exercises[0].sets[0].set_type).toBe("warmup");
  });

  it("only changes the targeted set, and ignores a stale key or index", () => {
    let state = withOneExercise();
    state = reducer(state, setAdded({ key: "a" }));
    state = reducer(state, setTypeCycled({ key: "a", index: 1 }));
    expect(state.exercises[0].sets.map((s) => s.set_type)).toEqual(["normal", "warmup"]);
    expect(reducer(state, setTypeCycled({ key: "gone", index: 0 }))).toEqual(state);
    expect(reducer(state, setTypeCycled({ key: "a", index: 9 }))).toEqual(state);
  });

  it("a new set after a warm-up starts as a normal set with the same weight", () => {
    let state = withOneExercise();
    state = reducer(state, setUpdated({ key: "a", index: 0, field: "weight", value: 40 }));
    state = reducer(state, setTypeCycled({ key: "a", index: 0 }));
    state = reducer(state, setAdded({ key: "a" }));
    expect(state.exercises[0].sets[1]).toMatchObject({ weight: 40, set_type: "normal", done: false });
  });
});

describe("removing a set", () => {
  it("removes the right one and renumbers", () => {
    let state = reducer(initial, sessionStarted());
    state = reducer(state, exerciseAdded({ key: "a", name: "Squat", category: "strength", isBodyweight: false }));
    state = reducer(state, setAdded({ key: "a" }));
    state = reducer(state, setAdded({ key: "a" }));
    state = reducer(state, setUpdated({ key: "a", index: 0, field: "weight", value: 10 }));
    state = reducer(state, setUpdated({ key: "a", index: 1, field: "weight", value: 20 }));
    state = reducer(state, setUpdated({ key: "a", index: 2, field: "weight", value: 30 }));
    state = reducer(state, setRemoved({ key: "a", index: 1 }));
    expect(state.exercises[0].sets.map((s) => s.weight)).toEqual([10, 30]);
  });

  it("never removes the last remaining set", () => {
    let state = reducer(initial, sessionStarted());
    state = reducer(state, exerciseAdded({ key: "a", name: "Squat", category: "strength", isBodyweight: false }));
    state = reducer(state, setRemoved({ key: "a", index: 0 }));
    expect(state.exercises[0].sets).toHaveLength(1);
  });
});

describe("exercise notes", () => {
  it("stores the note on the right exercise only", () => {
    let state = reducer(initial, sessionStarted());
    state = reducer(state, exerciseAdded({ key: "a", name: "Squat", category: "strength", isBodyweight: false }));
    state = reducer(state, exerciseAdded({ key: "b", name: "Deadlift", category: "strength", isBodyweight: false }));
    state = reducer(state, exerciseNoteChanged({ key: "b", note: "belt on" }));
    expect(state.exercises.map((e) => e.note)).toEqual(["", "belt on"]);
    expect(reducer(state, exerciseNoteChanged({ key: "gone", note: "x" }))).toEqual(state);
  });
});

describe("preferences", () => {
  const start = preferences(undefined, { type: "@@INIT" });

  it("defaults to a 90 second countdown with vibration on", () => {
    expect(start).toEqual({ restSeconds: 90, vibrateOnRestEnd: true });
  });

  it("accepts every preset and 0 means stopwatch mode", () => {
    for (const preset of REST_PRESETS) {
      expect(preferences(start, restSecondsChanged(preset)).restSeconds).toBe(preset);
    }
    expect(REST_PRESETS).toContain(0);
  });

  it("clamps and rounds out-of-range values", () => {
    expect(preferences(start, restSecondsChanged(-5)).restSeconds).toBe(0);
    expect(preferences(start, restSecondsChanged(100000)).restSeconds).toBe(900);
    expect(preferences(start, restSecondsChanged(61.6)).restSeconds).toBe(62);
  });

  it("toggles vibration", () => {
    expect(preferences(start, vibrateOnRestEndChanged(false)).vibrateOnRestEnd).toBe(false);
  });
});
