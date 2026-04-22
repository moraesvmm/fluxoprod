"use client";

import { useEffect, useRef, useState } from "react";
import { Barcode, X, CheckCircle, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { buscarProdutoPorCodigo } from "@/lib/api";
import { useToast, Toast } from "@/components/ui/toast";

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onProdutoEncontrado?: (produto: any) => void;
}

export default function BarcodeScanner({
  isOpen,
  onClose,
  onProdutoEncontrado,
}: BarcodeScannerProps) {
  const scannerRef = useRef<{
    stream: MediaStream | null;
    animationFrame: number | null;
  }>({ stream: null, animationFrame: null });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [produtoEncontrado, setProdutoEncontrado] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, removeToast, success, error: toastError } = useToast();

  const stopScanner = () => {
    if (scannerRef.current.animationFrame !== null) {
      window.cancelAnimationFrame(scannerRef.current.animationFrame);
      scannerRef.current.animationFrame = null;
    }

    if (scannerRef.current.stream) {
      scannerRef.current.stream.getTracks().forEach((track) => track.stop());
      scannerRef.current.stream = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScanning(false);
  };

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const BarcodeDetectorApi = window.BarcodeDetector;
    if (!BarcodeDetectorApi) {
      setError("Leitor de codigo indisponivel neste navegador. Use Chrome ou Edge atualizados.");
      setScanning(false);
      return;
    }

    let cancelled = false;

    const iniciarScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (!videoRef.current || !canvasRef.current) {
          throw new Error("Leitor de camera nao inicializado.");
        }

        const detector = new BarcodeDetectorApi({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
        });

        scannerRef.current.stream = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setError(null);
        setScanning(true);

        const loop = async () => {
          if (
            cancelled ||
            !videoRef.current ||
            !canvasRef.current ||
            videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
          ) {
            scannerRef.current.animationFrame = window.requestAnimationFrame(loop);
            return;
          }

          const canvas = canvasRef.current;
          const context = canvas.getContext("2d");
          if (!context) {
            setError("Falha ao iniciar leitura da camera.");
            stopScanner();
            return;
          }

          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          try {
            const resultados = await detector.detect(canvas);
            const codigo = resultados.find((resultado) => resultado.rawValue?.trim())?.rawValue?.trim();

            if (codigo) {
              await handleCodigoDetectado(codigo);
              return;
            }
          } catch {
            // Falhas pontuais do detector nao devem interromper o stream.
          }

          scannerRef.current.animationFrame = window.requestAnimationFrame(loop);
        };

        scannerRef.current.animationFrame = window.requestAnimationFrame(loop);
      } catch {
        setError("Nao foi possivel acessar a camera. Verifique as permissoes.");
        stopScanner();
      }
    };

    void iniciarScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen]);

  const handleCodigoDetectado = async (codigo: string) => {
    try {
      const produto = await buscarProdutoPorCodigo(codigo);
      if (produto && !produto.error) {
        setProdutoEncontrado(produto);
        success("Produto encontrado: " + produto.nome);
        stopScanner();
        onProdutoEncontrado?.(produto);
      } else {
        toastError("Produto nao encontrado para o codigo: " + codigo);
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
    stopScanner();
    onClose();
    setProdutoEncontrado(null);
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleFechar} title="Scanner de Codigo de Barras/QR">
      <div className="space-y-4">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}

        <div
          className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg bg-slate-950"
          style={{ minHeight: "250px" }}
        >
          <video ref={videoRef} className="h-[250px] w-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          {!produtoEncontrado && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-52 w-52 items-center justify-center rounded-3xl border-2 border-emerald-400/70 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]">
                <Barcode className="h-10 w-10 text-emerald-300/80" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {scanning && !error && (
          <p className="text-center text-sm text-slate-600">Aponte o codigo de barras para a camera...</p>
        )}

        {produtoEncontrado && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900">{produtoEncontrado.nome}</h4>
                <p className="mt-1 text-sm text-green-700">
                  Codigo: {produtoEncontrado.codigo_barras || produtoEncontrado.codigo_qr || "-"}
                </p>
                <p className="text-sm text-green-700">
                  Preco: R$ {produtoEncontrado.preco_base?.toFixed(2) || "0,00"}
                </p>
                <p className="text-sm text-green-700">Estoque: {produtoEncontrado.estoque_atual || 0}</p>
              </div>
            </div>
            <button
              onClick={handleConfirmar}
              className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md bg-green-600 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              Confirmar
            </button>
          </div>
        )}

        {!produtoEncontrado && (
          <button
            onClick={handleFechar}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-slate-100 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            <X className="mr-2 h-4 w-4" /> Cancelar
          </button>
        )}
      </div>
    </Modal>
  );
}
