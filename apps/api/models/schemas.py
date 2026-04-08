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

# Schemas para CRM - Clientes
class ClienteBase(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    documento: Optional[str] = None
    endereco: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    documento: Optional[str] = None
    endereco: Optional[str] = None

class ClienteResponse(ClienteBase):
    id: str
    criado_em: datetime
    atualizado_em: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Schemas para Financeiro - Transações
class TransacaoBase(BaseModel):
    descricao: str
    valor: float
    tipo: str  # 'receita' ou 'despesa'
    categoria: Optional[str] = None
    status: str = "pendente"

class TransacaoCreate(TransacaoBase):
    pass

class TransacaoUpdate(BaseModel):
    descricao: Optional[str] = None
    valor: Optional[float] = None
    tipo: Optional[str] = None
    categoria: Optional[str] = None
    status: Optional[str] = None

class TransacaoResponse(TransacaoBase):
    id: str
    criado_em: datetime
    atualizado_em: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Schemas para Estoque - Produtos
class ProdutoBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    sku: Optional[str] = None
    preco_custo: Optional[float] = None
    preco_venda: Optional[float] = None
    estoque_atual: int = 0
    estoque_minimo: int = 0
    categoria: Optional[str] = None

class ProdutoCreate(ProdutoBase):
    pass

class ProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    sku: Optional[str] = None
    preco_custo: Optional[float] = None
    preco_venda: Optional[float] = None
    estoque_atual: Optional[int] = None
    estoque_minimo: Optional[int] = None
    categoria: Optional[str] = None

class ProdutoResponse(ProdutoBase):
    id: str
    criado_em: datetime
    atualizado_em: Optional[datetime] = None
    
    class Config:
        from_attributes = True
