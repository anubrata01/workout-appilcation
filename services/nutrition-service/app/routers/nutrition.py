from datetime import date as date_type
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import get_db
from ..models import FoodEntry, NutritionDay
from ..schemas import NutritionDayIn, NutritionDayOut

router = APIRouter(prefix="/api/v1/nutrition", tags=["nutrition"])


@router.get("/days/{date_str}", response_model=NutritionDayOut | None)
def get_day(
    date_str: date_type,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The caller's day, or null if nothing logged — same contract as
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
    """Upserts the whole day, scoped to the caller — the client always PUTs
    the entire day's entries on every change, same upsert-the-whole-day
    contract as Workout Service."""
    if date_str > date_type.today():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Can't log or edit a future date.")

    day = db.query(NutritionDay).filter_by(user_id=user.id, date=date_str).first()
    if day is None:
        day = NutritionDay(id=uuid4(), user_id=user.id, date=date_str)
        db.add(day)
    else:
        day.entries.clear()  # cascade="all, delete-orphan" removes the old rows

    day.water_ml = body.water_ml

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
                order=i,
            )
        )

    db.commit()
    db.refresh(day)
    return NutritionDayOut.from_day(day)
