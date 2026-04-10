from fastapi import APIRouter, HTTPException
from models.schemas import ClienteCreate, ClienteUpdate, ClienteResponse
from typing import List
from routers.supabase_helper import get_supabase_config, build_headers, supabase_request

router = APIRouter(prefix="/crm", tags=["CRM"])

@router.get("/clientes/", response_model=List[ClienteResponse])
def listar_clientes():
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/clientes?select=*&order=criado_em.desc"

    try:
        result = supabase_request(url, headers, "GET")
        return result if isinstance(result, list) else []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar clientes: {str(e)}")

@router.post("/clientes/", response_model=ClienteResponse)
def criar_cliente(cliente: ClienteCreate):
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/clientes"

    try:
        result = supabase_request(url, headers, "POST", cliente.dict())
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar cliente: {str(e)}")

@router.put("/clientes/{cliente_id}", response_model=ClienteResponse)
def atualizar_cliente(cliente_id: str, cliente: ClienteUpdate):
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/clientes?id=eq.{cliente_id}"

    try:
        result = supabase_request(url, headers, "PATCH", cliente.dict(exclude_unset=True))
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar cliente: {str(e)}")

@router.delete("/clientes/{cliente_id}")
def deletar_cliente(cliente_id: str):
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/clientes?id=eq.{cliente_id}"

    try:
        supabase_request(url, headers, "DELETE")
        return {"message": "Cliente removido com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar cliente: {str(e)}")
