import uuid
from datetime import date as date_type, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

MEALS = ("breakfast", "lunch", "dinner", "snack")


class NutritionDay(Base):
    """One row per user per calendar date, same shape as Workout Service's
    WorkoutDay. user_id is not a DB FK: Auth Service owns that table;
    ownership is enforced at the application layer (schema doc 5 convention:
    no service queries another service's database directly)."""

    __tablename__ = "nutrition_day"
    __table_args__ = (UniqueConstraint("user_id", "date", name="unique_user_nutrition_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    water_ml: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Kept for builds that predate BodyMeasurement; new builds read/write
    # weight through /measurements instead (see routers/measurements.py).
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    entries: Mapped[list["FoodEntry"]] = relationship(
        back_populates="day", cascade="all, delete-orphan", order_by="FoodEntry.order"
    )


class FoodEntry(Base):
    """A food item eaten within a day: absolute macros for the amount eaten
    (not per 100g), plus enough about the serving to show and re-edit it."""

    __tablename__ = "food_entry"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    day_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("nutrition_day.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    quantity_label: Mapped[str] = mapped_column(String(60), nullable=False, default="")
    calories: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    fiber_g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    sugar_g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    sodium_mg: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    meal: Mapped[str] = mapped_column(String(12), nullable=False, default="snack")
    eaten_at: Mapped[str | None] = mapped_column(String(5), nullable=True)  # local "HH:MM"
    serving_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    serving_unit: Mapped[str] = mapped_column(String(10), nullable=False, default="g")
    food_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    day: Mapped["NutritionDay"] = relationship(back_populates="entries")


class Food(Base):
    """A searchable food, nutrients per 100 g. owner_user_id NULL means the
    shared catalogue; otherwise it is that user's own "My Food"."""

    __tablename__ = "food"
    __table_args__ = (UniqueConstraint("owner_user_id", "name", "brand", name="unique_food_per_owner"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True, nullable=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="curated")
    name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    brand: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    calories_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    protein_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    carbs_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    fat_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    fiber_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    sugar_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    sodium_mg_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    serving_g: Mapped[float] = mapped_column(Float, nullable=False, default=100)
    serving_label: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    is_approx: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class NutritionGoal(Base):
    """One row per user: daily targets the Insights and Home screens compare against."""

    __tablename__ = "nutrition_goal"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    calories: Mapped[int] = mapped_column(Integer, nullable=False, default=2000)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False, default=100)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False, default=250)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False, default=65)
    water_ml: Mapped[int] = mapped_column(Integer, nullable=False, default=2500)
    target_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BodyMeasurement(Base):
    """One value per user, per date, per kind (weight in kg, body_fat in %,
    everything else in cm). Stored metric; any unit conversion is display-only."""

    __tablename__ = "body_measurement"
    __table_args__ = (UniqueConstraint("user_id", "date", "kind", name="unique_user_date_kind"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
