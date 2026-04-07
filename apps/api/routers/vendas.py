from fastapi import APIRouter, HTTPException, Depends
from models.schemas import VendaCreate, VendaUpdate, VendaResponse
from typing import List
import os
import urllib.request
import json

router = APIRouter(prefix="/vendas", tags=["Vendas"])

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

@router.get("/", response_model=List[VendaResponse])
async def listar_vendas():
    """Lista todas as vendas do tenant atual"""
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    
    # TODO: Implementar lógica multi-tenant para filtrar por schema da empresa
    url = f"{supabase_url}/rest/v1/vendas?select=*&order=criado_em.desc"
    
    try:
        result = _supabase_request(url, headers, "GET")
        return result if isinstance(result, list) else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar vendas: {str(e)}")

@router.post("/", response_model=VendaResponse)
async def criar_venda(venda: VendaCreate):
    """Cria uma nova venda"""
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    
    # TODO: Implementar lógica multi-tenant para inserir no schema correto
    url = f"{supabase_url}/rest/v1/vendas"
    
    try:
        result = _supabase_request(url, headers, "POST", venda.dict())
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar venda: {str(e)}")

@router.put("/{venda_id}", response_model=VendaResponse)
async def atualizar_venda(venda_id: str, venda: VendaUpdate):
    """Atualiza uma venda existente"""
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    
    # TODO: Implementar lógica multi-tenant para atualizar no schema correto
    url = f"{supabase_url}/rest/v1/vendas?id=eq.{venda_id}"
    
    try:
        result = _supabase_request(url, headers, "PATCH", venda.dict(exclude_unset=True))
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar venda: {str(e)}")

@router.delete("/{venda_id}")
async def deletar_venda(venda_id: str):
    """Remove uma venda"""
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    
    # TODO: Implementar lógica multi-tenant para deletar no schema correto
    url = f"{supabase_url}/rest/v1/vendas?id=eq.{venda_id}"
    
    try:
        result = _supabase_request(url, headers, "DELETE")
        return {"message": "Venda removida com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar venda: {str(e)}")
