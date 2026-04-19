"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export function useUserProfile() {
  const [nome, setNome] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      
      try {
        // Obter usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        // Set userId
        if (!cancelled) {
          setUserId(user.id);
        }

        // Buscar perfil do usuário
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("nome, role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!cancelled) {
          // Resolver nome com fallback
          let resolvedNome = "";
          
          // 1. user_profiles.nome (se preenchido)
          if (profile?.nome) {
            resolvedNome = profile.nome;
          }
          // 2. session.user.user_metadata.full_name
          else if (user.user_metadata?.full_name) {
            resolvedNome = user.user_metadata.full_name;
          }
          // 3. session.user.user_metadata.name
          else if (user.user_metadata?.name) {
            resolvedNome = user.user_metadata.name;
          }
          // 4. Primeira parte do email (antes do @)
          else if (user.email) {
            resolvedNome = user.email.split("@")[0];
            // Capitalizar primeira letra
            resolvedNome = resolvedNome.charAt(0).toUpperCase() + resolvedNome.slice(1);
          }

          setNome(resolvedNome);
          setEmail(user.email || "");
          setRole(profile?.role || "");
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil do usuário:", error);
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { nome, email, role, userId, loading };
}
