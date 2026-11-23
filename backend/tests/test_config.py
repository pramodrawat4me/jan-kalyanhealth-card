from __future__ import annotations

from app.core.config import Settings

_REQUIRED = {
    "jwt_access_secret": "x" * 64,
    "jwt_refresh_secret": "y" * 64,
    "aadhaar_encryption_key": "z" * 44,
}


def test_cors_origin_list_always_includes_frontend_public_url():
    """Regression test for a real production incident: CORS_ORIGINS was set
    without the deployed frontend's origin, so the browser silently rejected
    otherwise-successful login responses. frontend_public_url must always
    be present in the allow-list even if CORS_ORIGINS is misconfigured."""

    settings = Settings(
        cors_origins="http://localhost:5173",
        frontend_public_url="https://jankalyanhealthcard.com",
        **_REQUIRED,
    )
    assert "https://jankalyanhealthcard.com" in settings.cors_origin_list
    assert "http://localhost:5173" in settings.cors_origin_list


def test_cors_origin_list_deduplicates_frontend_public_url():
    settings = Settings(
        cors_origins="https://jankalyanhealthcard.com,http://localhost:5173",
        frontend_public_url="https://jankalyanhealthcard.com",
        **_REQUIRED,
    )
    assert settings.cors_origin_list.count("https://jankalyanhealthcard.com") == 1


def test_cors_origin_list_strips_trailing_slash_on_frontend_public_url():
    settings = Settings(
        cors_origins="http://localhost:5173",
        frontend_public_url="https://jankalyanhealthcard.com/",
        **_REQUIRED,
    )
    assert "https://jankalyanhealthcard.com" in settings.cors_origin_list
