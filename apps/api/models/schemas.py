from pydantic import BaseModel, Field, constr
from typing import List, Optional

class EmpresaCreate(BaseModel):
    cnpj: constr(min_length=14, max_length=18)
    razao_social: str = Field(..., min_length=3)
    porte: Optional[str] = "ME"
    segmento: Optional[str] = None
    
    # Supabase credentials (usado apenas no Onboarding)
    supabase_url: str
    supabase_service_role_key: str
    
    # Toggles default para onboarding
    modules: List[str] = ["dashboard", "vendas", "crm"]

class ProvisioningResponse(BaseModel):
    empresa_id: str
    schema_name: str
    status: str
    message: str
