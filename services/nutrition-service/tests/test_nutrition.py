import time
import uuid
from datetime import date, timedelta
from pathlib import Path

import jwt
import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app

DEV_PRIVATE_KEY = (
    Path(__file__).resolve().parent.parent.parent.parent / "infra" / "dev-keys" / "jwt-private.pem"
).read_text()

TODAY = date.today().isoformat()
TOMORROW = (date.today() + timedelta(days=1)).isoformat()


def make_access_token(user_id, email="eater@example.com"):
    """Test-only: mints a token the same shape Auth Service issues, signed
    with the same dev keypair this service verifies against — same pattern
    as the Django services' tests."""
    now = int(time.time())
    payload = {
        "token_type": "access",
        "exp": now + 900,
        "iat": now,
        "jti": uuid.uuid4().hex,
        "sub": str(user_id),
        "email": email,
        "iss": "loaded-auth-service",
    }
    return jwt.encode(payload, DEV_PRIVATE_KEY, algorithm="RS256")


@pytest.fixture(autouse=True)
def _clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


client = TestClient(app)


def test_save_and_read_own_day():
    user_a = str(uuid.uuid4())
    auth = f"Bearer {make_access_token(user_a)}"
    payload = {
        "entries": [
            {"name": "Chicken Breast", "quantity_label": "200g", "calories": 330, "protein_g": 62, "carbs_g": 0, "fat_g": 7}
        ],
    }
    put = client.put(f"/api/v1/nutrition/days/{TODAY}", json=payload, headers={"Authorization": auth})
    assert put.status_code == 200
    assert len(put.json()["entries"]) == 1
    assert put.json()["entries"][0]["name"] == "Chicken Breast"

    get = client.get(f"/api/v1/nutrition/days/{TODAY}", headers={"Authorization": auth})
    assert get.status_code == 200
    assert get.json()["entries"][0]["calories"] == 330


def test_missing_day_returns_null():
    user_a = str(uuid.uuid4())
    auth = f"Bearer {make_access_token(user_a)}"
    get = client.get(f"/api/v1/nutrition/days/{TODAY}", headers={"Authorization": auth})
    assert get.status_code == 200
    assert get.json() is None


def test_user_b_cannot_see_user_a_day():
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())
    client.put(
        f"/api/v1/nutrition/days/{TODAY}",
        json={"entries": []},
        headers={"Authorization": f"Bearer {make_access_token(user_a)}"},
    )

    get_as_b = client.get(
        f"/api/v1/nutrition/days/{TODAY}", headers={"Authorization": f"Bearer {make_access_token(user_b)}"}
    )
    assert get_as_b.status_code == 200
    assert get_as_b.json() is None


def test_unauthenticated_request_rejected():
    resp = client.get(f"/api/v1/nutrition/days/{TODAY}")
    assert resp.status_code == 401


def test_cannot_log_future_date():
    user_a = str(uuid.uuid4())
    resp = client.put(
        f"/api/v1/nutrition/days/{TOMORROW}",
        json={"entries": []},
        headers={"Authorization": f"Bearer {make_access_token(user_a)}"},
    )
    assert resp.status_code == 400


def test_re_putting_a_day_replaces_entries_not_appends():
    user_a = str(uuid.uuid4())
    auth = f"Bearer {make_access_token(user_a)}"
    first = {"entries": [{"name": "Apple", "calories": 95, "protein_g": 0, "carbs_g": 25, "fat_g": 0}]}
    second = {"entries": [{"name": "Banana", "calories": 105, "protein_g": 1, "carbs_g": 27, "fat_g": 0}]}

    client.put(f"/api/v1/nutrition/days/{TODAY}", json=first, headers={"Authorization": auth})
    resp = client.put(f"/api/v1/nutrition/days/{TODAY}", json=second, headers={"Authorization": auth})

    assert resp.status_code == 200
    assert len(resp.json()["entries"]) == 1
    assert resp.json()["entries"][0]["name"] == "Banana"


def test_water_intake_saved_and_read_back():
    user_a = str(uuid.uuid4())
    auth = f"Bearer {make_access_token(user_a)}"

    put = client.put(
        f"/api/v1/nutrition/days/{TODAY}", json={"water_ml": 750, "entries": []}, headers={"Authorization": auth}
    )
    assert put.status_code == 200
    assert put.json()["water_ml"] == 750

    get = client.get(f"/api/v1/nutrition/days/{TODAY}", headers={"Authorization": auth})
    assert get.json()["water_ml"] == 750


def test_water_defaults_to_zero_when_omitted():
    user_a = str(uuid.uuid4())
    auth = f"Bearer {make_access_token(user_a)}"
    resp = client.put(f"/api/v1/nutrition/days/{TODAY}", json={"entries": []}, headers={"Authorization": auth})
    assert resp.json()["water_ml"] == 0


def test_summary_is_zero_filled_and_reflects_logged_days():
    user_a = str(uuid.uuid4())
    auth = f"Bearer {make_access_token(user_a)}"
    client.put(
        f"/api/v1/nutrition/days/{TODAY}",
        json={"water_ml": 500, "entries": [{"name": "Rice", "calories": 200}, {"name": "Chicken", "calories": 300}]},
        headers={"Authorization": auth},
    )

    resp = client.get("/api/v1/nutrition/summary?range=week", headers={"Authorization": auth})
    assert resp.status_code == 200
    days = resp.json()
    assert len(days) == 7  # zero-filled for the whole range, not just logged days

    today_entry = next(d for d in days if d["date"] == TODAY)
    assert today_entry["calories"] == 500  # 200 + 300 summed across entries
    assert today_entry["water_ml"] == 500

    other_days = [d for d in days if d["date"] != TODAY]
    assert all(d["calories"] == 0 and d["water_ml"] == 0 for d in other_days)
