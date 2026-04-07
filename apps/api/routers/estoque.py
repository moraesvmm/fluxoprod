from fastapi import APIRouter, HTTPException, Depends
from models.schemas import ProdutoCreate, ProdutoUpdate, ProdutoResponse
from typing import List
import os
import urllib.request
import json

router = APIRouter(prefix="/estoque", tags=["Estoque"])

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

# Produtos
@router.get("/produtos/", response_model=List[ProdutoResponse])
async def listar_produtos():
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/produtos?select=*&order=criado_em.desc"
    
    try:
        result = _supabase_request(url, headers, "GET")
        return result if isinstance(result, list) else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar produtos: {str(e)}")

@router.post("/produtos/", response_model=ProdutoResponse)
async def criar_produto(produto: ProdutoCreate):
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/produtos"
    
    try:
        result = _supabase_request(url, headers, "POST", produto.dict())
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar produto: {str(e)}")

@router.put("/produtos/{produto_id}", response_model=ProdutoResponse)
async def atualizar_produto(produto_id: str, produto: ProdutoUpdate):
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/produtos?id=eq.{produto_id}"
    
    try:
        result = _supabase_request(url, headers, "PATCH", produto.dict(exclude_unset=True))
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar produto: {str(e)}")

@router.delete("/produtos/{produto_id}")
async def deletar_produto(produto_id: str):
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Configuração Supabase ausente")
    
    headers = _build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/produtos?id=eq.{produto_id}"
    
    try:
        result = _supabase_request(url, headers, "DELETE")
        return {"message": "Produto removido com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar produto: {str(e)}")
