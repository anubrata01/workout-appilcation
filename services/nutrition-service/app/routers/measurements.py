from datetime import date as date_type, timedelta
from typing import get_args
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user
from ..database import get_db
from ..models import BodyMeasurement, NutritionDay
from ..routers.nutrition import reject_future
from ..schemas import MeasurementIn, MeasurementKind, MeasurementOut

router = APIRouter(prefix="/api/v1/nutrition/measurements", tags=["measurements"])

KINDS = set(get_args(MeasurementKind))
RANGE_DAYS = {"week": 7, "month": 30, "quarter": 90, "year": 365}

# Sanity bounds in the stored (metric) unit: kg for weight, % for body_fat,
# cm for every circumference. Catches a typo like 700 kg before it wrecks a chart.
BOUNDS = {
    "weight": (20, 400),
    "body_fat": (1, 70),
}
CM_BOUNDS = (5, 300)


def _check_kind_and_value(kind: str, value: float) -> None:
    if kind not in KINDS:
        raise HTTPException(422, f"Unknown measurement kind '{kind}'.")
    low, high = BOUNDS.get(kind, CM_BOUNDS)
    if not (low <= value <= high):
        raise HTTPException(422, f"{kind} must be between {low} and {high}.")


@router.get("", response_model=list[MeasurementOut])
def list_measurements(
    kind: str | None = Query(None),
    range_param: str = Query("quarter", alias="range"),
    end: date_type | None = Query(None),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Oldest-first readings for one kind (or all kinds) over a window; range=all returns everything."""
    query = db.query(BodyMeasurement).filter(BodyMeasurement.user_id == user.id)
    if kind:
        query = query.filter(BodyMeasurement.kind == kind)
    if range_param in RANGE_DAYS:
        last_day = end or date_type.today() + timedelta(days=1)
        query = query.filter(BodyMeasurement.date >= last_day - timedelta(days=RANGE_DAYS[range_param]))
    rows = query.order_by(BodyMeasurement.date.asc()).limit(5000).all()
    return [MeasurementOut(date=r.date, kind=r.kind, value=r.value) for r in rows]


@router.get("/latest", response_model=list[MeasurementOut])
def latest_measurements(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """The most recent reading of each kind the user has ever logged."""
    rows = (
        db.query(BodyMeasurement)
        .filter(BodyMeasurement.user_id == user.id)
        .order_by(BodyMeasurement.date.desc())
        .limit(2000)
        .all()
    )
    latest: dict[str, BodyMeasurement] = {}
    for row in rows:
        latest.setdefault(row.kind, row)
    return [MeasurementOut(date=r.date, kind=r.kind, value=r.value) for r in latest.values()]


@router.put("/{date_str}/{kind}", response_model=MeasurementOut)
def put_measurement(
    date_str: date_type,
    kind: str,
    body: MeasurementIn,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reject_future(date_str)
    _check_kind_and_value(kind, body.value)
    row = db.query(BodyMeasurement).filter_by(user_id=user.id, date=date_str, kind=kind).first()
    if row is None:
        row = BodyMeasurement(id=uuid4(), user_id=user.id, date=date_str, kind=kind, value=body.value)
        db.add(row)
    else:
        row.value = body.value
    if kind == "weight":
        # Keep the day's own weight field in step so builds that still read it agree.
        day = db.query(NutritionDay).filter_by(user_id=user.id, date=date_str).first()
        if day is not None:
            day.weight_kg = body.value
    db.commit()
    return MeasurementOut(date=row.date, kind=row.kind, value=row.value)


@router.delete("/{date_str}/{kind}", status_code=status.HTTP_204_NO_CONTENT)
def delete_measurement(
    date_str: date_type,
    kind: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(BodyMeasurement).filter_by(user_id=user.id, date=date_str, kind=kind).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such reading.")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
