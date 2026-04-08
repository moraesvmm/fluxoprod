const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Venda {
  id: string;
  cliente: string;
  valor: number;
  metodo: string;
  status: string;
  criado_em: string;
  atualizado_em?: string;
}

export interface VendaCreate {
  cliente: string;
  valor: number;
  metodo: string;
  status?: string;
}

export interface VendaUpdate {
  cliente?: string;
  valor?: number;
  metodo?: string;
  status?: string;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}/api/v1${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // VENDAS
  async getVendas(): Promise<Venda[]> {
    return this.request<Venda[]>('/vendas/');
  }

  async createVenda(venda: VendaCreate): Promise<Venda> {
    return this.request<Venda>('/vendas/', {
      method: 'POST',
      body: JSON.stringify(venda),
    });
  }

  async updateVenda(id: string, venda: VendaUpdate): Promise<Venda> {
    return this.request<Venda>(`/vendas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(venda),
    });
  }

  async deleteVenda(id: string): Promise<void> {
    await this.request<void>(`/vendas/${id}`, {
      method: 'DELETE',
    });
  }

  // CRM - Clientes
  async getClientes(): Promise<any[]> {
    return this.request<any[]>('/clientes/');
  }

  async createCliente(cliente: any): Promise<any> {
    return this.request<any>('/clientes/', {
      method: 'POST',
      body: JSON.stringify(cliente),
    });
  }

  async updateCliente(id: string, cliente: any): Promise<any> {
    return this.request<any>(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cliente),
    });
  }

  async deleteCliente(id: string): Promise<void> {
    await this.request<void>(`/clientes/${id}`, {
      method: 'DELETE',
    });
  }

  // Financeiro - Transações
  async getTransacoes(): Promise<any[]> {
    return this.request<any[]>('/financeiro/transacoes/');
  }

  async createTransacao(transacao: any): Promise<any> {
    return this.request<any>('/financeiro/transacoes/', {
      method: 'POST',
      body: JSON.stringify(transacao),
    });
  }

  async updateTransacao(id: string, transacao: any): Promise<any> {
    return this.request<any>(`/financeiro/transacoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transacao),
    });
  }

  async deleteTransacao(id: string): Promise<void> {
    await this.request<void>(`/financeiro/transacoes/${id}`, {
      method: 'DELETE',
    });
  }

  // Estoque - Produtos
  async getProdutos(): Promise<any[]> {
    return this.request<any[]>('/estoque/produtos/');
  }

  async createProduto(produto: any): Promise<any> {
    return this.request<any>('/estoque/produtos/', {
      method: 'POST',
      body: JSON.stringify(produto),
    });
  }

  async updateProduto(id: string, produto: any): Promise<any> {
    return this.request<any>(`/estoque/produtos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(produto),
    });
  }

  async deleteProduto(id: string): Promise<void> {
    await this.request<void>(`/estoque/produtos/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
