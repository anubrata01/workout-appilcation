from datetime import date as date_type

from pydantic import BaseModel, Field


class FoodEntryIn(BaseModel):
    name: str
    quantity_label: str = ""
    calories: int = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0


class FoodEntryOut(BaseModel):
    id: str
    name: str
    quantity_label: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float

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
        )


class NutritionDayIn(BaseModel):
    # No `date` field here deliberately — the URL's date_str is the single
    # source of truth (same convention as Workout Service's WorkoutDayView),
    # so the client never sends it twice.
    water_ml: int = 0
    entries: list[FoodEntryIn] = Field(default_factory=list)


class NutritionDayOut(BaseModel):
    date: date_type
    water_ml: int
    entries: list[FoodEntryOut]

    @classmethod
    def from_day(cls, day) -> "NutritionDayOut":
        return cls(date=day.date, water_ml=day.water_ml, entries=[FoodEntryOut.from_entry(e) for e in day.entries])


class NutritionSummaryDay(BaseModel):
    date: date_type
    calories: int
    water_ml: int
