"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteUsuarioAction } from "./actions";

export default function DeleteUserButton({ userId, isMaster }: { userId: string, isMaster: boolean }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isMaster) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const result = await deleteUsuarioAction(userId);
      if (!result.success) {
        setError(result.error || "Erro ao deletar usuário");
      } else {
        setShowConfirm(false);
      }
    } catch (err: any) {
      setError(err.message || "Erro inesperado.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-rose-600 hover:text-rose-800 disabled:opacity-50"
        title="Excluir Usuário Permanentemente"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-lg font-semibold text-foreground">Confirmar Exclusão de Usuário</h2>
            </div>
            <p className="text-sm text-foreground mb-4">
              Você está prestes a excluir este usuário <strong>definitivamente</strong> do sistema (Auth e Perfil). 
              Esta operação é irreversível.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
