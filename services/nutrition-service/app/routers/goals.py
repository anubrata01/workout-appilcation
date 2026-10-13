from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import get_db
from ..models import NutritionGoal
from ..schemas import GoalIn, GoalOut

router = APIRouter(prefix="/api/v1/nutrition/goals", tags=["goals"])


def _out(goal: NutritionGoal) -> GoalOut:
    return GoalOut(
        calories=goal.calories,
        protein_g=goal.protein_g,
        carbs_g=goal.carbs_g,
        fat_g=goal.fat_g,
        water_ml=goal.water_ml,
        target_weight_kg=goal.target_weight_kg,
    )


@router.get("", response_model=GoalOut | None)
def get_goals(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """The caller's targets, or null if they haven't set any yet (the app then
    shows its "set your goals" prompt instead of inventing numbers)."""
    goal = db.query(NutritionGoal).filter_by(user_id=user.id).first()
    return _out(goal) if goal else None


@router.put("", response_model=GoalOut)
def put_goals(body: GoalIn, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = db.query(NutritionGoal).filter_by(user_id=user.id).first()
    if goal is None:
        goal = NutritionGoal(user_id=user.id)
        db.add(goal)
    goal.calories = body.calories
    goal.protein_g = body.protein_g
    goal.carbs_g = body.carbs_g
    goal.fat_g = body.fat_g
    goal.water_ml = body.water_ml
    goal.target_weight_kg = body.target_weight_kg
    db.commit()
    db.refresh(goal)
    return _out(goal)
