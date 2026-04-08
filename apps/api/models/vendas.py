from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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
