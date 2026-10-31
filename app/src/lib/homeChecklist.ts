export interface ChecklistItem {
  key: "goals" | "workout" | "weight";
  label: string;
  done: boolean;
}

export interface Checklist {
  items: ChecklistItem[];
  done: number;
  /** Shown only once the facts it depends on have loaded and something is still left to do. */
  show: boolean;
}

/**
 * The Home "Get started" card. It stays hidden until the three queries it
 * reads have actually answered (so it doesn't flash "0 of 3" on a cold
 * start), and disappears for good once everything is done.
 */
export function setupChecklist(input: { hasGoals: boolean; hasWorkout: boolean; hasWeight: boolean; ready: boolean }): Checklist {
  const items: ChecklistItem[] = [
    { key: "goals", label: "Set your daily goals", done: input.hasGoals },
    { key: "workout", label: "Log your first workout", done: input.hasWorkout },
    { key: "weight", label: "Log your weight", done: input.hasWeight },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, done, show: input.ready && done < items.length };
}
