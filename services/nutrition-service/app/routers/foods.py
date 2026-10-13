import time
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import get_db
from ..models import Food, FoodEntry, NutritionDay
from ..schemas import FoodEntryOut, FoodIn, FoodOut

router = APIRouter(prefix="/api/v1/nutrition/foods", tags=["foods"])

MIN_QUERY_LENGTH = 2
MAX_RESULTS = 50

# The shared catalogue only changes when the seed script runs, so identical
# searches (people type "chicken", "rice", "egg" constantly) are answered from
# process memory instead of re-scanning the table. Per-worker, bounded, and
# short-lived enough that a re-seed shows up quickly. A user's own "My Food"
# rows are never cached; they're tiny and must reflect edits immediately.
CACHE_TTL_SECONDS = 600
CACHE_MAX_ENTRIES = 500
_search_cache: dict[tuple[str, int], tuple[float, list[FoodOut]]] = {}


def clear_search_cache() -> None:
    _search_cache.clear()


def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _rank(food: Food, q: str) -> tuple[int, int, str]:
    name = food.name.lower()
    if name == q:
        bucket = 0
    elif name.startswith(q):
        bucket = 1
    elif f" {q}" in name:
        bucket = 2
    else:
        bucket = 3
    return (bucket, len(name), name)


def _matching(query, q: str):
    pattern = f"%{_escape_like(q)}%"
    return query.filter(or_(Food.name.ilike(pattern, escape="\\"), Food.brand.ilike(pattern, escape="\\")))


def _catalogue_search(db: Session, q: str, limit: int) -> list[FoodOut]:
    key = (q, limit)
    cached = _search_cache.get(key)
    now = time.monotonic()
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    rows = _matching(db.query(Food).filter(Food.owner_user_id.is_(None)), q).limit(300).all()
    rows.sort(key=lambda f: _rank(f, q))
    result = [FoodOut.from_food(f) for f in rows[:limit]]

    if len(_search_cache) >= CACHE_MAX_ENTRIES:
        _search_cache.clear()
    _search_cache[key] = (now, result)
    return result


@router.get("/search", response_model=list[FoodOut])
def search_foods(
    response: Response,
    q: str = Query("", max_length=80),
    limit: int = Query(20, ge=1, le=MAX_RESULTS),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Own foods first, then the shared catalogue ranked exact > prefix > word-start > contains."""
    q = q.strip().lower()
    if len(q) < MIN_QUERY_LENGTH:
        return []
    mine = _matching(db.query(Food).filter(Food.owner_user_id == user.id), q).all()
    mine.sort(key=lambda f: _rank(f, q))
    own = [FoodOut.from_food(f) for f in mine]
    response.headers["Cache-Control"] = "private, max-age=60"
    return (own + _catalogue_search(db, q, limit))[:limit]


@router.get("/mine", response_model=list[FoodOut])
def my_foods(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Food).filter(Food.owner_user_id == user.id).order_by(Food.name).all()
    return [FoodOut.from_food(f) for f in rows]


@router.post("", response_model=FoodOut, status_code=status.HTTP_201_CREATED)
def create_food(body: FoodIn, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    brand = body.brand.strip()
    name = body.name.strip()
    exists = db.query(Food).filter_by(owner_user_id=user.id, name=name, brand=brand).first()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "You already saved a food with that name.")
    food = Food(
        id=uuid4(),
        owner_user_id=user.id,
        source="custom",
        name=name,
        brand=brand,
        calories_100g=body.calories_100g,
        protein_100g=body.protein_100g,
        carbs_100g=body.carbs_100g,
        fat_100g=body.fat_100g,
        fiber_100g=body.fiber_100g,
        sugar_100g=body.sugar_100g,
        sodium_mg_100g=body.sodium_mg_100g,
        serving_g=body.serving_g,
        serving_label=body.serving_label,
        is_approx=False,
    )
    db.add(food)
    db.commit()
    db.refresh(food)
    return FoodOut.from_food(food)


@router.delete("/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_food(food_id: UUID, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    food = db.query(Food).filter_by(id=food_id, owner_user_id=user.id).first()
    if food is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Food not found.")
    db.delete(food)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/recent", response_model=list[FoodEntryOut])
def recent_foods(
    limit: int = Query(15, ge=1, le=50),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The last distinct things this user ate (newest first), as the entries
    they logged, so re-adding one is a single tap with the same amounts."""
    rows = (
        db.query(FoodEntry)
        .join(NutritionDay, FoodEntry.day_id == NutritionDay.id)
        .filter(NutritionDay.user_id == user.id)
        .order_by(NutritionDay.date.desc(), FoodEntry.order.desc())
        .limit(300)
        .all()
    )
    seen: set[str] = set()
    result = []
    for entry in rows:
        key = entry.name.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(FoodEntryOut.from_entry(entry))
        if len(result) >= limit:
            break
    return result
