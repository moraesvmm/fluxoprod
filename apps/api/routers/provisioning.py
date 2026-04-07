from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.schemas import EmpresaCreate, ProvisioningResponse
import uuid
import re
import os
import urllib.request
import urllib.error
import urllib.parse
import json

from dotenv import load_dotenv
load_dotenv()

router = APIRouter(prefix="/provisioning", tags=["Provisionamento"])

def supabase_rpc_provision(schema_name: str, modules: list):
    """
    Aciona o Supabase RPC via requisição HTTP para rodar DDL (CREATE SCHEMA, CREATE TABLE).
    O service_role_key consegue ultrapassar restrições de DDL via RPC SECURITY DEFINER.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_role_key:
        print("[ERRO] Supabase credentials not found in backend .env")
        return False
        
    url = f"{supabase_url}/rest/v1/rpc/provisionar_empresa"
    
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Profile": "public",
        "Content-Type": "application/json"
    }
    
    payload = json.dumps({"novo_schema": schema_name}).encode("utf-8")
    
    try:
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req) as response:
            response_body = json.loads(response.read().decode())
            print(f"[PROVISIONAMENTO] Sucesso para o schema {schema_name}: {response_body}")
            return True
            
    except urllib.error.HTTPError as e:
        erro_body = e.read().decode()
        print(f"[ERRO PROVISIONAMENTO RPC]: {e.code} - {erro_body}")
        return False

@router.post("/criar-empresa", response_model=ProvisioningResponse)
async def criar_empresa(empresa: EmpresaCreate, background_tasks: BackgroundTasks):
    
    # 1. Gerar nome de schema seguro
    limpo = re.sub(r'[^a-zA-Z0-9]', '', empresa.razao_social.lower())
    schema_name = f"tenant_{limpo}_{uuid.uuid4().hex[:6]}"
    
    # 2. Em um app real: Validar credenciais X-Service-Key localmente ou repassar ao motor
    # Usando background tasks para processamento pesado chamando a RPC no Supabase
    background_tasks.add_task(supabase_rpc_provision, schema_name, empresa.modules)
    
    # 3. Retornar resposta imediata para a UI do Wizard de onboarding
    return ProvisioningResponse(
        empresa_id=str(uuid.uuid4()),
        schema_name=schema_name,
        status="provisionando",
        message="A infraestrutura está sendo gerada no Supabase. Isso pode levar alguns minutos."
    )

