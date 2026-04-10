"""Shared helper for making authenticated requests to Supabase REST API."""

import os
import ssl
import json
import urllib.request
import urllib.error
import certifi
from fastapi import HTTPException


# SSL context using certifi bundle (fixes macOS Python SSL issues)
_ssl_ctx = ssl.create_default_context(cafile=certifi.where())


def get_supabase_config():
    """Returns (supabase_url, service_role_key) or raises HTTPException."""
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")

    return supabase_url, service_role_key


def build_headers(service_role_key: str) -> dict:
    return {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def supabase_request(url: str, headers: dict, method: str, body=None):
    """Make an HTTP request to Supabase with proper SSL handling."""
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20, context=_ssl_ctx) as response:
            raw = response.read().decode() or "{}"
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        raw_error = e.read().decode()
        parsed = {}
        try:
            parsed = json.loads(raw_error) if raw_error else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw_error}
        raise HTTPException(
            status_code=e.code,
            detail=parsed.get('message') or parsed.get('error') or raw_error
        ) from e
