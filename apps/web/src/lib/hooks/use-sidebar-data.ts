"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

interface SidebarData {
  empresaNome: string;
  empresaIniciais: string;
  activeKeys: string[];
  role?: string;
}

export function useSidebarData() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["sidebar-data"],
    queryFn: async (): Promise<SidebarData> => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) throw new Error("No user");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role, empresa_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        return { empresaNome: "", empresaIniciais: "", activeKeys: [] };
      }

      if (profile.role === "master") {
        return { 
          empresaNome: "Administrador Master", 
          empresaIniciais: "AM", 
          activeKeys: ["dashboard"],
          role: "master"
        };
      }

      if (!profile.empresa_id) {
        return { empresaNome: "", empresaIniciais: "", activeKeys: [], role: profile.role };
      }

      // Execute in parallel for better performance
      const [empresaRes, modsRes] = await Promise.all([
        supabase
          .from("empresas")
          .select("razao_social")
          .eq("id", profile.empresa_id)
          .maybeSingle(),
        supabase
          .from("v_empresa_modulos")
          .select("modulo_key, ativo")
          .eq("empresa_id", profile.empresa_id)
      ]);

      const nome = empresaRes.data?.razao_social || "Empresa";
      const palavras = nome.split(/\s+/).filter(Boolean);
      const iniciais = palavras.length >= 2
        ? (palavras[0][0] + palavras[1][0]).toUpperCase()
        : nome.substring(0, 2).toUpperCase();

      const activeKeys = (modsRes.data || [])
        .filter((m: any) => m.ativo)
        .map((m: any) => m.modulo_key);

      return {
        empresaNome: nome,
        empresaIniciais: iniciais,
        activeKeys
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
