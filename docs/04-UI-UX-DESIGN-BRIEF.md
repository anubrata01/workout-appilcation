# UI/UX Design Brief
**Product:** LOADED — Workout Tracker (v2.0)
**Status:** Draft for review
**Last updated:** 2026-07-25

The prototype ([App.jsx](../../workout%20application/loaded-app/src/App.jsx)) already validated a strong, specific visual identity. This brief carries that theme forward unchanged in spirit, extends it to the new screens (auth, templates, library, settings), and translates it from inline React web styles to a React Native design system (tokens + reusable components instead of one giant `styles` object).

## 1. Design tokens (carried over from the prototype, unchanged)

```
Background base   #0B0B09
Surface (cards)    #1C1B17
Surface elevated   #181712  (sheets/modals)
Track/inset        #121210
Border             #2A2820
Border subtle      #201F19

Accent (effort)    #FF4519   — primary actions, active states, the signature "load" fill
Accent warm        #FF6B4A   — secondary highlights (calories, secondary CTAs)
Chalk (primary text)  #F3EFE6
Muted text          #8A8578
Dim text            #6B6759
Faint text          #565344

Tag colors:
  Push       #FFB020
  Pull       #34C6C6
  Legs       #A78BFA
  Upper      #FF6B4A
  Lower      #6EE7B7
  Full Body  #F3EFE6

Semantic (new — not in prototype, needed for auth/forms/errors):
  Success   #6EE7B7  (reuse "Lower" tag green — already reads as positive)
  Error     #FF6B4A→#E8432E  (reuse warm accent family, shifted darker for error text on light-on-dark backgrounds)
  Warning   #FFB020  (reuse "Push" tag amber)
```

**Typography** — unchanged three-font system:
- **Display / numerals with character:** Bebas Neue — screen titles, day name, stat values, sheet titles.
- **Body / UI:** Inter (400/500/600/700) — labels, buttons, body copy.
- **Data / tabular:** JetBrains Mono — weights, reps, dates, volume figures. This is a deliberate signature of the prototype (numbers get a "gym log" mono feel distinct from prose) and should be preserved.

React Native note: these are Google Fonts already loaded via `@import` in the web prototype; in RN, bundle them as static font assets (`expo-font` / `react-native-vector-icons`-style loading) rather than a runtime `@import`, since there's no guaranteed network access on load.

**Radii & spacing** — unchanged: 20–34px on containers/sheets, 10–16px on cards, 6–10px on inputs/chips, 8px base spacing grid.

## 2. Component inventory

Reusable RN components to extract from the prototype's inline JSX (the prototype defines these as styled `<div>`s per-screen; v2.0 should componentize them since they now repeat across more screens):

| Component | Source in prototype | v2.0 notes |
|---|---|---|
| `TagChip` | `styles.chip` in `LogTab` | Same pill/border/fill pattern; reused in template creation and exercise-library filters |
| `LoadCard` (barbell/volume bar) | `styles.barbellCard` + `.plate` fill animation | Keep the animated width-fill on the track; this is the single most distinctive visual element — do not simplify it away |
| `ExerciseCard` | `ExerciseCard` function | Same weight/reps/done grid; add a subtle "from template" or "from library" badge only if it doesn't clutter the row |
| `SheetModal` | `styles.sheetOverlay` / `.sheet` | Generalize beyond the exercise picker — reused for template picker, delete-account confirmation, reminder time picker |
| `StatPill` | `styles.statPill` | Reused in Reports stat cards and streak indicator |
| `PrimaryButton` | `styles.addExerciseBtn` | The solid accent-orange, dark-text, bold-label button — becomes the canonical CTA style app-wide (sign up, save template, etc.) |
| `IconTabBar` | `styles.tabBar` / `TabButton` | Same 3-icon bottom bar pattern, unchanged structurally |
| **New:** `TextField` | — | Auth forms, template naming, custom exercise entry — needs label, error state (using the new Error token), and secure-entry variant for passwords |
| **New:** `StreakBadge` | — | Small flame/count pill near the date header, visually consistent with `StatPill` |
| **New:** `EmptyState` | `styles.emptyState` | Generalize the "no sets logged yet" pattern for empty library search results, empty template list, etc. |

## 3. Screen-by-screen UX notes

### 3.1 Welcome / Auth
- New territory for this theme — apply the same dark, high-contrast, minimal-chrome feel. Brand mark + "LOADED" wordmark centered, Bebas Neue at a larger size than the in-app brand bar.
- Google button follows Google's branding guidelines for dark backgrounds (do not restyle the Google "G" mark or its required button treatment) — this is a hard external constraint, not a design choice.
- Form errors render inline under the field in the Error token color, not as a toast — consistent with the prototype's general avoidance of transient overlay chrome.

### 3.2 Onboarding
- Keep it to 2–3 screens max, each with one clear illustration/icon (reuse Lucide icons already in the dependency set — `Dumbbell`, `ClipboardList`, `Trophy` are already used elsewhere in-app, so reusing them here keeps icon language consistent) and one line of copy. Skippable.

### 3.3 Home / Log tab
- Structurally unchanged from the prototype — date nav, tag row, `LoadCard`, exercise list, add-exercise CTA, picker sheet. This is intentional: the prototype's flow here is already good; v2.0's job is to make it real (multi-user, persisted, offline-tolerant), not to redesign it.
- Streak badge placement: inline with the date nav row, small, not competing with the date for primary visual weight.

### 3.4 Exercise Picker
- Three entry points (browse / template / custom) as tabs or segmented control at the top of the same bottom sheet used today — do not turn this into three separate full screens, since the sheet's speed (quick add, back to logging) is the point.

### 3.5 Reports
- Week/Month segmented control sits where the prototype's static "This week" section label was.
- New per-exercise line chart: same chart library treatment as the existing bar/pie (dark grid, accent-colored series, JetBrains Mono axis labels) — visually it should look like a sibling of the existing charts, not a bolted-on new style.

### 3.6 PRs
- Unchanged card layout; tap target added (whole card becomes pressable → per-exercise progress) without changing its appearance at rest.

### 3.7 Settings
- New screen, plainer than the rest of the app (list of rows: Reminders, Account, Log out, Delete account) — uses the same surface/border/text tokens but doesn't need the density of the Log tab. Delete account gets deliberately less visual prominence (bottom of list, muted color) than every other row — it's the one destructive action in the app and should not be reachable by a mis-tap.

## 4. Motion

- Preserve the prototype's two named transitions: `.chip` (scale-down on press, 120ms) and `.plate` (width/background transition, 250ms) as the app's baseline interaction-feedback language — translate directly to RN Reanimated `withTiming`/`withSpring` with matching durations.
- New screens (sheets, onboarding) use simple slide-up/fade consistent with standard RN navigation transitions — no new bespoke motion language needed beyond the two above.

## 5. Accessibility

- Not addressed in the prototype (a personal single-user tool); v2.0 needs a baseline: minimum touch target 44×44dp, color contrast checked for the muted-text-on-dark combinations (`#6B6759` on `#1C1B17` is borderline — audit during implementation and lighten if it fails WCAG AA for body text), and screen-reader labels on icon-only buttons (trash/close/nav chevrons currently have no accessible label in the prototype).

## 6. Open questions for review

1. Any existing brand assets (logo file, app icon) beyond the inline `Dumbbell` icon mark used as a placeholder in the prototype?
2. Confirm kg-only display is fine for v2.0 (mirrors the open PRD question) — affects whether `WEIGHT (kg)` column headers need to become unit-aware.

---
**Previous:** [03-APP-FLOW.md](03-APP-FLOW.md) · **Next:** [05-BACKEND-SCHEMA.md](05-BACKEND-SCHEMA.md)
