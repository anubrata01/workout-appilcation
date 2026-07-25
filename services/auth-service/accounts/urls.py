from django.urls import path

from . import views

urlpatterns = [
    path("v1/auth/signup", views.SignupView.as_view()),
    path("v1/auth/login", views.LoginView.as_view()),
    path("v1/auth/google", views.GoogleAuthView.as_view()),
    path("v1/auth/refresh", views.RefreshView.as_view()),
    path("v1/auth/logout", views.LogoutView.as_view()),
    path("v1/auth/me", views.MeView.as_view()),
    path("v1/auth/password-reset/request", views.PasswordResetRequestView.as_view()),
    path("v1/auth/password-reset/confirm", views.PasswordResetConfirmView.as_view()),
    path("v1/auth/account/delete", views.AccountDeleteView.as_view()),
]
