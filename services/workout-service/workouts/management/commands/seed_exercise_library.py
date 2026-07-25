from django.core.management.base import BaseCommand

from workouts.models import ExerciseLibraryItem

# Curated defaults so the exercise picker has real content without every user
# typing their own catalog from scratch (PRD 9 open question, resolved here
# with a reasonable default — swap/extend anytime via Django admin).
# Each tuple: (name, primary_tag, muscle_group, equipment)
EXERCISES = [
    # push
    ("Bench Press", "push", "chest", "barbell"),
    ("Incline Bench Press", "push", "chest", "barbell"),
    ("Decline Bench Press", "push", "chest", "barbell"),
    ("Dumbbell Bench Press", "push", "chest", "dumbbell"),
    ("Incline Dumbbell Press", "push", "chest", "dumbbell"),
    ("Overhead Press", "push", "shoulders", "barbell"),
    ("Dumbbell Shoulder Press", "push", "shoulders", "dumbbell"),
    ("Arnold Press", "push", "shoulders", "dumbbell"),
    ("Push Press", "push", "shoulders", "barbell"),
    ("Lateral Raise", "push", "shoulders", "dumbbell"),
    ("Front Raise", "push", "shoulders", "dumbbell"),
    ("Chest Fly", "push", "chest", "dumbbell"),
    ("Cable Fly", "push", "chest", "cable"),
    ("Pec Deck", "push", "chest", "machine"),
    ("Tricep Pushdown", "push", "triceps", "cable"),
    ("Skull Crushers", "push", "triceps", "barbell"),
    ("Close-Grip Bench Press", "push", "triceps", "barbell"),
    ("Tricep Dips", "push", "triceps", "bodyweight"),
    ("Push-Ups", "push", "chest", "bodyweight"),
    ("Diamond Push-Ups", "push", "triceps", "bodyweight"),
    # pull
    ("Deadlift", "pull", "back", "barbell"),
    ("Barbell Row", "pull", "back", "barbell"),
    ("Dumbbell Row", "pull", "back", "dumbbell"),
    ("Pull-Up", "pull", "back", "bodyweight"),
    ("Chin-Up", "pull", "back", "bodyweight"),
    ("Lat Pulldown", "pull", "back", "cable"),
    ("Seated Cable Row", "pull", "back", "cable"),
    ("T-Bar Row", "pull", "back", "barbell"),
    ("Single-Arm Row", "pull", "back", "dumbbell"),
    ("Face Pull", "pull", "shoulders", "cable"),
    ("Rear Delt Fly", "pull", "shoulders", "dumbbell"),
    ("Shrugs", "pull", "traps", "barbell"),
    ("Bicep Curl", "pull", "biceps", "dumbbell"),
    ("Barbell Curl", "pull", "biceps", "barbell"),
    ("Hammer Curl", "pull", "biceps", "dumbbell"),
    ("Preacher Curl", "pull", "biceps", "barbell"),
    ("Cable Curl", "pull", "biceps", "cable"),
    # legs
    ("Back Squat", "legs", "quads", "barbell"),
    ("Front Squat", "legs", "quads", "barbell"),
    ("Goblet Squat", "legs", "quads", "dumbbell"),
    ("Hack Squat", "legs", "quads", "machine"),
    ("Leg Press", "legs", "quads", "machine"),
    ("Leg Extension", "legs", "quads", "machine"),
    ("Romanian Deadlift", "legs", "hamstrings", "barbell"),
    ("Leg Curl", "legs", "hamstrings", "machine"),
    ("Walking Lunges", "legs", "quads", "dumbbell"),
    ("Bulgarian Split Squat", "legs", "quads", "dumbbell"),
    ("Step-Ups", "legs", "quads", "dumbbell"),
    ("Hip Thrust", "legs", "glutes", "barbell"),
    ("Glute Bridge", "legs", "glutes", "bodyweight"),
    ("Calf Raise", "legs", "calves", "machine"),
    ("Seated Calf Raise", "legs", "calves", "machine"),
    # upper (broader than push/pull — compound upper-body staples)
    ("Wide-Grip Pull-Up", "upper", "back", "bodyweight"),
    ("Cable Crossover", "upper", "chest", "cable"),
    ("Upright Row", "upper", "shoulders", "barbell"),
    ("Landmine Press", "upper", "shoulders", "barbell"),
    ("Dips", "upper", "chest", "bodyweight"),
    ("Inverted Row", "upper", "back", "bodyweight"),
    # lower (broader than legs — posterior chain + unilateral staples)
    ("Sumo Deadlift", "lower", "hamstrings", "barbell"),
    ("Single-Leg Deadlift", "lower", "hamstrings", "dumbbell"),
    ("Box Squat", "lower", "quads", "barbell"),
    ("Reverse Lunge", "lower", "glutes", "dumbbell"),
    ("Standing Calf Raise", "lower", "calves", "barbell"),
    # full body
    ("Clean & Press", "full", "full body", "barbell"),
    ("Kettlebell Swing", "full", "full body", "kettlebell"),
    ("Thruster", "full", "full body", "barbell"),
    ("Power Clean", "full", "full body", "barbell"),
    ("Clean and Jerk", "full", "full body", "barbell"),
    ("Snatch", "full", "full body", "barbell"),
    ("Burpees", "full", "full body", "bodyweight"),
    ("Man Makers", "full", "full body", "dumbbell"),
    ("Turkish Get-Up", "full", "full body", "kettlebell"),
    ("Farmer's Carry", "full", "full body", "dumbbell"),
    ("Mountain Climbers", "full", "full body", "bodyweight"),
    ("Battle Ropes", "full", "full body", "rope"),
]


class Command(BaseCommand):
    help = "Seeds the curated (owner_user_id=None) exercise library. Safe to re-run — upserts by name."

    def handle(self, *args, **options):
        created, updated = 0, 0
        for name, tag, muscle_group, equipment in EXERCISES:
            _, was_created = ExerciseLibraryItem.objects.update_or_create(
                owner_user_id=None,
                name=name,
                defaults={
                    "primary_tag": tag,
                    "muscle_group": muscle_group,
                    "equipment": equipment,
                    "is_curated": True,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded exercise library: {created} created, {updated} updated."))
