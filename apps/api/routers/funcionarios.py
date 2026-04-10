from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import os
from routers.supabase_helper import supabase_request, build_headers

router = APIRouter(prefix="/funcionarios", tags=["Funcionários"])

class FuncionarioBase(BaseModel):
    empresa_id: str
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    cargo: Optional[str] = None
    salario: Optional[float] = None
    percentual_comissao: Optional[float] = None
    ativo: bool = True

class FuncionarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    cargo: Optional[str] = None
    salario: Optional[float] = None
    percentual_comissao: Optional[float] = None
    ativo: Optional[bool] = None

def get_supabase_url_and_headers():
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE configuration")
    return url, build_headers(key)

@router.get("/")
def get_funcionarios():
    url, headers = get_supabase_url_and_headers()
    return supabase_request(f"{url}/rest/v1/funcionarios", headers, "GET")

@router.post("/")
def create_funcionario(func: FuncionarioBase):
    url, headers = get_supabase_url_and_headers()
    return supabase_request(f"{url}/rest/v1/funcionarios", headers, "POST", func.dict())

@router.put("/{func_id}")
def update_funcionario(func_id: str, func: FuncionarioUpdate):
    url, headers = get_supabase_url_and_headers()
    return supabase_request(f"{url}/rest/v1/funcionarios?id=eq.{func_id}", headers, "PATCH", func.dict(exclude_unset=True))

@router.delete("/{func_id}")
def delete_funcionario(func_id: str):
    url, headers = get_supabase_url_and_headers()
    return supabase_request(f"{url}/rest/v1/funcionarios?id=eq.{func_id}", headers, "DELETE")
