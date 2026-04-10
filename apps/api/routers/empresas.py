from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel, constr, Field
import os
import uuid
import re
from routers.supabase_helper import supabase_request, build_headers

router = APIRouter(prefix="/empresas", tags=["Empresas"])

class EmpresaBase(BaseModel):
    cnpj: constr(min_length=14, max_length=18)
    razao_social: str = Field(..., min_length=3)
    porte: Optional[str] = "ME"
    segmento: Optional[str] = None

class EmpresaUpdate(BaseModel):
    cnpj: Optional[str] = None
    razao_social: Optional[str] = None
    porte: Optional[str] = None
    segmento: Optional[str] = None
    status: Optional[str] = None

def get_supabase_url_and_headers():
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE configuration")
    return url, build_headers(key)

@router.get("/")
def get_empresas():
    url, headers = get_supabase_url_and_headers()
    return supabase_request(f"{url}/rest/v1/empresas", headers, "GET")

@router.post("/")
def create_empresa(emp: EmpresaBase):
    url, headers = get_supabase_url_and_headers()
    limpo = re.sub(r'[^a-zA-Z0-9]', '', emp.razao_social.lower())
    schema_name = f"tenant_{limpo}_{uuid.uuid4().hex[:6]}"
    
    payload = emp.dict()
    payload["schema_name"] = schema_name
    return supabase_request(f"{url}/rest/v1/empresas", headers, "POST", payload)

@router.put("/{empresa_id}")
def update_empresa(empresa_id: str, emp: EmpresaUpdate):
    url, headers = get_supabase_url_and_headers()
    return supabase_request(f"{url}/rest/v1/empresas?id=eq.{empresa_id}", headers, "PATCH", emp.dict(exclude_unset=True))

@router.delete("/{empresa_id}")
def delete_empresa(empresa_id: str):
    url, headers = get_supabase_url_and_headers()
    return supabase_request(f"{url}/rest/v1/empresas?id=eq.{empresa_id}", headers, "DELETE")
