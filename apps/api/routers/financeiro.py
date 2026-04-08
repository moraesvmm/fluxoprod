from fastapi import APIRouter, HTTPException, Depends
from models.schemas import TransacaoCreate, TransacaoUpdate, TransacaoResponse
from typing import List
import os
import urllib.request
import json

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])

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

# Transações Financeiras
@router.get("/transacoes/", response_model=List[TransacaoResponse])
async def listar_transacoes():
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/transacoes_financeiras?select=*&order=criado_em.desc"
    
    try:
        result = _supabase_request(url, headers, "GET")
        return result if isinstance(result, list) else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar transações: {str(e)}")

@router.post("/transacoes/", response_model=TransacaoResponse)
async def criar_transacao(transacao: TransacaoCreate):
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/transacoes_financeiras"
    
    try:
        result = _supabase_request(url, headers, "POST", transacao.dict())
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar transação: {str(e)}")

@router.put("/transacoes/{transacao_id}", response_model=TransacaoResponse)
async def atualizar_transacao(transacao_id: str, transacao: TransacaoUpdate):
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/transacoes_financeiras?id=eq.{transacao_id}"
    
    try:
        result = _supabase_request(url, headers, "PATCH", transacao.dict(exclude_unset=True))
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar transação: {str(e)}")

@router.delete("/transacoes/{transacao_id}")
async def deletar_transacao(transacao_id: str):
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/transacoes_financeiras?id=eq.{transacao_id}"
    
    try:
        result = _supabase_request(url, headers, "DELETE")
        return {"message": "Transação removida com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar transação: {str(e)}")
