from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.schemas import EmpresaCreate, ProvisioningResponse
import uuid
import re
import os
import urllib.request
import urllib.error
import urllib.parse
import json

router = APIRouter(prefix="/provisioning", tags=["Provisionamento"])

def supabase_rpc_provision(empresa: EmpresaCreate, schema_name: str, empresa_id: str):
    """
    Aciona o Supabase via requisição HTTP para inserir na Master Table e rodar o DDL.
    Usa um único Supabase via variáveis de ambiente (um único projeto).
    """
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_role_key:
        raise RuntimeError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias no ambiente do backend.")
    
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Profile": "public",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    try:
        # 1. Inserir na tabela public.empresas
        url_empresas = f"{supabase_url}/rest/v1/empresas"
        payload_empresa = json.dumps({
            "id": empresa_id,
            "cnpj": empresa.cnpj,
            "razao_social": empresa.razao_social,
            "porte": empresa.porte,
            "segmento": empresa.segmento,
            "schema_name": schema_name
        }).encode("utf-8")
        
        req_empresa = urllib.request.Request(url_empresas, data=payload_empresa, headers=headers, method="POST")
        urllib.request.urlopen(req_empresa)
        print(f"[1/2] Empresa {empresa.razao_social} registrada no public.empresas.")

        # 2. Invocar a RPC para provisionar o schema e as tabelas isoladas
        url_rpc = f"{supabase_url}/rest/v1/rpc/provisionar_empresa"
        payload_rpc = json.dumps({"novo_schema": schema_name}).encode("utf-8")
        req_rpc = urllib.request.Request(url_rpc, data=payload_rpc, headers=headers, method="POST")
        
        with urllib.request.urlopen(req_rpc) as response:
            response_body = json.loads(response.read().decode())
            print(f"[2/2] RPC Sucesso para o schema {schema_name}: {response_body}")
            
    except urllib.error.HTTPError as e:
        erro_body = e.read().decode()
        print(f"[ERRO PROVISIONAMENTO HTTP]: {e.code} - {erro_body}")
    except Exception as e:
        print(f"[ERRO PROVISIONAMENTO FALTAL]: {str(e)}")


@router.post("/criar-empresa", response_model=ProvisioningResponse)
async def criar_empresa(empresa: EmpresaCreate, background_tasks: BackgroundTasks):
    # Validar configuração do backend
    supabase_url = os.environ.get("SUPABASE_URL", "")
    if not supabase_url.startswith("https://"):
        raise HTTPException(status_code=500, detail="SUPABASE_URL inválida no backend.")
        
    # 1. Gerar nome de schema seguro
    limpo = re.sub(r'[^a-zA-Z0-9]', '', empresa.razao_social.lower())
    schema_name = f"tenant_{limpo}_{uuid.uuid4().hex[:6]}"
    empresa_id = str(uuid.uuid4())
    
    # 2. Toda a orquestração ocorre no backend (FastAPI), repassando pro db
    background_tasks.add_task(supabase_rpc_provision, empresa, schema_name, empresa_id)
    
    # 3. Retornar resposta imediata para a UI do Wizard de onboarding
    return ProvisioningResponse(
        empresa_id=empresa_id,
        schema_name=schema_name,
        status="provisionando",
        message="A infraestrutura SaaS está sendo gerada. Isso levará alguns segundos."
    )
