from fastapi import APIRouter, HTTPException
from models.schemas import ProdutoCreate, ProdutoUpdate, ProdutoResponse
from typing import List
from routers.supabase_helper import get_supabase_config, build_headers, supabase_request

router = APIRouter(prefix="/estoque", tags=["Estoque"])

@router.get("/produtos/", response_model=List[ProdutoResponse])
def listar_produtos():
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/produtos?select=*&order=criado_em.desc"

    try:
        result = supabase_request(url, headers, "GET")
        return result if isinstance(result, list) else []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar produtos: {str(e)}")

@router.post("/produtos/", response_model=ProdutoResponse)
def criar_produto(produto: ProdutoCreate):
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/produtos"

    try:
        result = supabase_request(url, headers, "POST", produto.dict())
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar produto: {str(e)}")

@router.put("/produtos/{produto_id}", response_model=ProdutoResponse)
def atualizar_produto(produto_id: str, produto: ProdutoUpdate):
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/produtos?id=eq.{produto_id}"

    try:
        result = supabase_request(url, headers, "PATCH", produto.dict(exclude_unset=True))
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar produto: {str(e)}")

@router.delete("/produtos/{produto_id}")
def deletar_produto(produto_id: str):
    supabase_url, service_role_key = get_supabase_config()
    headers = build_headers(service_role_key)
    url = f"{supabase_url}/rest/v1/produtos?id=eq.{produto_id}"

    try:
        supabase_request(url, headers, "DELETE")
        return {"message": "Produto removido com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar produto: {str(e)}")
