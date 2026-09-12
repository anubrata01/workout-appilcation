from django.core.management.base import BaseCommand

from workouts.models import ExerciseLibraryItem

# Curated defaults so the exercise picker has real content without every user
# typing their own catalog from scratch (PRD 9 open question, resolved here
# with a reasonable default — swap/extend anytime via Django admin).
# Each tuple: (name, muscle_group, equipment) — category defaults to
# "strength" on the model; is_bodyweight is derived below from equipment
# rather than tracked separately, since "bodyweight" already means that.
EXERCISES = [
    ("Bench Press", "chest", "barbell"),
    ("Incline Bench Press", "chest", "barbell"),
    ("Decline Bench Press", "chest", "barbell"),
    ("Dumbbell Bench Press", "chest", "dumbbell"),
    ("Incline Dumbbell Press", "chest", "dumbbell"),
    ("Overhead Press", "shoulders", "barbell"),
    ("Dumbbell Shoulder Press", "shoulders", "dumbbell"),
    ("Arnold Press", "shoulders", "dumbbell"),
    ("Push Press", "shoulders", "barbell"),
    ("Lateral Raise", "shoulders", "dumbbell"),
    ("Front Raise", "shoulders", "dumbbell"),
    ("Chest Fly", "chest", "dumbbell"),
    ("Cable Fly", "chest", "cable"),
    ("Pec Deck", "chest", "machine"),
    ("Tricep Pushdown", "triceps", "cable"),
    ("Skull Crushers", "triceps", "barbell"),
    ("Close-Grip Bench Press", "triceps", "barbell"),
    ("Tricep Dips", "triceps", "bodyweight"),
    ("Push-Ups", "chest", "bodyweight"),
    ("Diamond Push-Ups", "triceps", "bodyweight"),
    ("Deadlift", "back", "barbell"),
    ("Barbell Row", "back", "barbell"),
    ("Dumbbell Row", "back", "dumbbell"),
    ("Pull-Up", "back", "bodyweight"),
    ("Chin-Up", "back", "bodyweight"),
    ("Lat Pulldown", "back", "cable"),
    ("Seated Cable Row", "back", "cable"),
    ("T-Bar Row", "back", "barbell"),
    ("Single-Arm Row", "back", "dumbbell"),
    ("Face Pull", "shoulders", "cable"),
    ("Rear Delt Fly", "shoulders", "dumbbell"),
    ("Shrugs", "traps", "barbell"),
    ("Bicep Curl", "biceps", "dumbbell"),
    ("Barbell Curl", "biceps", "barbell"),
    ("Hammer Curl", "biceps", "dumbbell"),
    ("Preacher Curl", "biceps", "barbell"),
    ("Cable Curl", "biceps", "cable"),
    ("Back Squat", "quads", "barbell"),
    ("Front Squat", "quads", "barbell"),
    ("Goblet Squat", "quads", "dumbbell"),
    ("Hack Squat", "quads", "machine"),
    ("Leg Press", "quads", "machine"),
    ("Leg Extension", "quads", "machine"),
    ("Romanian Deadlift", "hamstrings", "barbell"),
    ("Leg Curl", "hamstrings", "machine"),
    ("Walking Lunges", "quads", "dumbbell"),
    ("Bulgarian Split Squat", "quads", "dumbbell"),
    ("Step-Ups", "quads", "dumbbell"),
    ("Hip Thrust", "glutes", "barbell"),
    ("Glute Bridge", "glutes", "bodyweight"),
    ("Calf Raise", "calves", "machine"),
    ("Seated Calf Raise", "calves", "machine"),
    ("Wide-Grip Pull-Up", "back", "bodyweight"),
    ("Cable Crossover", "chest", "cable"),
    ("Upright Row", "shoulders", "barbell"),
    ("Landmine Press", "shoulders", "barbell"),
    ("Dips", "chest", "bodyweight"),
    ("Inverted Row", "back", "bodyweight"),
    ("Sumo Deadlift", "hamstrings", "barbell"),
    ("Single-Leg Deadlift", "hamstrings", "dumbbell"),
    ("Box Squat", "quads", "barbell"),
    ("Reverse Lunge", "glutes", "dumbbell"),
    ("Standing Calf Raise", "calves", "barbell"),
    ("Clean & Press", "full body", "barbell"),
    ("Kettlebell Swing", "full body", "kettlebell"),
    ("Thruster", "full body", "barbell"),
    ("Power Clean", "full body", "barbell"),
    ("Clean and Jerk", "full body", "barbell"),
    ("Snatch", "full body", "barbell"),
    ("Burpees", "full body", "bodyweight"),
    ("Man Makers", "full body", "dumbbell"),
    ("Turkish Get-Up", "full body", "kettlebell"),
    ("Farmer's Carry", "full body", "dumbbell"),
    ("Mountain Climbers", "full body", "bodyweight"),
    ("Battle Ropes", "full body", "rope"),
    ("Pistol Squat", "quads", "bodyweight"),
    ("Wall Sit", "quads", "bodyweight"),
    ("Plank", "core", "bodyweight"),
    ("Sit-Ups", "core", "bodyweight"),
    ("Hanging Leg Raise", "core", "bodyweight"),
    ("Russian Twist", "core", "bodyweight"),
]

# Each tuple: (name, muscle_group, equipment) — seeded with category="cardio".
CARDIO_EXERCISES = [
    ("Running", "cardio", "none"),
    ("Treadmill Run", "cardio", "treadmill"),
    ("Rowing Machine", "cardio", "machine"),
    ("Cycling", "cardio", "bike"),
    ("Stationary Bike", "cardio", "bike"),
    ("Jump Rope", "cardio", "rope"),
    ("Stair Climber", "cardio", "machine"),
    ("Swimming", "cardio", "none"),
    ("Elliptical", "cardio", "machine"),
    ("Jumping Jacks", "cardio", "bodyweight"),
    ("Sprint Intervals", "cardio", "none"),
    ("Walking", "cardio", "none"),
]


class Command(BaseCommand):
    help = "Seeds the curated (owner_user_id=None) exercise library. Safe to re-run — upserts by name."

    def handle(self, *args, **options):
        created, updated = 0, 0

        for name, muscle_group, equipment in EXERCISES:
            _, was_created = ExerciseLibraryItem.objects.update_or_create(
                owner_user_id=None,
                name=name,
                defaults={
                    "category": "strength",
                    "is_bodyweight": equipment == "bodyweight",
                    "muscle_group": muscle_group,
                    "equipment": equipment,
                    "is_curated": True,
                },
            )
            created += was_created
            updated += not was_created

        for name, muscle_group, equipment in CARDIO_EXERCISES:
            _, was_created = ExerciseLibraryItem.objects.update_or_create(
                owner_user_id=None,
                name=name,
                defaults={
                    "category": "cardio",
                    "is_bodyweight": equipment in ("none", "bodyweight"),
                    "muscle_group": muscle_group,
                    "equipment": equipment,
                    "is_curated": True,
                },
            )
            created += was_created
            updated += not was_created

        self.stdout.write(self.style.SUCCESS(f"Seeded exercise library: {created} created, {updated} updated."))
