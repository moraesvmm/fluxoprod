"use client";

import { useEffect, useRef, useState } from "react";
import { Barcode, X, CheckCircle, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { buscarProdutoPorCodigo } from "@/lib/api";
import { useToast, Toast } from "@/components/ui/toast";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onProdutoEncontrado?: (produto: any) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onProdutoEncontrado }: BarcodeScannerProps) {
  const scannerRef = useRef<any>(null);
  const [produtoEncontrado, setProdutoEncontrado] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, removeToast, success, error: toastError } = useToast();

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      // Import html5-qrcode dinamicamente
      import("html5-qrcode").then((Html5QrcodeModule) => {
        const Html5Qrcode = Html5QrcodeModule.Html5Qrcode;
        
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        setScanning(true);
        setError(null);

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            handleCodigoDetectado(decodedText);
          },
          (errorMessage: string) => {
            // Ignorar erros de scan contínuos
          }
        ).catch((err: any) => {
          setError("Não foi possível acessar a câmera. Verifique as permissões.");
          setScanning(false);
        });
      }).catch((err) => {
        setError("Erro ao carregar biblioteca de scanner.");
        setScanning(false);
      });
    }

    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {});
        setScanning(false);
      }
    };
  }, [isOpen]);

  const handleCodigoDetectado = async (codigo: string) => {
    try {
      const produto = await buscarProdutoPorCodigo(codigo);
      if (produto && !produto.error) {
        setProdutoEncontrado(produto);
        success("Produto encontrado: " + produto.nome);
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
          setScanning(false);
        }
        if (onProdutoEncontrado) {
          onProdutoEncontrado(produto);
        }
      } else {
        toastError("Produto não encontrado para o código: " + codigo);
      }
    } catch (err: any) {
      toastError("Erro ao buscar produto: " + (err.message || "Tente novamente."));
    }
  };

  const handleConfirmar = () => {
    onClose();
    setProdutoEncontrado(null);
  };

  const handleFechar = () => {
    if (scannerRef.current && scanning) {
      scannerRef.current.stop().catch(() => {});
      setScanning(false);
    }
    onClose();
    setProdutoEncontrado(null);
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleFechar} title="Scanner de Código de Barras/QR">
      <div className="space-y-4">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}

        <div id="reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden" style={{ minHeight: "250px" }}></div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {scanning && !error && (
          <p className="text-center text-sm text-slate-600">Aponte o código de barras para a câmera...</p>
        )}

        {produtoEncontrado && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900">{produtoEncontrado.nome}</h4>
                <p className="text-sm text-green-700 mt-1">
                  Código: {produtoEncontrado.codigo_barras || produtoEncontrado.codigo_qr || "-"}
                </p>
                <p className="text-sm text-green-700">
                  Preço: R$ {produtoEncontrado.preco_base?.toFixed(2) || "0,00"}
                </p>
                <p className="text-sm text-green-700">
                  Estoque: {produtoEncontrado.estoque_atual || 0}
                </p>
              </div>
            </div>
            <button
              onClick={handleConfirmar}
              className="mt-3 w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 h-9"
            >
              Confirmar
            </button>
          </div>
        )}

        {!produtoEncontrado && (
          <button
            onClick={handleFechar}
            className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 h-9"
          >
            <X className="mr-2 h-4 w-4" /> Cancelar
          </button>
        )}
      </div>
    </Modal>
  );
}
