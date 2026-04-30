"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, 
  Loader2, 
  Search, 
  Filter, 
  ShoppingCart, 
  Users, 
  Package, 
  Wallet, 
  Tags, 
  Briefcase, 
  FileText, 
  Wrench, 
  Building2, 
  DollarSign,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ModuleCard } from "@/components/loja/ModuleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ModuloData {
  id: string;
  key: string;
  nome: string;
  preco: number;
  preco_promocional: number | null;
  descricao: string;
  icone: string;
  features: string[];
  ordem_exibicao: number;
}

const ICON_MAP: Record<string, any> = {
  vendas: ShoppingCart,
  crm: Users,
  estoque: Package,
  financeiro: Wallet,
  catalogo: Tags,
  rh: Briefcase,
  relatorios: FileText,
  os: Wrench,
  obras: Building2,
  comissoes: DollarSign,
  dashboard: LayoutDashboard,
};

const COLOR_MAP: Record<string, string> = {
  vendas: "#10b981", // emerald
  crm: "#3b82f6",    // blue
  estoque: "#f59e0b", // amber
  financeiro: "#8b5cf6", // violet
  catalogo: "#ec4899", // pink
  rh: "#06b6d4",    // cyan
  relatorios: "#6366f1", // indigo
  os: "#f43f5e",    // rose
  obras: "#84cc16", // lime
  comissoes: "#f97316", // orange
  dashboard: "#94a3b8", // slate
};

export default function LojaPage() {
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<ModuloData[]>([]);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get current user and profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("empresa_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.empresa_id) {
        setEmpresaId(profile.empresa_id);

        // 2. Fetch active modules
        const { data: activeMods } = await supabase
          .from("v_empresa_modulos")
          .select("modulo_key")
          .eq("empresa_id", profile.empresa_id)
          .eq("ativo", true);
        
        setActiveKeys(activeMods?.map(m => m.modulo_key) || []);

        // 3. Fetch full catalog from RPC
        const { data: catalogData } = await supabase.rpc("listar_modulos_avulsos_checkout");
        if (catalogData) {
          setCatalog(catalogData as ModuloData[]);
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar loja:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcquireModule = async (moduleKey: string) => {
    if (!empresaId) return;

    try {
      setLoading(true);
      const mod = catalog.find(m => m.key === moduleKey);
      if (!mod) return;

      const { data: userData } = await supabase.auth.getUser();
      
      const payload = {
        empresaId,
        isUpgrade: true,
        customerName: userData.user?.user_metadata?.nome || "Cliente",
        customerEmail: userData.user?.email,
        planName: `Adição de Módulo: ${mod.nome}`,
        amount: mod.preco_promocional ?? mod.preco,
        modules: [moduleKey],
        companyName: "Empresa", // Idealmente buscaria o nome real
        companyDocument: "00000000000",
        companySize: "MPE",
        companySegment: "Varejo"
      };

      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(data.error || "Erro ao iniciar checkout");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCatalog = catalog.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // Show non-active modules first
    const aActive = activeKeys.includes(a.key);
    const bActive = activeKeys.includes(b.key);
    if (aActive === bActive) return a.ordem_exibicao - b.ordem_exibicao;
    return aActive ? 1 : -1;
  });

  if (loading && catalog.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-gray-400 animate-pulse">Carregando marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-6 lg:p-10 space-y-10">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-white/5 p-8 lg:p-12">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShoppingBag className="w-48 h-48 text-indigo-500" />
        </div>
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider"
          >
            <Tags className="w-3 h-3" /> Marketplace Fluxo
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl lg:text-5xl font-black text-white leading-tight"
          >
            Expanda seu negócio <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">sob demanda.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg leading-relaxed"
          >
            Adicione funcionalidades específicas para sua operação sem trocar de plano. 
            Módulos a la carte com ativação instantânea após o pagamento.
          </motion.p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
          <Input 
            placeholder="Buscar módulo ou funcionalidade..." 
            className="pl-10 bg-white/5 border-white/10 focus:border-indigo-500/50 transition-all rounded-xl h-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{activeKeys.length} Módulos Integrados</span>
        </div>
      </div>

      {/* Grid of Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredCatalog.map((mod) => (
            <ModuleCard
              key={mod.key}
              id={mod.key}
              name={mod.nome}
              description={mod.descricao}
              features={mod.features || []}
              price={mod.preco}
              icon={ICON_MAP[mod.key] || ShoppingBag}
              isActive={activeKeys.includes(mod.key)}
              onAdd={handleAcquireModule}
              color={COLOR_MAP[mod.key] || "#6366f1"}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredCatalog.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-white/5 border border-white/10">
            <Search className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-white">Nenhum módulo encontrado</h3>
          <p className="text-gray-500">Tente buscar por termos mais genéricos como "vendas" ou "financeiro".</p>
          <Button variant="ghost" onClick={() => setSearchTerm("")} className="text-indigo-400 hover:text-indigo-300">
            Limpar busca
          </Button>
        </div>
      )}

      {/* Support Section */}
      <div className="mt-12 p-8 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">Precisa de um módulo personalizado?</h4>
            <p className="text-sm text-gray-500">Nossa equipe de engenharia pode desenvolver soluções sob medida para sua empresa.</p>
          </div>
        </div>
        <Button className="bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-xl">
          Falar com Especialista
        </Button>
      </div>
    </div>
  );
}
