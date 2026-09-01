export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          criado_em: string
          dados_antes: Json | null
          dados_depois: Json | null
          empresa_id: string | null
          id: string
          ip: string | null
          operacao: string
          registro_id: string
          schema_name: string
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          empresa_id?: string | null
          id?: string
          ip?: string | null
          operacao: string
          registro_id: string
          schema_name: string
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          empresa_id?: string | null
          id?: string
          ip?: string | null
          operacao?: string
          registro_id?: string
          schema_name?: string
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      checkout_vendas: {
        Row: {
          atualizado_em: string | null
          cliente_nome: string
          config_payload: Json
          criado_em: string | null
          email: string
          external_transaction_id: string
          id: string
          status: string
          valor_total: number
        }
        Insert: {
          atualizado_em?: string | null
          cliente_nome: string
          config_payload: Json
          criado_em?: string | null
          email: string
          external_transaction_id: string
          id?: string
          status?: string
          valor_total: number
        }
        Update: {
          atualizado_em?: string | null
          cliente_nome?: string
          config_payload?: Json
          criado_em?: string | null
          email?: string
          external_transaction_id?: string
          id?: string
          status?: string
          valor_total?: number
        }
        Relationships: []
      }
      clientes: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          documento: string | null
          email: string | null
          empresa_id: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          documento?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          documento?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      comissoes: {
        Row: {
          criado_em: string | null
          empresa_id: string | null
          funcionario_id: string
          funcionario_nome: string | null
          id: string
          periodo: string | null
          status: string | null
          valor_comissao: number
          valor_venda: number
          venda_id: string | null
        }
        Insert: {
          criado_em?: string | null
          empresa_id?: string | null
          funcionario_id: string
          funcionario_nome?: string | null
          id?: string
          periodo?: string | null
          status?: string | null
          valor_comissao: number
          valor_venda: number
          venda_id?: string | null
        }
        Update: {
          criado_em?: string | null
          empresa_id?: string | null
          funcionario_id?: string
          funcionario_nome?: string | null
          id?: string
          periodo?: string | null
          status?: string | null
          valor_comissao?: number
          valor_venda?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes_regras: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          empresa_id: string | null
          funcionario_id: string
          id: string
          tipo_calculo: string
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          empresa_id?: string | null
          funcionario_id: string
          id?: string
          tipo_calculo: string
          valor: number
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          empresa_id?: string | null
          funcionario_id?: string
          id?: string
          tipo_calculo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_regras_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons: {
        Row: {
          ativo: boolean | null
          codigo: string
          criado_em: string | null
          data_expiracao: string | null
          id: string
          limite_usos: number | null
          tipo: string
          usos_atuais: number | null
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          criado_em?: string | null
          data_expiracao?: string | null
          id?: string
          limite_usos?: number | null
          tipo: string
          usos_atuais?: number | null
          valor: number
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          criado_em?: string | null
          data_expiracao?: string | null
          id?: string
          limite_usos?: number | null
          tipo?: string
          usos_atuais?: number | null
          valor?: number
        }
        Relationships: []
      }
      cupons_utilizados: {
        Row: {
          cupom_id: string
          email_usuario: string | null
          empresa_id: string | null
          id: string
          utilizado_em: string | null
        }
        Insert: {
          cupom_id: string
          email_usuario?: string | null
          empresa_id?: string | null
          id?: string
          utilizado_em?: string | null
        }
        Update: {
          cupom_id?: string
          email_usuario?: string | null
          empresa_id?: string | null
          id?: string
          utilizado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cupons_utilizados_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "cupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupons_utilizados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_modules: {
        Row: {
          created_at: string | null
          field_definitions: Json
          icon: string | null
          id: string
          is_deleted: boolean | null
          module_name: string
          table_name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          field_definitions: Json
          icon?: string | null
          id?: string
          is_deleted?: boolean | null
          module_name: string
          table_name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          field_definitions?: Json
          icon?: string | null
          id?: string
          is_deleted?: boolean | null
          module_name?: string
          table_name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_logs: {
        Row: {
          criado_em: string | null
          error_message: string | null
          execution_time_ms: number | null
          function_name: string
          id: string
          request_body: Json | null
          response_body: Json | null
        }
        Insert: {
          criado_em?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          function_name: string
          id?: string
          request_body?: Json | null
          response_body?: Json | null
        }
        Update: {
          criado_em?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          function_name?: string
          id?: string
          request_body?: Json | null
          response_body?: Json | null
        }
        Relationships: []
      }
      empresa_modulos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          empresa_id: string
          modulo_key: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          empresa_id: string
          modulo_key: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          empresa_id?: string
          modulo_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_modulos_modulo_key_fkey"
            columns: ["modulo_key"]
            isOneToOne: false
            referencedRelation: "modulos_catalogo"
            referencedColumns: ["key"]
          },
        ]
      }
      empresas: {
        Row: {
          atualizado_em: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          codigo_municipio_ibge: string | null
          complemento: string | null
          criado_em: string | null
          data_vencimento: string | null
          deleted_at: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          limite_usuarios: number
          logradouro: string | null
          nfe_ambiente: string | null
          nfe_certificado_senha: string | null
          numero: string | null
          plan_name: string | null
          porte: string | null
          razao_social: string
          regime_tributario: number | null
          schema_name: string
          segmento: string | null
          status: string | null
          subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          uf: string | null
        }
        Insert: {
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          codigo_municipio_ibge?: string | null
          complemento?: string | null
          criado_em?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          limite_usuarios?: number
          logradouro?: string | null
          nfe_ambiente?: string | null
          nfe_certificado_senha?: string | null
          numero?: string | null
          plan_name?: string | null
          porte?: string | null
          razao_social: string
          regime_tributario?: number | null
          schema_name: string
          segmento?: string | null
          status?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          uf?: string | null
        }
        Update: {
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          codigo_municipio_ibge?: string | null
          complemento?: string | null
          criado_em?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          limite_usuarios?: number
          logradouro?: string | null
          nfe_ambiente?: string | null
          nfe_certificado_senha?: string | null
          numero?: string | null
          plan_name?: string | null
          porte?: string | null
          razao_social?: string
          regime_tributario?: number | null
          schema_name?: string
          segmento?: string | null
          status?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      fichas_tecnicas: {
        Row: {
          criado_em: string | null
          deleted_at: string | null
          id: string
          materia_prima_id: string
          produto_acabado_id: string
          quantidade_necessaria: number
        }
        Insert: {
          criado_em?: string | null
          deleted_at?: string | null
          id?: string
          materia_prima_id: string
          produto_acabado_id: string
          quantidade_necessaria: number
        }
        Update: {
          criado_em?: string | null
          deleted_at?: string | null
          id?: string
          materia_prima_id?: string
          produto_acabado_id?: string
          quantidade_necessaria?: number
        }
        Relationships: [
          {
            foreignKeyName: "fichas_tecnicas_materia_prima_id_fkey"
            columns: ["materia_prima_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_tecnicas_produto_acabado_id_fkey"
            columns: ["produto_acabado_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_series: {
        Row: {
          ambiente: string
          atualizado_em: string
          criado_em: string
          empresa_id: string
          id: string
          modelo: string
          numero_atual: number
          serie: number
        }
        Insert: {
          ambiente: string
          atualizado_em?: string
          criado_em?: string
          empresa_id: string
          id?: string
          modelo?: string
          numero_atual?: number
          serie?: number
        }
        Update: {
          ambiente?: string
          atualizado_em?: string
          criado_em?: string
          empresa_id?: string
          id?: string
          modelo?: string
          numero_atual?: number
          serie?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_series_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          criado_em: string | null
          email: string | null
          empresa_id: string | null
          id: string
          nome: string
          percentual_comissao: number | null
          salario: number | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          cargo?: string | null
          criado_em?: string | null
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          percentual_comissao?: number | null
          salario?: number | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          cargo?: string | null
          criado_em?: string | null
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          percentual_comissao?: number | null
          salario?: number | null
          telefone?: string | null
        }
        Relationships: []
      }
      historico_precos: {
        Row: {
          alterado_por: string | null
          criado_em: string | null
          foi_promocional: boolean | null
          id: string
          motivo: string | null
          preco_anterior: number
          preco_novo: number
          referencia_id: string
          referencia_nome: string | null
          tipo: string
        }
        Insert: {
          alterado_por?: string | null
          criado_em?: string | null
          foi_promocional?: boolean | null
          id?: string
          motivo?: string | null
          preco_anterior: number
          preco_novo: number
          referencia_id: string
          referencia_nome?: string | null
          tipo: string
        }
        Update: {
          alterado_por?: string | null
          criado_em?: string | null
          foi_promocional?: boolean | null
          id?: string
          motivo?: string | null
          preco_anterior?: number
          preco_novo?: number
          referencia_id?: string
          referencia_nome?: string | null
          tipo?: string
        }
        Relationships: []
      }
      logs_provisionamento: {
        Row: {
          criado_em: string | null
          empresa_id: string | null
          id: string
          mensagem: string | null
          schema_name: string | null
          status: string | null
        }
        Insert: {
          criado_em?: string | null
          empresa_id?: string | null
          id?: string
          mensagem?: string | null
          schema_name?: string | null
          status?: string | null
        }
        Update: {
          criado_em?: string | null
          empresa_id?: string | null
          id?: string
          mensagem?: string | null
          schema_name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      modulos_ativos: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          empresa_id: string | null
          id: string
          modulo_nome: string
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          empresa_id?: string | null
          id?: string
          modulo_nome: string
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          empresa_id?: string | null
          id?: string
          modulo_nome?: string
        }
        Relationships: []
      }
      modulos_avulsos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          descricao: string | null
          features: string[] | null
          icone: string | null
          id: string
          key: string
          nome: string
          ordem_exibicao: number | null
          preco: number
          preco_promocional: number | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          features?: string[] | null
          icone?: string | null
          id?: string
          key: string
          nome: string
          ordem_exibicao?: number | null
          preco: number
          preco_promocional?: number | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          features?: string[] | null
          icone?: string | null
          id?: string
          key?: string
          nome?: string
          ordem_exibicao?: number | null
          preco?: number
          preco_promocional?: number | null
        }
        Relationships: []
      }
      modulos_catalogo: {
        Row: {
          criado_em: string | null
          descricao: string
          key: string
          nome: string
        }
        Insert: {
          criado_em?: string | null
          descricao: string
          key: string
          nome: string
        }
        Update: {
          criado_em?: string | null
          descricao?: string
          key?: string
          nome?: string
        }
        Relationships: []
      }
      obras: {
        Row: {
          atualizado_em: string | null
          cliente_id: string | null
          criado_em: string | null
          data_fim_prevista: string | null
          data_inicio: string | null
          descricao: string | null
          empresa_id: string | null
          endereco: string | null
          id: string
          nome: string
          orcamento: number | null
          status: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          data_fim_prevista?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome: string
          orcamento?: number | null
          status?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          data_fim_prevista?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          orcamento?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_producao: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          custo_total_materiais: number | null
          data_fim: string | null
          data_inicio: string | null
          deleted_at: string | null
          id: string
          numero_op: number
          produto_id: string
          quantidade_planejada: number
          quantidade_produzida: number | null
          status: string | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          custo_total_materiais?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          id?: string
          numero_op?: number
          produto_id: string
          quantidade_planejada: number
          quantidade_produzida?: number | null
          status?: string | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          custo_total_materiais?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          id?: string
          numero_op?: number
          produto_id?: string
          quantidade_planejada?: number
          quantidade_produzida?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_producao_insumos: {
        Row: {
          criado_em: string | null
          custo_unitario_real: number | null
          id: string
          insumo_id: string
          ordem_id: string
          quantidade_consumida: number | null
          quantidade_prevista: number
        }
        Insert: {
          criado_em?: string | null
          custo_unitario_real?: number | null
          id?: string
          insumo_id: string
          ordem_id: string
          quantidade_consumida?: number | null
          quantidade_prevista: number
        }
        Update: {
          criado_em?: string | null
          custo_unitario_real?: number | null
          id?: string
          insumo_id?: string
          ordem_id?: string
          quantidade_consumida?: number | null
          quantidade_prevista?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_insumos_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          atualizado_em: string | null
          cliente_id: string | null
          colaborador_id: string | null
          criado_em: string | null
          descricao_problema: string | null
          empresa_id: string | null
          id: string
          numero: number
          status: string | null
          valor: number | null
          veiculo_equipamento: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cliente_id?: string | null
          colaborador_id?: string | null
          criado_em?: string | null
          descricao_problema?: string | null
          empresa_id?: string | null
          id?: string
          numero?: number
          status?: string | null
          valor?: number | null
          veiculo_equipamento?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cliente_id?: string | null
          colaborador_id?: string | null
          criado_em?: string | null
          descricao_problema?: string | null
          empresa_id?: string | null
          id?: string
          numero?: number
          status?: string | null
          valor?: number | null
          veiculo_equipamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          descricao: string | null
          id: string
          key: string
          modulos_incluidos: string[] | null
          nome: string
          ordem_exibicao: number | null
          preco: number
          preco_promocional: number | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          key: string
          modulos_incluidos?: string[] | null
          nome: string
          ordem_exibicao?: number | null
          preco: number
          preco_promocional?: number | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          key?: string
          modulos_incluidos?: string[] | null
          nome?: string
          ordem_exibicao?: number | null
          preco?: number
          preco_promocional?: number | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          atualizado_em: string | null
          categoria: string | null
          criado_em: string | null
          descricao: string | null
          empresa_id: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          id: string
          nome: string
          preco_custo: number | null
          preco_venda: number | null
          sku: string | null
          tipo_item: string | null
          unidade_medida: string | null
        }
        Insert: {
          atualizado_em?: string | null
          categoria?: string | null
          criado_em?: string | null
          descricao?: string | null
          empresa_id?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          nome: string
          preco_custo?: number | null
          preco_venda?: number | null
          sku?: string | null
          tipo_item?: string | null
          unidade_medida?: string | null
        }
        Update: {
          atualizado_em?: string | null
          categoria?: string | null
          criado_em?: string | null
          descricao?: string | null
          empresa_id?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          nome?: string
          preco_custo?: number | null
          preco_venda?: number | null
          sku?: string | null
          tipo_item?: string | null
          unidade_medida?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_deleted: boolean | null
          modules_enabled: Json | null
          name: string
          schema_name: string
          slug: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          modules_enabled?: Json | null
          name: string
          schema_name: string
          slug: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          modules_enabled?: Json | null
          name?: string
          schema_name?: string
          slug?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transacoes_financeiras: {
        Row: {
          atualizado_em: string | null
          categoria: string | null
          criado_em: string | null
          descricao: string
          empresa_id: string | null
          id: string
          status: string | null
          tipo: string
          valor: number
        }
        Insert: {
          atualizado_em?: string | null
          categoria?: string | null
          criado_em?: string | null
          descricao: string
          empresa_id?: string | null
          id?: string
          status?: string | null
          tipo: string
          valor: number
        }
        Update: {
          atualizado_em?: string | null
          categoria?: string | null
          criado_em?: string | null
          descricao?: string
          empresa_id?: string | null
          id?: string
          status?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          criado_em: string
          deleted_at: string | null
          empresa_id: string | null
          nome: string | null
          role: string
          settings: Json | null
          user_id: string
        }
        Insert: {
          criado_em?: string
          deleted_at?: string | null
          empresa_id?: string | null
          nome?: string | null
          role: string
          settings?: Json | null
          user_id: string
        }
        Update: {
          criado_em?: string
          deleted_at?: string | null
          empresa_id?: string | null
          nome?: string | null
          role?: string
          settings?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_modulos_permitidos: {
        Row: {
          criado_em: string | null
          empresa_id: string
          id: string
          modulo_key: string
          permitido: boolean
          user_id: string
        }
        Insert: {
          criado_em?: string | null
          empresa_id: string
          id?: string
          modulo_key: string
          permitido?: boolean
          user_id: string
        }
        Update: {
          criado_em?: string | null
          empresa_id?: string
          id?: string
          modulo_key?: string
          permitido?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_modulos_permitidos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          data_atualizacao: string | null
          data_criacao: string | null
          email: string
          empresa_id: string | null
          id: string
          nome: string
          role: string
        }
        Insert: {
          data_atualizacao?: string | null
          data_criacao?: string | null
          email: string
          empresa_id?: string | null
          id: string
          nome: string
          role?: string
        }
        Update: {
          data_atualizacao?: string | null
          data_criacao?: string | null
          email?: string
          empresa_id?: string | null
          id?: string
          nome?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          atualizado_em: string | null
          cliente: string
          cliente_nome: string | null
          criado_em: string | null
          empresa_id: string | null
          id: string
          metodo: string
          status: string | null
          valor: number
          vendedor_id: string | null
          vendedor_nome: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cliente: string
          cliente_nome?: string | null
          criado_em?: string | null
          empresa_id?: string | null
          id?: string
          metodo: string
          status?: string | null
          valor: number
          vendedor_id?: string | null
          vendedor_nome?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cliente?: string
          cliente_nome?: string | null
          criado_em?: string | null
          empresa_id?: string | null
          id?: string
          metodo?: string
          status?: string | null
          valor?: number
          vendedor_id?: string | null
          vendedor_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendas_vendedor"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_itens: {
        Row: {
          criado_em: string | null
          id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          subtotal: number
          venda_id: string
        }
        Insert: {
          criado_em?: string | null
          id?: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          subtotal: number
          venda_id: string
        }
        Update: {
          criado_em?: string | null
          id?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          subtotal?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_audit_log: {
        Row: {
          criado_em: string | null
          detalhes: string | null
          external_transaction_id: string | null
          id: string
          payload: Json | null
          status: string | null
        }
        Insert: {
          criado_em?: string | null
          detalhes?: string | null
          external_transaction_id?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
        }
        Update: {
          criado_em?: string | null
          detalhes?: string | null
          external_transaction_id?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_empresa_modulos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          descricao: string | null
          empresa_id: string | null
          modulo_key: string | null
          nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_modulos_modulo_key_fkey"
            columns: ["modulo_key"]
            isOneToOne: false
            referencedRelation: "modulos_catalogo"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Functions: {
      _provisionar_rpcs_escrita_a: {
        Args: { novo_schema: string }
        Returns: undefined
      }
      _provisionar_rpcs_escrita_b: {
        Args: { novo_schema: string }
        Returns: undefined
      }
      _provisionar_rpcs_leitura: {
        Args: { novo_schema: string }
        Returns: undefined
      }
      _provisionar_tabelas: {
        Args: { novo_schema: string }
        Returns: undefined
      }
      admin_criar_cupom: {
        Args: {
          p_codigo: string
          p_data_expiracao?: string
          p_limite_usos?: number
          p_tipo: string
          p_valor: number
        }
        Returns: Json
      }
      admin_excluir_cupom: { Args: { p_id: string }; Returns: Json }
      admin_listar_cupons: { Args: never; Returns: Json }
      create_tenant_schema: {
        Args: { tenant_slug: string }
        Returns: undefined
      }
      criar_rpcs_tenant: { Args: { p_schema_name: string }; Returns: string }
      debug_check_tabela_registros: {
        Args: { p_schema: string; p_table: string }
        Returns: Json
      }
      debug_columns_test: {
        Args: { p_schema: string; p_table: string }
        Returns: Json
      }
      debug_financeiro_check: { Args: never; Returns: Json }
      debug_get_create_produto_args: { Args: never; Returns: Json }
      debug_get_os_signature: { Args: never; Returns: Json }
      debug_get_source: { Args: never; Returns: Json }
      debug_kpis_source: { Args: never; Returns: Json }
      debug_listar_clientes: { Args: never; Returns: Json }
      debug_listar_signature: { Args: never; Returns: Json }
      debug_listar_signatures: { Args: never; Returns: Json }
      deletar_empresa_master: {
        Args: { p_confirmacao_exclusao?: boolean; p_empresa_id: string }
        Returns: Json
      }
      drop_old_tenant_atualizar_cliente: { Args: never; Returns: undefined }
      drop_old_tenant_criar_cliente: { Args: never; Returns: undefined }
      execute_dynamic_ddl: { Args: { ddl_query: string }; Returns: undefined }
      get_clientes_tenant: {
        Args: { p_schema: string }
        Returns: {
          criado_em: string
          email: string
          funil_fase: string
          id: string
          nome: string
          status: string
          telefone: string
        }[]
      }
      get_current_empresa_id: { Args: never; Returns: string }
      get_current_role: { Args: never; Returns: string }
      get_estoque_baixo: {
        Args: { p_schema: string }
        Returns: {
          id: string
          nome: string
          produto_id: string
          quantidade: number
          quantidade_minima: number
          sku: string
        }[]
      }
      get_pendencias_financeiro: {
        Args: { p_data_limite: string; p_schema: string }
        Returns: {
          data_vencimento: string
          descricao: string
          dias_atraso: number
          id: string
          tipo: string
          valor: number
        }[]
      }
      get_tabela_tenant: { Args: { p_tabela: string }; Returns: Json[] }
      get_tenant_schema: { Args: never; Returns: string }
      get_user_settings: { Args: never; Returns: Json }
      get_vendas_periodo: {
        Args: { p_data_fim: string; p_data_inicio: string; p_schema: string }
        Returns: Json[]
      }
      incrementar_numero_nfe: {
        Args: {
          p_ambiente: string
          p_empresa_id: string
          p_modelo?: string
          p_serie?: number
        }
        Returns: number
      }
      incrementar_uso_cupom: {
        Args: { p_cupom_id: string }
        Returns: undefined
      }
      insert_tabela_tenant: {
        Args: { p_dados: Json; p_tabela: string }
        Returns: Json
      }
      is_master: { Args: never; Returns: boolean }
      is_tenant_of: { Args: { p_empresa_id: string }; Returns: boolean }
      listar_modulos_avulsos_checkout: { Args: never; Returns: Json }
      listar_planos_checkout: { Args: never; Returns: Json }
      master_atualizar_modulo_avulso: {
        Args: {
          p_ativo?: boolean
          p_id: string
          p_preco: number
          p_preco_promocional?: number
        }
        Returns: Json
      }
      master_atualizar_plano: {
        Args: {
          p_ativo?: boolean
          p_id: string
          p_preco: number
          p_preco_promocional?: number
        }
        Returns: Json
      }
      master_listar_historico_precos: { Args: never; Returns: Json }
      mestre_prorrogar_trial_empresa: {
        Args: { p_dias_trial: number; p_empresa_id: string }
        Returns: Json
      }
      obter_schema_usuario: { Args: { p_user_id: string }; Returns: string }
      provision_base_tables: {
        Args: { tenant_slug: string }
        Returns: undefined
      }
      provisionar_empresa: {
        Args: { novo_schema: string; p_modules?: string[] }
        Returns: Json
      }
      provisionar_empresa_master: {
        Args: {
          p_cnpj: string
          p_empresa_id: string
          p_modules: string[]
          p_porte: string
          p_razao_social: string
          p_schema_name: string
          p_segmento: string
        }
        Returns: Json
      }
      provisionar_novo_tenant: {
        Args: { p_cnpj: string; p_nome_empresa: string }
        Returns: Json
      }
      registrar_audit: {
        Args: {
          p_dados_antes?: Json
          p_dados_depois?: Json
          p_empresa_id: string
          p_operacao: string
          p_registro_id: string
          p_schema: string
          p_tabela: string
          p_usuario_id: string
        }
        Returns: undefined
      }
      relatorio_estoque_tenant: {
        Args: { p_schema: string }
        Returns: {
          atualizado_em: string
          id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          quantidade_minima: number
          sku: string
        }[]
      }
      relatorio_financeiro_tenant: {
        Args: { p_data_fim: string; p_data_inicio: string; p_schema: string }
        Returns: {
          criado_em: string
          data_vencimento: string
          descricao: string
          id: string
          status: string
          tipo: string
          valor: number
        }[]
      }
      relatorio_vendas_tenant: {
        Args: { p_data_fim: string; p_data_inicio: string; p_schema: string }
        Returns: {
          cliente_id: string
          criado_em: string
          id: string
          metodo_pagamento: string
          status: string
          valor_total: number
        }[]
      }
      set_tenant_schema: { Args: { p_user_id: string }; Returns: string }
      tenant_abrir_ordem_producao: {
        Args: { p_produto_id: string; p_quantidade_planejada: number }
        Returns: Json
      }
      tenant_adicionar_tag: {
        Args: { p_cliente_id: string; p_tag: string }
        Returns: Json
      }
      tenant_atualizar_cliente:
        | {
            Args: {
              p_cliente_id: string
              p_email: string
              p_funil_fase: string
              p_nome: string
              p_status: string
              p_telefone: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cliente_id: string
              p_cpf_cnpj?: string
              p_email?: string
              p_endereco?: string
              p_funil_fase?: string
              p_nome?: string
              p_status?: string
              p_telefone?: string
            }
            Returns: Json
          }
      tenant_atualizar_comissao: {
        Args: {
          p_comissao_id: string
          p_data_pagamento?: string
          p_status_pagamento: string
        }
        Returns: Json
      }
      tenant_atualizar_custo_produto: {
        Args: {
          p_custo_unitario: number
          p_idempotency_key?: string
          p_metodo_valoracao?: string
          p_produto_id: string
        }
        Returns: Json
      }
      tenant_atualizar_dados_pessoais: {
        Args: {
          p_cpf?: string
          p_ctps?: string
          p_data_admissao?: string
          p_data_nascimento?: string
          p_endereco?: string
          p_funcionario_id: string
          p_nome_mae?: string
          p_pis_pasep?: string
          p_rg?: string
        }
        Returns: Json
      }
      tenant_atualizar_demanda_real: {
        Args: {
          p_demanda_real: number
          p_idempotency_key?: string
          p_previsao_id: string
        }
        Returns: Json
      }
      tenant_atualizar_estoque: {
        Args: {
          p_estoque_id: string
          p_quantidade: number
          p_quantidade_minima: number
          p_sku: string
        }
        Returns: Json
      }
      tenant_atualizar_financeiro: {
        Args: {
          p_categoria: string
          p_data_vencimento: string
          p_descricao: string
          p_financeiro_id: string
          p_status: string
          p_tipo: string
          p_valor: number
        }
        Returns: Json
      }
      tenant_atualizar_funcionario:
        | {
            Args: {
              p_cargo: string
              p_email: string
              p_funcionario_id: string
              p_nome: string
              p_role: string
              p_salario: number
              p_telefone: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cargo: string
              p_dia_pagamento?: number
              p_email: string
              p_funcionario_id: string
              p_nome: string
              p_role: string
              p_salario: number
              p_telefone: string
            }
            Returns: Json
          }
      tenant_atualizar_modulos_usuario: {
        Args: { p_modulos: Json; p_target_user_id: string }
        Returns: undefined
      }
      tenant_atualizar_obra: {
        Args: {
          p_cliente_id: string
          p_data_fim_prevista: string
          p_data_inicio: string
          p_descricao: string
          p_endereco: string
          p_nome: string
          p_obra_id: string
          p_orcamento_total: number
          p_status: string
        }
        Returns: Json
      }
      tenant_atualizar_os: {
        Args: {
          p_checklist_entrada?: Json
          p_cliente_id?: string
          p_colaborador_id?: string
          p_descricao_problema?: string
          p_equipamento_serial?: string
          p_laudo_tecnico?: string
          p_os_id: string
          p_status?: string
          p_valor_orcamento?: number
          p_veiculo_equipamento?: string
        }
        Returns: Json
      }
      tenant_atualizar_produto: {
        Args: {
          p_categoria: string
          p_descricao: string
          p_nome: string
          p_preco_base: number
          p_preco_custo: number
          p_produto_id: string
          p_sku: string
          p_tipo: string
        }
        Returns: Json
      }
      tenant_atualizar_produto_fiscal: {
        Args: {
          p_cfop_padrao: string
          p_ncm: string
          p_origem: number
          p_produto_id: string
        }
        Returns: Json
      }
      tenant_buscar_configuracao: { Args: { p_chave: string }; Returns: Json }
      tenant_buscar_produto_por_codigo: {
        Args: { p_codigo: string }
        Returns: Json
      }
      tenant_calcular_valor_estoque: {
        Args: { p_metodo?: string }
        Returns: Json
      }
      tenant_cancelar_transferencia: {
        Args: { p_idempotency_key?: string; p_transferencia_id: string }
        Returns: Json
      }
      tenant_concluir_ordem_producao: {
        Args: { p_insumos: Json; p_ordem_id: string; p_qtd_produzida: number }
        Returns: Json
      }
      tenant_concluir_transferencia: {
        Args: { p_idempotency_key?: string; p_transferencia_id: string }
        Returns: Json
      }
      tenant_criar_alerta_nurturing: {
        Args: {
          p_cliente_id: string
          p_dias: number
          p_mensagem?: string
          p_produto_servico: string
          p_tipo: string
        }
        Returns: Json
      }
      tenant_criar_cliente: {
        Args: {
          p_cpf_cnpj?: string
          p_email?: string
          p_endereco?: string
          p_funil_fase?: string
          p_nome: string
          p_status?: string
          p_telefone?: string
        }
        Returns: Json
      }
      tenant_criar_ficha_tecnica: {
        Args: {
          p_materia_prima_id: string
          p_produto_acabado_id: string
          p_quantidade_necessaria: number
        }
        Returns: Json
      }
      tenant_criar_financeiro: {
        Args: {
          p_categoria?: string
          p_data_vencimento?: string
          p_descricao?: string
          p_status?: string
          p_tipo: string
          p_valor?: number
        }
        Returns: Json
      }
      tenant_criar_funcionario: {
        Args: {
          p_cargo: string
          p_dia_pagamento?: number
          p_email: string
          p_nome: string
          p_role: string
          p_salario: number
          p_telefone: string
        }
        Returns: Json
      }
      tenant_criar_interacao: {
        Args: {
          p_cliente_id: string
          p_data_interacao?: string
          p_descricao?: string
          p_duracao_minutos?: number
          p_metadata?: Json
          p_tipo: string
          p_titulo: string
          p_usuario_id?: string
        }
        Returns: Json
      }
      tenant_criar_kit: {
        Args: {
          p_descricao: string
          p_idempotency_key?: string
          p_itens: Json
          p_nome: string
          p_produto_id: string
        }
        Returns: Json
      }
      tenant_criar_local_estoque: {
        Args: {
          p_endereco: string
          p_idempotency_key?: string
          p_nome: string
          p_tipo: string
        }
        Returns: Json
      }
      tenant_criar_obra: {
        Args: {
          p_cliente_id: string
          p_data_fim_prevista?: string
          p_data_inicio?: string
          p_descricao?: string
          p_endereco?: string
          p_nome: string
          p_orcamento_total?: number
          p_status?: string
        }
        Returns: Json
      }
      tenant_criar_os: {
        Args: {
          p_checklist_entrada?: Json
          p_cliente_id: string
          p_colaborador_id: string
          p_descricao_problema: string
          p_equipamento_serial?: string
          p_idempotency_key?: string
          p_laudo_tecnico?: string
          p_status: string
          p_valor_orcamento: number
          p_veiculo_equipamento: string
        }
        Returns: Json
      }
      tenant_criar_produto: {
        Args: {
          p_categoria?: string
          p_descricao?: string
          p_estoque_atual?: number
          p_estoque_minimo?: number
          p_nome: string
          p_preco_base?: number
          p_preco_custo?: number
          p_sku?: string
          p_tipo?: string
        }
        Returns: Json
      }
      tenant_criar_regra_comissao: {
        Args: {
          p_ativo?: boolean
          p_colaborador_id: string
          p_tipo_calculo: string
          p_valor: number
        }
        Returns: Json
      }
      tenant_criar_transferencia: {
        Args: {
          p_criado_por: string
          p_idempotency_key?: string
          p_local_destino_id: string
          p_local_origem_id: string
          p_observacao: string
          p_produto_id: string
          p_quantidade: number
        }
        Returns: Json
      }
      tenant_dashboard_kpis: {
        Args: never
        Returns: {
          cmv_mes: number
          estoque_baixo: number
          faturamento_hoje: number
          faturamento_mes: number
          lucro_bruto_mes: number
          patrimonio_estoque: number
          qtd_clientes: number
          qtd_obras_em_andamento: number
          qtd_os_abertas: number
          qtd_produtos: number
          qtd_vendas: number
          qtd_vendas_hoje: number
          qtd_vendas_mes: number
          saldo: number
          total_vendas: number
        }[]
      }
      tenant_dashboard_kpis_por_mes: {
        Args: { p_meses?: number }
        Returns: Json
      }
      tenant_dashboard_metricas: { Args: never; Returns: Json }
      tenant_desativar_local_estoque: {
        Args: { p_idempotency_key?: string; p_local_id: string }
        Returns: Json
      }
      tenant_enviar_campanha: {
        Args: {
          p_cliente_ids: string[]
          p_mensagem: string
          p_tipo?: string
          p_titulo: string
        }
        Returns: Json
      }
      tenant_excluir_cliente: { Args: { p_cliente_id: string }; Returns: Json }
      tenant_excluir_documento: {
        Args: { p_documento_id: string }
        Returns: Json
      }
      tenant_excluir_financeiro: {
        Args: { p_financeiro_id: string }
        Returns: Json
      }
      tenant_excluir_funcionario: {
        Args: { p_funcionario_id: string }
        Returns: Json
      }
      tenant_excluir_interacao: {
        Args: { p_interacao_id: string }
        Returns: Json
      }
      tenant_excluir_kit: {
        Args: { p_idempotency_key?: string; p_kit_id: string }
        Returns: Json
      }
      tenant_excluir_obra: { Args: { p_obra_id: string }; Returns: Json }
      tenant_excluir_os: { Args: { p_os_id: string }; Returns: Json }
      tenant_excluir_produto: { Args: { p_produto_id: string }; Returns: Json }
      tenant_excluir_regra_comissao: {
        Args: { p_regra_id: string }
        Returns: Json
      }
      tenant_excluir_venda: { Args: { p_venda_id: string }; Returns: Json }
      tenant_finalizar_alerta_nurturing: {
        Args: { p_alerta_id: string }
        Returns: Json
      }
      tenant_gerar_codigo_barras: {
        Args: { p_idempotency_key?: string; p_produto_id: string }
        Returns: Json
      }
      tenant_gerar_previsao_demanda: {
        Args: {
          p_dias_analise?: number
          p_dias_previsao?: number
          p_idempotency_key?: string
          p_produto_id: string
        }
        Returns: Json
      }
      tenant_gerenciar_timer_os: {
        Args: { p_acao: string; p_os_id: string }
        Returns: undefined
      }
      tenant_importar_clientes_lote: {
        Args: { p_clientes: Json; p_user_id?: string }
        Returns: Json
      }
      tenant_listar_alertas_estoque: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: Json
      }
      tenant_listar_audit: {
        Args: { p_limit?: number; p_registro_id?: string; p_tabela?: string }
        Returns: Json
      }
      tenant_listar_clientes: {
        Args: {
          p_busca?: string
          p_cursor?: string
          p_funil_fase?: string
          p_limit?: number
          p_order_by?: string
          p_order_dir?: string
          p_status?: string
          p_tags?: string[]
        }
        Returns: Json
      }
      tenant_listar_comissoes: {
        Args: never
        Returns: {
          colaborador_id: string
          criado_em: string
          data_pagamento: string
          id: string
          periodo_referencia: string
          regra_comissao_id: string
          status_pagamento: string
          valor_comissao: number
          valor_venda: number
          venda_id: string
        }[]
      }
      tenant_listar_documentos: {
        Args: { p_funcionario_id: string }
        Returns: Json
      }
      tenant_listar_equipes: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          data_criacao: string
          descricao: string
          id: string
          lider_id: string
          nome_equipe: string
        }[]
      }
      tenant_listar_estoque: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      tenant_listar_fichas_tecnicas: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      tenant_listar_financeiro: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          categoria: string
          data_cadastro: string
          data_pagamento: string
          descricao: string
          id: string
          status: string
          tipo_transacao: string
          valor: number
          vencimento: string
        }[]
      }
      tenant_listar_funcionarios: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          cargo: string
          data_admissao: string
          data_cadastro: string
          departamento: string
          id: string
          nome: string
          salario: number
          status: string
        }[]
      }
      tenant_listar_interacoes: {
        Args: { p_cliente_id: string; p_cursor?: string; p_limit?: number }
        Returns: {
          atualizado_em: string
          cliente_id: string
          criado_em: string
          data_interacao: string
          descricao: string
          duracao_minutos: number
          id: string
          metadata: Json
          next_cursor: string
          tipo: string
          titulo: string
          usuario_id: string
        }[]
      }
      tenant_listar_kits: { Args: never; Returns: Json }
      tenant_listar_contextos_caixa: { Args: never; Returns: Json }
      tenant_listar_locais_estoque: { Args: never; Returns: Json }
      tenant_listar_lotacoes_filiais: {
        Args: { p_user_id: string }
        Returns: Json
      }
      tenant_listar_modulos_usuario: {
        Args: { p_target_user_id: string }
        Returns: {
          contratado: boolean
          modulo_key: string
          modulo_nome: string
          permitido: boolean
        }[]
      }
      tenant_listar_movimentacao_estoque: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          data_movimentacao: string
          id: string
          motivo: string
          produto_id: string
          quantidade: number
          tipo: string
        }[]
      }
      tenant_listar_obras: { Args: never; Returns: Json }
      tenant_listar_ordens_producao: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      tenant_listar_ordens_servico: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          cliente_id: string
          data_conclusao: string
          data_criacao: string
          descricao: string
          equipamento_serial: string
          id: string
          laudo_tecnico: string
          prioridade: string
          status: string
          valor_orcado: number
        }[]
      }
      tenant_listar_previsoes_demanda: {
        Args: { p_limit?: number; p_offset?: number; p_produto_id?: string }
        Returns: Json
      }
      tenant_listar_produtos: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          data_cadastro: string
          descricao: string
          estoque_atual: number
          estoque_minimo: number
          id: string
          nome: string
          preco: number
          sku: string
          status: string
        }[]
      }
      tenant_listar_produtos_fiscal: { Args: never; Returns: Json }
      tenant_listar_regras_comissao: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          ativo: boolean
          colaborador_id: string
          criado_em: string
          id: string
          tipo_calculo: string
          valor: number
        }[]
      }
      tenant_listar_tags_catalog: {
        Args: { p_busca?: string; p_limit?: number }
        Returns: Json
      }
      tenant_listar_transferencias: {
        Args: { p_status?: string }
        Returns: Json
      }
      tenant_listar_usuarios: {
        Args: never
        Returns: {
          criado_em: string
          email: string
          nome: string
          role: string
          ultimo_login: string
          user_id: string
        }[]
      }
      tenant_listar_vendas: {
        Args: {
          p_busca?: string
          p_data?: string | null
          p_filial_id?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: Json
      }
      tenant_marcar_fechamento_visto: { Args: { p_mes: string }; Returns: Json }
      tenant_obter_documento: {
        Args: { p_documento_id: string }
        Returns: Json
      }
      tenant_obter_resumo_caixa: {
        Args: { p_caixa_id: string; p_data?: string | null; p_filial_id: string }
        Returns: Json
      }
      tenant_obter_dre: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: Json
      }
      tenant_obter_fechamento_pendente: { Args: never; Returns: Json }
      tenant_obter_lucro_os: { Args: { p_os_id: string }; Returns: Json }
      tenant_obter_sugestoes_nurturing: { Args: never; Returns: Json }
      tenant_processar_venda: {
        Args: {
          p_caixa_id?: string | null
          p_canal_venda_id?: string | null
          p_cliente_id: string | null
          p_cliente_nome: string
          p_desconto?: number
          p_emitir_nfe?: boolean
          p_filial_id?: string | null
          p_itens: Json
          p_lembrar_dias?: number
          p_metodo_pagamento: string
          p_valor_total: number
          p_vendedor_id?: string | null
          p_vendedor_nome?: string | null
        }
        Returns: Json
      }
      tenant_abrir_caixa: {
        Args: { p_caixa_id: string; p_filial_id: string; p_valor_abertura?: number }
        Returns: Json
      }
      tenant_fechar_caixa: {
        Args: {
          p_caixa_id: string
          p_data: string
          p_filial_id: string
          p_observacao?: string | null
          p_valores_contados: Json
        }
        Returns: Json
      }
      tenant_reabrir_caixa: {
        Args: { p_fechamento_id: string; p_motivo: string }
        Returns: Json
      }
      tenant_registrar_movimento_caixa: {
        Args: {
          p_caixa_id: string
          p_filial_id: string
          p_forma_pagamento: string
          p_motivo: string
          p_tipo: string
          p_valor: number
        }
        Returns: Json
      }
      tenant_registrar_documento: {
        Args: {
          p_funcionario_id: string
          p_mime_type: string
          p_nome_arquivo: string
          p_storage_path: string
          p_tamanho_bytes: number
          p_tipo: string
        }
        Returns: Json
      }
      tenant_registrar_pagamento_rh: {
        Args: { p_funcionario_id: string; p_mes: string }
        Returns: Json
      }
      tenant_registrar_pagamento_rh_todos: {
        Args: { p_mes: string }
        Returns: Json
      }
      tenant_remover_tag: {
        Args: { p_cliente_id: string; p_tag: string }
        Returns: Json
      }
      tenant_resolver_alerta_estoque: {
        Args: { p_alerta_id: string; p_status: string }
        Returns: Json
      }
      tenant_salvar_configuracao: {
        Args: { p_chave: string; p_descricao?: string; p_valor: string }
        Returns: Json
      }
      tenant_salvar_lotacoes_filiais: {
        Args: { p_lotacoes: Json; p_user_id: string }
        Returns: Json
      }
      tenant_vender_kit: {
        Args: {
          p_idempotency_key?: string
          p_kit_id: string
          p_quantidade?: number
        }
        Returns: Json
      }
      tenant_verificar_alertas_estoque: { Args: never; Returns: Json }
      update_all_tenants_atualizar_cliente: { Args: never; Returns: undefined }
      update_all_tenants_criar_cliente: { Args: never; Returns: undefined }
      update_clientes_funil_fase_constraint: { Args: never; Returns: undefined }
      update_user_settings: { Args: { p_settings: Json }; Returns: undefined }
      upgrade_all_tenants: {
        Args: { p_target_version?: number }
        Returns: Json
      }
      validar_cupom: { Args: { p_codigo: string }; Returns: Json }
      verificar_limite_usuarios: {
        Args: { p_empresa_id: string }
        Returns: {
          limite: number
          pode_criar: boolean
          usuarios_ativos: number
        }[]
      }
      webhook_provisionar_assinatura: {
        Args: {
          p_cliente_nome: string
          p_cnpj: string
          p_email: string
          p_gateway_payload: Json
          p_modules: string[]
          p_porte: string
          p_razao_social: string
          p_segmento: string
          p_senha: string
          p_transaction_id: string
          p_valor_total: number
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
