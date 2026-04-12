import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "auth-test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{db_path}")
    monkeypatch.setenv("JWT_SECRET", "test-secret")

    import src.main as auth_main

    auth_main = importlib.reload(auth_main)
    with TestClient(auth_main.app) as test_client:
        yield test_client


def _register(client, username="alice", email="alice@example.com", password="Password123"):
    response = client.post(
        "/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password,
            "displayName": username.title(),
        },
    )
    assert response.status_code == 200
    return response.json()


def _admin_login(client):
    response = client.post(
        "/auth/login",
        json={"email": "admin@gmail.com", "password": "Admin123"},
    )
    assert response.status_code == 200
    return response.json()


def test_register_verify_login_refresh_and_logout(client):
    registered = _register(client)
    assert registered["user"]["emailVerified"] is False

    verify_res = client.post("/auth/verify-email", json={"token": registered["verification_token"]})
    assert verify_res.status_code == 200
    assert verify_res.json()["user"]["emailVerified"] is True

    login_res = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "Password123"},
    )
    assert login_res.status_code == 200
    body = login_res.json()
    assert body["token"]
    assert body["refresh_token"]

    refresh_res = client.post("/auth/refresh", json={"refresh_token": body["refresh_token"]})
    assert refresh_res.status_code == 200
    refreshed = refresh_res.json()
    assert refreshed["token"] != body["token"]

    logout_res = client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {refreshed['token']}", "x-refresh-token": refreshed["refresh_token"]},
    )
    assert logout_res.status_code == 200

    revoked_refresh = client.post("/auth/refresh", json={"refresh_token": refreshed["refresh_token"]})
    assert revoked_refresh.status_code == 401


def test_role_based_admin_endpoints(client):
    user = _register(client, username="bob", email="bob@example.com")
    user_token = user["token"]

    denied = client.get("/auth/permissions", headers={"Authorization": f"Bearer {user_token}"})
    assert denied.status_code == 403

    admin = _admin_login(client)
    admin_token = admin["token"]

    promote = client.patch(
        "/auth/users/bob",
        json={"isAdmin": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert promote.status_code == 200
    assert promote.json()["user"]["isAdmin"] is True

    perms = client.get("/auth/permissions", headers={"Authorization": f"Bearer {admin_token}"})
    assert perms.status_code == 200
    assert any(entry["name"] == "users:read" for entry in perms.json()["permissions"])


def test_profile_update_and_password_change(client):
    registered = _register(client, username="charlie", email="charlie@example.com")
    token = registered["token"]

    update = client.patch(
        "/auth/me",
        json={"displayName": "Charlie C", "bio": "hello", "location": "US"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update.status_code == 200
    assert update.json()["user"]["displayName"] == "Charlie C"
    assert update.json()["user"]["location"] == "US"

    change_password = client.post(
        "/auth/me/change-password",
        json={"currentPassword": "Password123", "newPassword": "NewPassword123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert change_password.status_code == 200

    relogin_old = client.post(
        "/auth/login",
        json={"email": "charlie@example.com", "password": "Password123"},
    )
    assert relogin_old.status_code == 401

    relogin_new = client.post(
        "/auth/login",
        json={"email": "charlie@example.com", "password": "NewPassword123"},
    )
    assert relogin_new.status_code == 200
