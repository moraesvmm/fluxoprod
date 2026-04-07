from pydantic import BaseModel, Field, constr
from typing import List, Optional
from datetime import datetime

class EmpresaCreate(BaseModel):
    cnpj: constr(min_length=14, max_length=18)
    razao_social: str = Field(..., min_length=3)
    porte: Optional[str] = "ME"
    segmento: Optional[str] = None

    # Onboarding (governado pelo usuário-master); módulos são geridos centralmente
    modules: List[str] = Field(default_factory=list)

class ProvisioningResponse(BaseModel):
    empresa_id: str
    schema_name: str
    status: str
    message: str

# Schemas para Vendas
class VendaBase(BaseModel):
    cliente: str
    valor: float
    metodo: str
    status: str = "concluido"

class VendaCreate(VendaBase):
    pass

class VendaUpdate(BaseModel):
    cliente: Optional[str] = None
    valor: Optional[float] = None
    metodo: Optional[str] = None
    status: Optional[str] = None

class VendaResponse(VendaBase):
    id: str
    criado_em: datetime
    atualizado_em: Optional[datetime] = None
    
    class Config:
        from_attributes = True
