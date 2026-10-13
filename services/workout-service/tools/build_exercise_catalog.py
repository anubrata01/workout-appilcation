"""
Builds workouts/data/exercise_catalog.json from the public-domain
free-exercise-db dataset (https://github.com/yuhonas/free-exercise-db,
Unlicense). Run manually when the dataset or our curated list changes:

    python tools/build_exercise_catalog.py <path-to-exercises.json>

The output is committed, so deploys never need network access. Images are not
copied; the seed command points image_url at the dataset's CDN path.

Two things come out:
  images  - for each of OUR curated exercise names that has a good dataset
            match, the image path and instructions to attach to it. Our names,
            muscle groups and equipment stay as they are.
  extras  - every other non-stretching dataset exercise, normalised to our
            fields, so the picker goes from ~90 to ~800 searchable exercises.
"""
import json
import os
import re
import sys

# Our curated name -> dataset name. Only confident matches; anything missing
# simply has no image/description and keeps working as before.
ALIASES = {
    "Bench Press": "Barbell Bench Press - Medium Grip",
    "Incline Bench Press": "Barbell Incline Bench Press - Medium Grip",
    "Decline Bench Press": "Decline Barbell Bench Press",
    "Dumbbell Bench Press": "Dumbbell Bench Press",
    "Incline Dumbbell Press": "Incline Dumbbell Press",
    "Overhead Press": "Standing Military Press",
    "Dumbbell Shoulder Press": "Dumbbell Shoulder Press",
    "Arnold Press": "Arnold Dumbbell Press",
    "Push Press": "Push Press",
    "Lateral Raise": "Side Lateral Raise",
    "Front Raise": "Front Dumbbell Raise",
    "Chest Fly": "Dumbbell Flyes",
    "Cable Fly": "Flat Bench Cable Flyes",
    "Pec Deck": "Butterfly",
    "Tricep Pushdown": "Triceps Pushdown",
    "Skull Crushers": "EZ-Bar Skullcrusher",
    "Close-Grip Bench Press": "Close-Grip Barbell Bench Press",
    "Tricep Dips": "Dips - Triceps Version",
    "Push-Ups": "Pushups",
    "Diamond Push-Ups": "Push-Ups - Close Triceps Position",
    "Deadlift": "Barbell Deadlift",
    "Barbell Row": "Bent Over Barbell Row",
    "Dumbbell Row": "One-Arm Dumbbell Row",
    "Pull-Up": "Pullups",
    "Chin-Up": "Chin-Up",
    "Lat Pulldown": "Wide-Grip Lat Pulldown",
    "Seated Cable Row": "Seated Cable Rows",
    "T-Bar Row": "T-Bar Row with Handle",
    "Single-Arm Row": "One-Arm Dumbbell Row",
    "Face Pull": "Face Pull",
    "Rear Delt Fly": "Reverse Flyes",
    "Shrugs": "Barbell Shrug",
    "Bicep Curl": "Dumbbell Bicep Curl",
    "Barbell Curl": "Barbell Curl",
    "Hammer Curl": "Hammer Curls",
    "Preacher Curl": "Preacher Curl",
    "Cable Curl": "Standing Biceps Cable Curl",
    "Back Squat": "Barbell Full Squat",
    "Front Squat": "Front Barbell Squat",
    "Goblet Squat": "Goblet Squat",
    "Hack Squat": "Hack Squat",
    "Leg Press": "Leg Press",
    "Leg Extension": "Leg Extensions",
    "Romanian Deadlift": "Romanian Deadlift",
    "Leg Curl": "Seated Leg Curl",
    "Walking Lunges": "Dumbbell Lunges",
    "Bulgarian Split Squat": "Split Squats",
    "Step-Ups": "Dumbbell Step Ups",
    "Hip Thrust": "Barbell Hip Thrust",
    "Glute Bridge": "Barbell Glute Bridge",
    "Calf Raise": "Standing Calf Raises",
    "Seated Calf Raise": "Seated Calf Raise",
    "Wide-Grip Pull-Up": "Wide-Grip Rear Pull-Up",
    "Cable Crossover": "Cable Crossover",
    "Upright Row": "Upright Barbell Row",
    "Dips": "Dips - Chest Version",
    "Inverted Row": "Inverted Row",
    "Sumo Deadlift": "Sumo Deadlift",
    "Box Squat": "Box Squat",
    "Standing Calf Raise": "Standing Barbell Calf Raise",
    "Clean & Press": "Clean and Press",
    "Kettlebell Swing": "One-Arm Kettlebell Swings",
    "Thruster": "Kettlebell Thruster",
    "Power Clean": "Power Clean",
    "Clean and Jerk": "Clean and Jerk",
    "Snatch": "Snatch",
    "Turkish Get-Up": "Kettlebell Turkish Get-Up (Squat style)",
    "Farmer's Carry": "Farmer's Walk",
    "Mountain Climbers": "Mountain Climbers",
    "Battle Ropes": "Battling Ropes",
    "Plank": "Plank",
    "Sit-Ups": "Sit-Up",
    "Hanging Leg Raise": "Hanging Leg Raise",
    "Russian Twist": "Russian Twist",
    "Treadmill Run": "Running, Treadmill",
    "Rowing Machine": "Rowing, Stationary",
    "Cycling": "Bicycling",
    "Stationary Bike": "Bicycling, Stationary",
    "Jump Rope": "Rope Jumping",
    "Stair Climber": "Stairmaster",
    "Elliptical": "Elliptical Trainer",
    "Walking": "Walking, Treadmill",
}

MUSCLE_MAP = {
    "quadriceps": "quads",
    "abdominals": "core",
    "lats": "back",
    "middle back": "back",
    "lower back": "lower back",
    "abductors": "glutes",
    "adductors": "adductors",
}

EQUIPMENT_MAP = {
    "body only": "bodyweight",
    "kettlebells": "kettlebell",
    "e-z curl bar": "barbell",
    "bands": "band",
    "medicine ball": "medicine ball",
    "exercise ball": "exercise ball",
    "foam roll": "foam roll",
    None: "none",
    "other": "other",
}

SKIP_CATEGORIES = {"stretching"}
DESCRIPTION_LIMIT = 700


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def describe(entry):
    steps = [clean(s) for s in entry.get("instructions", []) if clean(s)]
    text = " ".join(f"{i}. {s}" for i, s in enumerate(steps, 1))
    return text[:DESCRIPTION_LIMIT].rsplit(" ", 1)[0] + "..." if len(text) > DESCRIPTION_LIMIT else text


def main(path):
    data = json.load(open(path, encoding="utf-8"))
    by_name = {d["name"]: d for d in data}

    images = {}
    consumed = set()
    for ours, theirs in ALIASES.items():
        entry = by_name.get(theirs)
        if entry is None:
            print(f"MISSING dataset entry for {ours!r} -> {theirs!r}")
            continue
        consumed.add(theirs)
        images[ours] = {
            "image": entry["images"][0] if entry.get("images") else "",
            "description": describe(entry),
        }

    extras = []
    seen_norm = {re.sub(r"[^a-z0-9]", "", n.lower()) for n in ALIASES}
    for d in data:
        if d["name"] in consumed or d.get("category") in SKIP_CATEGORIES:
            continue
        norm = re.sub(r"[^a-z0-9]", "", d["name"].lower())
        if norm in seen_norm:
            continue
        seen_norm.add(norm)
        primary = (d.get("primaryMuscles") or ["full body"])[0]
        equipment = EQUIPMENT_MAP.get(d.get("equipment"), d.get("equipment") or "none")
        extras.append(
            {
                "name": d["name"],
                "category": "cardio" if d.get("category") == "cardio" else "strength",
                "muscle_group": MUSCLE_MAP.get(primary, primary),
                "equipment": equipment,
                "is_bodyweight": equipment == "bodyweight",
                "image": d["images"][0] if d.get("images") else "",
                "description": describe(d),
            }
        )

    out_dir = os.path.join(os.path.dirname(__file__), "..", "workouts", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "exercise_catalog.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"images": images, "extras": extras}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"matched {len(images)} curated, {len(extras)} extras -> {os.path.normpath(out_path)} "
          f"({os.path.getsize(out_path) // 1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1])
