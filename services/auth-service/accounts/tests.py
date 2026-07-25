from django.core.cache import cache
from rest_framework.test import APITestCase

from .models import User


class SignupLoginFlowTests(APITestCase):
    def setUp(self):
        # Each test stays well under the auth-write throttle on its own, but the
        # locmem cache persists across test methods in the same process — clear
        # it so one test's calls don't count against the next test's budget.
        cache.clear()

    def test_signup_then_login_then_refresh_rotation(self):
        signup = self.client.post(
            "/api/v1/auth/signup",
            {"email": "lifter@example.com", "password": "CorrectHorseBattery9"},
        )
        self.assertEqual(signup.status_code, 201)
        self.assertTrue(User.objects.filter(email="lifter@example.com").exists())

        dup = self.client.post(
            "/api/v1/auth/signup",
            {"email": "lifter@example.com", "password": "CorrectHorseBattery9"},
        )
        self.assertEqual(dup.status_code, 400)

        login = self.client.post(
            "/api/v1/auth/login",
            {"email": "lifter@example.com", "password": "CorrectHorseBattery9"},
        )
        self.assertEqual(login.status_code, 200)
        access = login.data["access"]
        refresh = login.data["refresh"]

        me = self.client.get("/api/v1/auth/me", HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["email"], "lifter@example.com")

        refreshed = self.client.post("/api/v1/auth/refresh", {"refresh": refresh})
        self.assertEqual(refreshed.status_code, 200)

        # Rotation: the original refresh token is single-use.
        reused = self.client.post("/api/v1/auth/refresh", {"refresh": refresh})
        self.assertEqual(reused.status_code, 401)

    def test_wrong_password_rejected(self):
        User.objects.create_user(email="lifter@example.com", password="CorrectHorseBattery9")
        resp = self.client.post(
            "/api/v1/auth/login", {"email": "lifter@example.com", "password": "wrong-password"}
        )
        self.assertEqual(resp.status_code, 400)

    def test_logout_revokes_refresh_token(self):
        self.client.post(
            "/api/v1/auth/signup",
            {"email": "lifter@example.com", "password": "CorrectHorseBattery9"},
        )
        login = self.client.post(
            "/api/v1/auth/login",
            {"email": "lifter@example.com", "password": "CorrectHorseBattery9"},
        )
        access, refresh = login.data["access"], login.data["refresh"]

        logout = self.client.post(
            "/api/v1/auth/logout", {"refresh": refresh}, HTTP_AUTHORIZATION=f"Bearer {access}"
        )
        self.assertEqual(logout.status_code, 204)

        reuse = self.client.post("/api/v1/auth/refresh", {"refresh": refresh})
        self.assertEqual(reuse.status_code, 401)
