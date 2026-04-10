from fastapi import APIRouter, HTTPException
from models.schemas import VendaCreate, VendaUpdate, VendaResponse
from typing import List
from routers.supabase_helper import get_supabase_config, build_headers, supabase_request

router = APIRouter(prefix="/vendas", tags=["Vendas"])

@router.get("/", response_model=List[VendaResponse])
def listar_vendas():
    """Lista todas as vendas do tenant atual"""
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/vendas?select=*&order=criado_em.desc"

    try:
        result = supabase_request(url, headers, "GET")
        return result if isinstance(result, list) else []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar vendas: {str(e)}")

@router.post("/", response_model=VendaResponse)
def criar_venda(venda: VendaCreate):
    """Cria uma nova venda"""
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/vendas"

    try:
        result = supabase_request(url, headers, "POST", venda.dict())
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar venda: {str(e)}")

@router.put("/{venda_id}", response_model=VendaResponse)
def atualizar_venda(venda_id: str, venda: VendaUpdate):
    """Atualiza uma venda existente"""
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/vendas?id=eq.{venda_id}"

    try:
        result = supabase_request(url, headers, "PATCH", venda.dict(exclude_unset=True))
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar venda: {str(e)}")

@router.delete("/{venda_id}")
def deletar_venda(venda_id: str):
    """Remove uma venda"""
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/vendas?id=eq.{venda_id}"

    try:
        supabase_request(url, headers, "DELETE")
        return {"message": "Venda removida com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar venda: {str(e)}")
