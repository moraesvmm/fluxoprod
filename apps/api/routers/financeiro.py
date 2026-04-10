from fastapi import APIRouter, HTTPException
from models.schemas import TransacaoCreate, TransacaoUpdate, TransacaoResponse
from typing import List
from routers.supabase_helper import get_supabase_config, build_headers, supabase_request

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])

@router.get("/transacoes/", response_model=List[TransacaoResponse])
def listar_transacoes():
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/transacoes_financeiras?select=*&order=criado_em.desc"

    try:
        result = supabase_request(url, headers, "GET")
        return result if isinstance(result, list) else []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar transações: {str(e)}")

@router.post("/transacoes/", response_model=TransacaoResponse)
def criar_transacao(transacao: TransacaoCreate):
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/transacoes_financeiras"

    try:
        result = supabase_request(url, headers, "POST", transacao.dict())
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar transação: {str(e)}")

@router.put("/transacoes/{transacao_id}", response_model=TransacaoResponse)
def atualizar_transacao(transacao_id: str, transacao: TransacaoUpdate):
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/transacoes_financeiras?id=eq.{transacao_id}"

    try:
        result = supabase_request(url, headers, "PATCH", transacao.dict(exclude_unset=True))
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar transação: {str(e)}")

@router.delete("/transacoes/{transacao_id}")
def deletar_transacao(transacao_id: str):
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/transacoes_financeiras?id=eq.{transacao_id}"

    try:
        supabase_request(url, headers, "DELETE")
        return {"message": "Transação removida com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar transação: {str(e)}")
