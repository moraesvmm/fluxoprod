from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import provisioning
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

app = FastAPI(
    title="FLUXO API",
    description="Backend Multi-Tenant do FLUXO SaaS",
    version="0.1.0"
)

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(provisioning.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "FLUXO API está online!"}
