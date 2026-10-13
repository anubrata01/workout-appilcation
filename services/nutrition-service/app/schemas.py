from datetime import date as date_type
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

Meal = Literal["breakfast", "lunch", "dinner", "snack"]
MeasurementKind = Literal[
    "weight", "body_fat", "chest", "waist", "hips", "neck", "shoulders", "bicep", "forearm", "thigh", "calf"
]
HHMM = r"^([01]\d|2[0-3]):[0-5]\d$"


class FoodEntryIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    quantity_label: str = ""
    calories: int = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    sugar_g: float = 0
    sodium_mg: float = 0
    # Added in v3: older app builds omit all of these, so every one is optional.
    meal: Meal = "snack"
    eaten_at: str | None = Field(default=None, pattern=HHMM)
    serving_amount: float | None = Field(default=None, ge=0)
    serving_unit: str = Field(default="g", max_length=10)
    food_id: UUID | None = None


class FoodEntryOut(BaseModel):
    id: str
    name: str
    quantity_label: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    sugar_g: float
    sodium_mg: float
    meal: str
    eaten_at: str | None
    serving_amount: float | None
    serving_unit: str
    food_id: str | None

    @classmethod
    def from_entry(cls, entry) -> "FoodEntryOut":
        return cls(
            id=f"food-{entry.id}",
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
            food_id=str(entry.food_id) if entry.food_id else None,
        )


class NutritionDayIn(BaseModel):
    # No `date` field here deliberately: the URL's date_str is the single
    # source of truth (same convention as Workout Service's WorkoutDayView),
    # so the client never sends it twice.
    water_ml: int = 0
    # Only applied when the client actually sends it (see put_day), so v3
    # builds, which log weight through /measurements, don't wipe it.
    weight_kg: float | None = None
    entries: list[FoodEntryIn] = Field(default_factory=list)


class NutritionDayOut(BaseModel):
    date: date_type
    water_ml: int
    weight_kg: float | None
    entries: list[FoodEntryOut]

    @classmethod
    def from_day(cls, day) -> "NutritionDayOut":
        return cls(
            date=day.date,
            water_ml=day.water_ml,
            weight_kg=day.weight_kg,
            entries=[FoodEntryOut.from_entry(e) for e in day.entries],
        )


class NutritionSummaryDay(BaseModel):
    date: date_type
    calories: int
    water_ml: int
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    meal_calories: dict[str, int] = Field(default_factory=dict)
    logged: bool = False


class FoodOut(BaseModel):
    id: str
    name: str
    brand: str
    source: str
    calories_100g: float
    protein_100g: float
    carbs_100g: float
    fat_100g: float
    fiber_100g: float
    sugar_100g: float
    sodium_mg_100g: float
    serving_g: float
    serving_label: str
    is_approx: bool
    is_mine: bool

    @classmethod
    def from_food(cls, food) -> "FoodOut":
        return cls(
            id=str(food.id),
            name=food.name,
            brand=food.brand,
            source=food.source,
            calories_100g=food.calories_100g,
            protein_100g=food.protein_100g,
            carbs_100g=food.carbs_100g,
            fat_100g=food.fat_100g,
            fiber_100g=food.fiber_100g,
            sugar_100g=food.sugar_100g,
            sodium_mg_100g=food.sodium_mg_100g,
            serving_g=food.serving_g,
            serving_label=food.serving_label,
            is_approx=food.is_approx,
            is_mine=food.owner_user_id is not None,
        )


class FoodIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    brand: str = Field(default="", max_length=120)
    calories_100g: float = Field(default=0, ge=0, le=1000)
    protein_100g: float = Field(default=0, ge=0, le=100)
    carbs_100g: float = Field(default=0, ge=0, le=100)
    fat_100g: float = Field(default=0, ge=0, le=100)
    fiber_100g: float = Field(default=0, ge=0, le=100)
    sugar_100g: float = Field(default=0, ge=0, le=100)
    sodium_mg_100g: float = Field(default=0, ge=0, le=40000)
    serving_g: float = Field(default=100, gt=0, le=5000)
    serving_label: str = Field(default="", max_length=40)


class GoalIn(BaseModel):
    calories: int = Field(ge=500, le=10000)
    protein_g: float = Field(ge=0, le=1000)
    carbs_g: float = Field(ge=0, le=2000)
    fat_g: float = Field(ge=0, le=1000)
    water_ml: int = Field(default=2500, ge=0, le=20000)
    target_weight_kg: float | None = Field(default=None, gt=0, le=500)


class GoalOut(GoalIn):
    pass


class MeasurementIn(BaseModel):
    value: float


class MeasurementOut(BaseModel):
    date: date_type
    kind: str
    value: float
