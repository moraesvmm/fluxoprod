from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import os
from routers.supabase_helper import supabase_request, build_headers

router = APIRouter(prefix="/comissoes", tags=["Comissões"])

class RegraBase(BaseModel):
    empresa_id: str
    funcionario_id: str
    tipo_calculo: str
    valor: float
    ativo: bool = True

class ComissaoBase(BaseModel):
    empresa_id: str
    funcionario_id: str
    funcionario_nome: Optional[str] = None
    venda_id: Optional[str] = None
    valor_venda: float
    valor_comissao: float
    status: str = "pendente"

def get_supabase_url_and_headers():
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE configuration")
    return url, build_headers(key)

# Endpoints for regras
@router.get("/regras")
def get_regras():
    url, headers = get_supabase_url_and_headers()
    return supabase_request(f"{url}/rest/v1/comissoes_regras", headers, "GET")

@router.post("/regras")
def create_regra(regra: RegraBase):
    url, headers = get_supabase_url_and_headers()
    return supabase_request(f"{url}/rest/v1/comissoes_regras", headers, "POST", regra.dict())

# Endpoints for comissoes history
@router.get("/")
def get_comissoes():
    url, headers = get_supabase_url_and_headers()
    return supabase_request(f"{url}/rest/v1/comissoes", headers, "GET")

@router.post("/")
def create_comissao(comissao: ComissaoBase):
    url, headers = get_supabase_url_and_headers()
    return supabase_request(f"{url}/rest/v1/comissoes", headers, "POST", comissao.dict())
