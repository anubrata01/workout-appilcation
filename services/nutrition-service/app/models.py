import uuid
from datetime import date as date_type, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class NutritionDay(Base):
    """One row per user per calendar date — same shape as Workout Service's
    WorkoutDay. user_id is not a DB FK — Auth Service owns that table;
    ownership is enforced at the application layer (schema doc 5 convention:
    no service queries another service's database directly)."""

    __tablename__ = "nutrition_day"
    __table_args__ = (UniqueConstraint("user_id", "date", name="unique_user_nutrition_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    water_ml: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    entries: Mapped[list["FoodEntry"]] = relationship(
        back_populates="day", cascade="all, delete-orphan", order_by="FoodEntry.order"
    )


class FoodEntry(Base):
    """A manually-logged food item within a day — name plus its macros,
    typed in directly by the user (no shared food library for this pass)."""

    __tablename__ = "food_entry"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    day_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("nutrition_day.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity_label: Mapped[str] = mapped_column(String(60), nullable=False, default="")
    calories: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    day: Mapped["NutritionDay"] = relationship(back_populates="entries")
