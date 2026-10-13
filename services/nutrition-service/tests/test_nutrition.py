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
DAY_AFTER_TOMORROW = (date.today() + timedelta(days=2)).isoformat()


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


def test_cannot_log_a_date_beyond_timezone_slack():
    user_a = str(uuid.uuid4())
    resp = client.put(
        f"/api/v1/nutrition/days/{DAY_AFTER_TOMORROW}",
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


def test_body_weight_saved_and_read_back():
    user_a = str(uuid.uuid4())
    auth = f"Bearer {make_access_token(user_a)}"

    put = client.put(
        f"/api/v1/nutrition/days/{TODAY}", json={"weight_kg": 72.4, "entries": []}, headers={"Authorization": auth}
    )
    assert put.status_code == 200
    assert put.json()["weight_kg"] == 72.4

    get = client.get(f"/api/v1/nutrition/days/{TODAY}", headers={"Authorization": auth})
    assert get.json()["weight_kg"] == 72.4


def test_body_weight_defaults_to_null_when_omitted():
    user_a = str(uuid.uuid4())
    auth = f"Bearer {make_access_token(user_a)}"
    resp = client.put(f"/api/v1/nutrition/days/{TODAY}", json={"entries": []}, headers={"Authorization": auth})
    assert resp.json()["weight_kg"] is None


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


# ---------------------------------------------------------------- v3 additions


def _auth(user_id=None):
    return {"Authorization": f"Bearer {make_access_token(user_id or uuid.uuid4())}"}


def test_logging_just_ahead_of_server_date_is_allowed_for_other_timezones():
    # The server runs in UTC; in India it is already "tomorrow" there for the
    # first hours of the morning, and that must not be rejected as the future.
    resp = client.put(f"/api/v1/nutrition/days/{TOMORROW}", json={"entries": []}, headers=_auth())
    assert resp.status_code == 200


def test_old_clients_without_meal_fields_still_save_and_default_to_snack():
    headers = _auth()
    old_style = {"entries": [{"name": "Rice", "calories": 200, "protein_g": 4, "carbs_g": 44, "fat_g": 0}]}
    put = client.put(f"/api/v1/nutrition/days/{TODAY}", json=old_style, headers=headers)
    assert put.status_code == 200
    entry = put.json()["entries"][0]
    assert entry["meal"] == "snack"
    assert entry["serving_unit"] == "g"
    assert entry["serving_amount"] is None
    assert entry["fiber_g"] == 0


def test_meal_serving_and_extra_nutrients_round_trip():
    headers = _auth()
    body = {
        "entries": [
            {
                "name": "Oats",
                "calories": 190,
                "protein_g": 6.6,
                "carbs_g": 33.9,
                "fat_g": 3.3,
                "fiber_g": 5.1,
                "sugar_g": 0.5,
                "sodium_mg": 3,
                "meal": "breakfast",
                "eaten_at": "08:15",
                "serving_amount": 50,
                "serving_unit": "g",
            }
        ]
    }
    client.put(f"/api/v1/nutrition/days/{TODAY}", json=body, headers=headers)
    got = client.get(f"/api/v1/nutrition/days/{TODAY}", headers=headers).json()["entries"][0]
    assert (got["meal"], got["eaten_at"], got["serving_amount"], got["fiber_g"]) == ("breakfast", "08:15", 50, 5.1)


@pytest.mark.parametrize("bad", [{"meal": "brunch"}, {"eaten_at": "25:99"}, {"eaten_at": "8:5"}])
def test_invalid_meal_or_time_is_rejected(bad):
    entry = {"name": "X", "calories": 1, **bad}
    assert client.put(f"/api/v1/nutrition/days/{TODAY}", json={"entries": [entry]}, headers=_auth()).status_code == 422


def test_saving_a_day_without_weight_does_not_wipe_an_existing_weight():
    headers = _auth()
    client.put(f"/api/v1/nutrition/days/{TODAY}", json={"weight_kg": 70.5, "entries": []}, headers=headers)
    client.put(f"/api/v1/nutrition/days/{TODAY}", json={"entries": [{"name": "Egg", "calories": 70}]}, headers=headers)
    assert client.get(f"/api/v1/nutrition/days/{TODAY}", headers=headers).json()["weight_kg"] == 70.5


def test_old_style_weight_save_is_mirrored_into_measurements():
    headers = _auth()
    client.put(f"/api/v1/nutrition/days/{TODAY}", json={"weight_kg": 70.5, "entries": []}, headers=headers)
    latest = client.get("/api/v1/nutrition/measurements/latest", headers=headers).json()
    assert [(m["kind"], m["value"]) for m in latest] == [("weight", 70.5)]


# ---- summary


def test_summary_has_macros_and_per_meal_calories_and_supports_quarter():
    headers = _auth()
    entries = [
        {"name": "Oats", "calories": 300, "protein_g": 10, "carbs_g": 50, "fat_g": 5, "meal": "breakfast"},
        {"name": "Chicken", "calories": 400, "protein_g": 40, "carbs_g": 0, "fat_g": 10, "meal": "lunch"},
        {"name": "Nuts", "calories": 150, "protein_g": 5, "carbs_g": 5, "fat_g": 12, "meal": "snack"},
    ]
    client.put(f"/api/v1/nutrition/days/{TODAY}", json={"entries": entries}, headers=headers)

    week = client.get(f"/api/v1/nutrition/summary?range=week&end={TODAY}", headers=headers).json()
    assert len(week) == 7
    today = week[-1]
    assert today["date"] == TODAY and today["logged"] is True
    assert today["calories"] == 850
    assert today["meal_calories"] == {"breakfast": 300, "lunch": 400, "dinner": 0, "snack": 150}
    assert (today["protein_g"], today["carbs_g"], today["fat_g"]) == (55, 55, 27)
    assert week[0]["logged"] is False and week[0]["meal_calories"]["lunch"] == 0

    quarter = client.get(f"/api/v1/nutrition/summary?range=quarter&end={TODAY}", headers=headers).json()
    assert len(quarter) == 90


def test_summary_is_per_user():
    client.put(f"/api/v1/nutrition/days/{TODAY}", json={"entries": [{"name": "X", "calories": 500}]}, headers=_auth())
    other = client.get(f"/api/v1/nutrition/summary?range=week&end={TODAY}", headers=_auth()).json()
    assert sum(d["calories"] for d in other) == 0


# ---- foods


@pytest.fixture
def seeded_foods():
    from app.routers.foods import clear_search_cache
    from app.seed_foods import seed

    clear_search_cache()
    return seed()


def test_seed_is_idempotent(seeded_foods):
    from app.seed_foods import seed

    created, updated = seed()
    assert created == 0 and updated == seeded_foods[0] > 150


def test_search_ranks_exact_then_prefix_then_contains(seeded_foods):
    results = client.get("/api/v1/nutrition/foods/search?q=paneer", headers=_auth()).json()
    names = [r["name"] for r in results]
    assert names[0] == "Paneer"  # exact match beats "Palak paneer"/"Paneer butter masala"
    assert "Palak paneer" in names and names.index("Paneer butter masala") < names.index("Palak paneer")
    assert results[0]["is_approx"] is True and results[0]["is_mine"] is False


def test_search_needs_two_characters_and_escapes_wildcards(seeded_foods):
    headers = _auth()
    assert client.get("/api/v1/nutrition/foods/search?q=a", headers=headers).json() == []
    assert client.get("/api/v1/nutrition/foods/search?q=%25", headers=headers).json() == []  # a literal "%"
    assert client.get("/api/v1/nutrition/foods/search?q=zzzzqq", headers=headers).json() == []


def test_search_is_served_from_memory_the_second_time(seeded_foods):
    from sqlalchemy import event

    from app.database import engine

    headers = _auth()
    first = client.get("/api/v1/nutrition/foods/search?q=rice", headers=headers).json()  # warms the cache

    statements = []

    def record(conn, cursor, statement, *args):
        if "FROM food" in statement and "food_entry" not in statement:
            statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        again = client.get("/api/v1/nutrition/foods/search?q=rice", headers=headers).json()
    finally:
        event.remove(engine, "before_cursor_execute", record)

    assert again == first and again
    # Only the caller's own My Food lookup touches the DB; the shared catalogue came from memory.
    assert len(statements) == 1


def test_my_foods_are_private_ranked_first_and_deletable(seeded_foods):
    mine, other = _auth(), _auth()
    body = {"name": "Mom's Rice", "calories_100g": 140, "protein_100g": 3, "carbs_100g": 30, "fat_100g": 1, "serving_g": 200}
    created = client.post("/api/v1/nutrition/foods", json=body, headers=mine)
    assert created.status_code == 201 and created.json()["is_mine"] is True

    assert client.post("/api/v1/nutrition/foods", json=body, headers=mine).status_code == 409  # duplicate

    found = client.get("/api/v1/nutrition/foods/search?q=rice", headers=mine).json()
    assert found[0]["name"] == "Mom's Rice"
    assert [f["name"] for f in client.get("/api/v1/nutrition/foods/mine", headers=mine).json()] == ["Mom's Rice"]
    assert "Mom's Rice" not in [f["name"] for f in client.get("/api/v1/nutrition/foods/search?q=rice", headers=other).json()]

    food_id = created.json()["id"]
    assert client.delete(f"/api/v1/nutrition/foods/{food_id}", headers=other).status_code == 404
    assert client.delete(f"/api/v1/nutrition/foods/{food_id}", headers=mine).status_code == 204
    assert client.get("/api/v1/nutrition/foods/mine", headers=mine).json() == []


def test_food_validation_rejects_nonsense():
    bad = {"name": "Sand", "calories_100g": -5}
    assert client.post("/api/v1/nutrition/foods", json=bad, headers=_auth()).status_code == 422


def test_recent_foods_are_distinct_newest_first_and_per_user():
    headers = _auth()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    client.put(f"/api/v1/nutrition/days/{yesterday}", json={"entries": [{"name": "Dal", "calories": 150}, {"name": "Roti", "calories": 100}]}, headers=headers)
    client.put(f"/api/v1/nutrition/days/{TODAY}", json={"entries": [{"name": "dal", "calories": 160}]}, headers=headers)

    recent = client.get("/api/v1/nutrition/foods/recent", headers=headers).json()
    assert [r["name"] for r in recent] == ["dal", "Roti"]  # case-insensitive dedupe, today's first
    assert client.get("/api/v1/nutrition/foods/recent", headers=_auth()).json() == []


# ---- goals


def test_goals_are_null_until_set_then_round_trip_and_update():
    headers = _auth()
    assert client.get("/api/v1/nutrition/goals", headers=headers).json() is None
    goals = {"calories": 2400, "protein_g": 150, "carbs_g": 280, "fat_g": 70, "water_ml": 3000, "target_weight_kg": 68.5}
    assert client.put("/api/v1/nutrition/goals", json=goals, headers=headers).json() == goals
    assert client.put("/api/v1/nutrition/goals", json={**goals, "calories": 2200}, headers=headers).json()["calories"] == 2200
    assert client.get("/api/v1/nutrition/goals", headers=headers).json()["calories"] == 2200
    assert client.get("/api/v1/nutrition/goals", headers=_auth()).json() is None


@pytest.mark.parametrize("bad", [{"calories": 100}, {"calories": 2000, "protein_g": -1}, {"calories": 2000, "water_ml": 99999}])
def test_goal_bounds(bad):
    base = {"calories": 2000, "protein_g": 100, "carbs_g": 250, "fat_g": 65}
    assert client.put("/api/v1/nutrition/goals", json={**base, **bad}, headers=_auth()).status_code == 422


# ---- measurements


def test_measurements_upsert_list_latest_and_delete():
    headers = _auth()
    d1 = (date.today() - timedelta(days=10)).isoformat()
    d2 = TODAY
    for day, kg in ((d1, 72.0), (d2, 71.2)):
        assert client.put(f"/api/v1/nutrition/measurements/{day}/weight", json={"value": kg}, headers=headers).status_code == 200
    client.put(f"/api/v1/nutrition/measurements/{d2}/weight", json={"value": 71.0}, headers=headers)  # same day overwrites
    client.put(f"/api/v1/nutrition/measurements/{d2}/waist", json={"value": 82}, headers=headers)

    weights = client.get("/api/v1/nutrition/measurements?kind=weight&range=month", headers=headers).json()
    assert [(w["date"], w["value"]) for w in weights] == [(d1, 72.0), (d2, 71.0)]  # oldest first

    latest = {m["kind"]: m["value"] for m in client.get("/api/v1/nutrition/measurements/latest", headers=headers).json()}
    assert latest == {"weight": 71.0, "waist": 82}

    assert client.delete(f"/api/v1/nutrition/measurements/{d2}/waist", headers=headers).status_code == 204
    assert client.delete(f"/api/v1/nutrition/measurements/{d2}/waist", headers=headers).status_code == 404


def test_measurement_range_window_excludes_old_readings():
    headers = _auth()
    old = (date.today() - timedelta(days=60)).isoformat()
    client.put(f"/api/v1/nutrition/measurements/{old}/weight", json={"value": 80}, headers=headers)
    client.put(f"/api/v1/nutrition/measurements/{TODAY}/weight", json={"value": 75}, headers=headers)
    assert len(client.get(f"/api/v1/nutrition/measurements?kind=weight&range=month&end={TODAY}", headers=headers).json()) == 1
    assert len(client.get("/api/v1/nutrition/measurements?kind=weight&range=all", headers=headers).json()) == 2


@pytest.mark.parametrize(
    "kind,value,status",
    [("weight", 700, 422), ("weight", 10, 422), ("body_fat", 90, 422), ("waist", 1, 422), ("waist", 82, 200), ("wingspan", 80, 422)],
)
def test_measurement_validation(kind, value, status):
    resp = client.put(f"/api/v1/nutrition/measurements/{TODAY}/{kind}", json={"value": value}, headers=_auth())
    assert resp.status_code == status


def test_measurement_weight_updates_the_days_own_weight_field_and_future_is_blocked():
    headers = _auth()
    client.put(f"/api/v1/nutrition/days/{TODAY}", json={"entries": []}, headers=headers)
    client.put(f"/api/v1/nutrition/measurements/{TODAY}/weight", json={"value": 69.9}, headers=headers)
    assert client.get(f"/api/v1/nutrition/days/{TODAY}", headers=headers).json()["weight_kg"] == 69.9
    assert client.put(f"/api/v1/nutrition/measurements/{DAY_AFTER_TOMORROW}/weight", json={"value": 70}, headers=headers).status_code == 400


def test_measurements_are_isolated_between_users():
    client.put(f"/api/v1/nutrition/measurements/{TODAY}/weight", json={"value": 70}, headers=_auth())
    assert client.get("/api/v1/nutrition/measurements/latest", headers=_auth()).json() == []


def test_new_endpoints_require_auth():
    for path in ("/foods/search?q=rice", "/foods/mine", "/foods/recent", "/goals", "/measurements", "/measurements/latest"):
        assert client.get(f"/api/v1/nutrition{path}").status_code == 401
