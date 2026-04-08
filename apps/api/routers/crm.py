from fastapi import APIRouter, HTTPException, Depends
from models.schemas import ClienteCreate, ClienteUpdate, ClienteResponse
from typing import List
import os
import urllib.request
import json

router = APIRouter(prefix="/crm", tags=["CRM"])

def _build_headers(service_role_key: str) -> dict:
    return {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

def _supabase_request(url: str, headers: dict, method: str, body=None):
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
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

# Clientes
@router.get("/clientes/", response_model=List[ClienteResponse])
async def listar_clientes():
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/clientes?select=*&order=criado_em.desc"
    
    try:
        result = _supabase_request(url, headers, "GET")
        return result if isinstance(result, list) else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar clientes: {str(e)}")

@router.post("/clientes/", response_model=ClienteResponse)
async def criar_cliente(cliente: ClienteCreate):
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/clientes"
    
    try:
        result = _supabase_request(url, headers, "POST", cliente.dict())
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar cliente: {str(e)}")

@router.put("/clientes/{cliente_id}", response_model=ClienteResponse)
async def atualizar_cliente(cliente_id: str, cliente: ClienteUpdate):
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/clientes?id=eq.{cliente_id}"
    
    try:
        result = _supabase_request(url, headers, "PATCH", cliente.dict(exclude_unset=True))
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar cliente: {str(e)}")

@router.delete("/clientes/{cliente_id}")
async def deletar_cliente(cliente_id: str):
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/clientes?id=eq.{cliente_id}"
    
    try:
        result = _supabase_request(url, headers, "DELETE")
        return {"message": "Cliente removido com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar cliente: {str(e)}")
