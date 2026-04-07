from fastapi import APIRouter, HTTPException
from models.schemas import EmpresaCreate, ProvisioningResponse
import uuid
import re
import os
import urllib.request
import urllib.error
import json

router = APIRouter(prefix="/provisioning", tags=["Provisionamento"])

ALLOWED_MODULES = {
    "dashboard",
    "crm",
    "vendas",
    "financeiro",
    "estoque",
    "catalogo",
    "rh",
    "relatorios",
    "os",
    "configuracoes",
}


def _build_headers(service_role_key: str) -> dict:
    return {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Profile": "public",
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
        raise RuntimeError(
            f"Supabase HTTP {e.code} em {url}: {parsed.get('message') or parsed.get('error') or raw_error}"
        ) from e


def supabase_rpc_provision(empresa: EmpresaCreate, schema_name: str, empresa_id: str):
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_role_key:
        raise RuntimeError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias no ambiente do backend.")

    headers = _build_headers(service_role_key)

    empresa_row = {
        "id": empresa_id,
        "cnpj": empresa.cnpj,
        "razao_social": empresa.razao_social,
        "porte": empresa.porte,
        "segmento": empresa.segmento,
        "schema_name": schema_name,
    }
    url_empresas = f"{supabase_url}/rest/v1/empresas"
    _supabase_request(url_empresas, headers, "POST", empresa_row)

    url_rpc = f"{supabase_url}/rest/v1/rpc/provisionar_empresa"
    rpc_result = _supabase_request(url_rpc, headers, "POST", {"novo_schema": schema_name})
    if rpc_result.get("status") != "success":
        # Compensação para evitar empresa ativa sem schema.
        cleanup_url = f"{supabase_url}/rest/v1/empresas?id=eq.{empresa_id}"
        _supabase_request(cleanup_url, headers, "DELETE")
        raise RuntimeError(rpc_result.get("message", "Falha ao provisionar schema tenant."))

    selected_modules = sorted(set([m for m in empresa.modules if m in ALLOWED_MODULES]))
    if selected_modules:
        module_rows = [{"empresa_id": empresa_id, "modulo_key": m, "ativo": True} for m in selected_modules]
        modules_url = f"{supabase_url}/rest/v1/empresa_modulos?on_conflict=empresa_id,modulo_key"
        upsert_headers = {**headers, "Prefer": "resolution=merge-duplicates,return=representation"}
        _supabase_request(modules_url, upsert_headers, "POST", module_rows)


@router.post("/criar-empresa", response_model=ProvisioningResponse)
async def criar_empresa(empresa: EmpresaCreate):
    # Validar configuração do backend
    supabase_url = os.environ.get("SUPABASE_URL", "")
    if not supabase_url.startswith("https://"):
        raise HTTPException(status_code=500, detail="SUPABASE_URL inválida no backend.")
        
    # 1. Gerar nome de schema seguro
    limpo = re.sub(r'[^a-zA-Z0-9]', '', empresa.razao_social.lower())
    schema_name = f"tenant_{limpo}_{uuid.uuid4().hex[:6]}"
    empresa_id = str(uuid.uuid4())
    
    try:
        supabase_rpc_provision(empresa, schema_name, empresa_id)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Provisionamento falhou: {str(e)}") from e

    return ProvisioningResponse(
        empresa_id=empresa_id,
        schema_name=schema_name,
        status="success",
        message="Tenant provisionado com sucesso. Módulos selecionados já foram ativados."
    )
