from datetime import date as date_type, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import get_db
from ..models import MEALS, BodyMeasurement, FoodEntry, NutritionDay
from ..schemas import NutritionDayIn, NutritionDayOut, NutritionSummaryDay

router = APIRouter(prefix="/api/v1/nutrition", tags=["nutrition"])

SUMMARY_RANGES = {"week": 7, "month": 30, "quarter": 90}

# The server runs in UTC but users log in their own timezone, so for the
# first hours of an Indian morning the user's "today" is already the server's
# "tomorrow". Rejecting that as a future date made late-night/early-morning
# logging fail with a 400, so allow one day of slack (covers every timezone).
FUTURE_TOLERANCE = timedelta(days=1)


def reject_future(day: date_type) -> None:
    if day > date_type.today() + FUTURE_TOLERANCE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Can't log or edit a future date.")


@router.get("/summary", response_model=list[NutritionSummaryDay])
def get_summary(
    range_param: str = Query("week", alias="range"),
    end: date_type | None = Query(None, description="Last day of the window; defaults to today. Pass the client's local date."),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Per-day calories, macros, water and per-meal calories over the last
    7/30/90 days, zero-filled so charts get one point per day. Parameter is
    named range_param (not range) to avoid shadowing the builtin range() used
    below, same trap analytics-service's ReportView already avoids.
    """
    days_count = SUMMARY_RANGES.get(range_param, 7)
    last_day = min(end or date_type.today(), date_type.today() + FUTURE_TOLERANCE)
    start = last_day - timedelta(days=days_count - 1)

    rows = (
        db.query(NutritionDay)
        .filter(NutritionDay.user_id == user.id, NutritionDay.date >= start, NutritionDay.date <= last_day)
        .all()
    )
    by_date = {row.date: row for row in rows}

    result = []
    for i in range(days_count):
        d = start + timedelta(days=i)
        day = by_date.get(d)
        meal_calories = {meal: 0 for meal in MEALS}
        if day:
            for entry in day.entries:
                meal_calories[entry.meal if entry.meal in meal_calories else "snack"] += entry.calories
        result.append(
            NutritionSummaryDay(
                date=d,
                calories=sum(meal_calories.values()),
                water_ml=day.water_ml if day else 0,
                protein_g=round(sum(e.protein_g for e in day.entries), 1) if day else 0,
                carbs_g=round(sum(e.carbs_g for e in day.entries), 1) if day else 0,
                fat_g=round(sum(e.fat_g for e in day.entries), 1) if day else 0,
                meal_calories=meal_calories,
                logged=bool(day and day.entries),
            )
        )
    return result


@router.get("/days/{date_str}", response_model=NutritionDayOut | None)
def get_day(
    date_str: date_type,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The caller's day, or null if nothing logged, same contract as
    Workout Service's WorkoutDayView.get."""
    day = db.query(NutritionDay).filter_by(user_id=user.id, date=date_str).first()
    if day is None:
        return None
    return NutritionDayOut.from_day(day)


@router.put("/days/{date_str}", response_model=NutritionDayOut)
def put_day(
    date_str: date_type,
    body: NutritionDayIn,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upserts the whole day, scoped to the caller. The client always PUTs
    the entire day's entries on every change, same upsert-the-whole-day
    contract as Workout Service."""
    reject_future(date_str)

    day = db.query(NutritionDay).filter_by(user_id=user.id, date=date_str).first()
    if day is None:
        day = NutritionDay(id=uuid4(), user_id=user.id, date=date_str)
        db.add(day)
    else:
        day.entries.clear()  # cascade="all, delete-orphan" removes the old rows

    day.water_ml = body.water_ml

    # Older builds send weight_kg with every save; v3 builds omit it and log
    # weight through /measurements. Only touch it when it was actually sent.
    if "weight_kg" in body.model_fields_set:
        day.weight_kg = body.weight_kg
        if body.weight_kg is not None:
            _mirror_weight_to_measurements(db, user.id, date_str, body.weight_kg)

    for i, entry in enumerate(body.entries):
        day.entries.append(
            FoodEntry(
                id=uuid4(),
                name=entry.name,
                quantity_label=entry.quantity_label,
                calories=entry.calories,
                protein_g=entry.protein_g,
                carbs_g=entry.carbs_g,
                fat_g=entry.fat_g,
                fiber_g=entry.fiber_g,
                sugar_g=entry.sugar_g,
                sodium_mg=entry.sodium_mg,
                meal=entry.meal,
                eaten_at=entry.eaten_at,
                serving_amount=entry.serving_amount,
                serving_unit=entry.serving_unit,
                food_id=entry.food_id,
                order=i,
            )
        )

    db.commit()
    db.refresh(day)
    return NutritionDayOut.from_day(day)


def _mirror_weight_to_measurements(db: Session, user_id, day: date_type, kg: float) -> None:
    """Keeps the weight trend chart complete for people still on a build that
    logs weight via the day endpoint."""
    row = db.query(BodyMeasurement).filter_by(user_id=user_id, date=day, kind="weight").first()
    if row is None:
        db.add(BodyMeasurement(id=uuid4(), user_id=user_id, date=day, kind="weight", value=kg))
    else:
        row.value = kg
