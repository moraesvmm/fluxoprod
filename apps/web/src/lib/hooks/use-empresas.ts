import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEmpresa, updateEmpresa, EmpresaUpdate } from "@/lib/api";

export function useEmpresa() {
  return useQuery({
    queryKey: ['empresa'],
    queryFn: fetchEmpresa,
  });
}

export function useUpdateEmpresa() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, empresa }: { id: string, empresa: EmpresaUpdate }) => updateEmpresa(id, empresa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa'] });
    },
  });
}
