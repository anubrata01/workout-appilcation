from datetime import date, timedelta

from .models import DailyVolumeSnapshot, ExerciseDailyBest, PersonalRecord, StreakState


def _day_volume_and_calories(day_payload: dict) -> tuple[float, int]:
    """Same formula as the prototype's estimateCalories (app flow doc, PRD 5.1)."""
    volume = 0.0
    for exercise in day_payload.get("exercises", []):
        for s in exercise.get("sets", []):
            if s.get("done"):
                volume += s.get("weight", 0) * s.get("reps", 0)
    calories = round(volume * 0.1 + (90 if volume > 0 else 0))
    return volume, calories


def _sync_exercise_daily_best(user_id: str, log_date: date, day_payload: dict) -> set[str]:
    """
    Makes ExerciseDailyBest for this date match today's payload exactly —
    upserts exercises that still have a done set, deletes rows for exercises
    that no longer do (set undone) or aren't in the day at all anymore
    (exercise removed). Returns every exercise name touched by this sync
    (before or after), which is exactly the set that needs its PersonalRecord
    recomputed.

    A day's payload can contain more than one Exercise entry with the same
    name — a second session the same day appends its own entries rather than
    merging into the first's (Workout Service serializers.py). Sets are
    grouped by name across every entry before picking the best, so the day's
    true highest set wins regardless of which session logged it, instead of
    whichever entry happened to be processed last silently overwriting an
    earlier, better one.
    """
    previously_recorded = set(
        ExerciseDailyBest.objects.filter(user_id=user_id, date=log_date).values_list("exercise_name", flat=True)
    )

    done_sets_by_name: dict[str, list[dict]] = {}
    for exercise in day_payload.get("exercises", []):
        done_sets = [s for s in exercise.get("sets", []) if s.get("done")]
        if not done_sets:
            continue
        done_sets_by_name.setdefault(exercise["name"], []).extend(done_sets)

    for name, done_sets in done_sets_by_name.items():
        best = max(done_sets, key=lambda s: (s["weight"], s["reps"]))
        ExerciseDailyBest.objects.update_or_create(
            user_id=user_id,
            exercise_name=name,
            date=log_date,
            defaults={"weight": best["weight"], "reps": best["reps"]},
        )

    names_with_done_sets = set(done_sets_by_name)
    stale_names = previously_recorded - names_with_done_sets
    if stale_names:
        ExerciseDailyBest.objects.filter(user_id=user_id, date=log_date, exercise_name__in=stale_names).delete()

    return previously_recorded | names_with_done_sets


def _recompute_personal_record(user_id: str, exercise_name: str) -> None:
    """
    Rebuilds this exercise's PersonalRecord from every remaining
    ExerciseDailyBest row — never incrementally, so a deletion anywhere in
    history is reflected correctly, including falling back to the previous
    best or disappearing entirely if no history is left (schema doc 3).
    """
    history = list(ExerciseDailyBest.objects.filter(user_id=user_id, exercise_name=exercise_name))

    if not history:
        PersonalRecord.objects.filter(user_id=user_id, exercise_name=exercise_name).delete()
        return

    best = max(history, key=lambda h: (h.weight, h.reps))
    latest = max(history, key=lambda h: h.date)
    rest = [h for h in history if h is not best]
    previous = max(rest, key=lambda h: (h.weight, h.reps)) if rest else None

    if latest is best:
        trend = "up" if previous is None or best.weight > previous.weight else "same"
    elif latest.weight == best.weight:
        trend = "same"
    else:
        trend = "down"

    PersonalRecord.objects.update_or_create(
        user_id=user_id,
        exercise_name=exercise_name,
        defaults={
            "best_weight": best.weight,
            "best_reps": best.reps,
            "best_date": best.date,
            "previous_weight": previous.weight if previous else None,
            "trend": trend,
            "last_weight": latest.weight,
            "last_reps": latest.reps,
            "last_date": latest.date,
        },
    )


def _recompute_streak(user_id: str) -> None:
    """Walks DailyVolumeSnapshot backward from the most recent logged day (schema doc 3)."""
    dates = list(
        DailyVolumeSnapshot.objects.filter(user_id=user_id, volume__gt=0)
        .order_by("-date")
        .values_list("date", flat=True)
    )
    if not dates:
        StreakState.objects.update_or_create(
            user_id=user_id, defaults={"current_streak": 0, "longest_streak": 0, "last_logged_date": None}
        )
        return

    current_streak = 1
    cursor = dates[0]
    for d in dates[1:]:
        if cursor - d == timedelta(days=1):
            current_streak += 1
            cursor = d
        else:
            break

    longest_streak = 1
    run = 1
    for prev, cur in zip(dates, dates[1:]):
        if prev - cur == timedelta(days=1):
            run += 1
        else:
            run = 1
        longest_streak = max(longest_streak, run)
    longest_streak = max(longest_streak, current_streak)

    existing = StreakState.objects.filter(user_id=user_id).first()
    longest_streak = max(longest_streak, existing.longest_streak if existing else 0)

    StreakState.objects.update_or_create(
        user_id=user_id,
        defaults={
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "last_logged_date": dates[0],
        },
    )


def recompute_for_day(user_id: str, date_str: str, day_payload: dict) -> None:
    """
    Entry point called by the event consumer on every save — including edits
    that remove sets or whole exercises, not just ones that add a PR (Workout
    Service now publishes unconditionally on every PUT).
    """
    log_date = date.fromisoformat(date_str)

    volume, calories = _day_volume_and_calories(day_payload)
    DailyVolumeSnapshot.objects.update_or_create(
        user_id=user_id,
        date=log_date,
        defaults={"volume": volume, "calories": calories},
    )

    affected_names = _sync_exercise_daily_best(user_id, log_date, day_payload)
    for name in affected_names:
        _recompute_personal_record(user_id, name)

    _recompute_streak(user_id)
