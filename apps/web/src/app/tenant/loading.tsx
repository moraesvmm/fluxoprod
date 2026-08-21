import Image from "next/image";

export default function TenantLoading() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center p-8 bg-background/50 backdrop-blur-sm animate-fade-in">
      <div className="relative mb-12 flex items-center justify-center">
        {/* Organic Glow Effect */}
        <div className="absolute h-32 w-32 rounded-full bg-primary/20 blur-3xl animate-[glow_3s_ease-in-out_infinite]"></div>
        
        {/* Minimalist Floating Logo */}
        <div className="relative z-10 animate-[float_4s_ease-in-out_infinite]">
          <Image
            src="/logo-fluxo.png" 
            alt="Fluxo"
            width={64}
            height={64}
            className="h-16 w-16 object-contain drop-shadow-[0_0_15px_rgba(var(--primary),0.4)]"
          />
        </div>
      </div>
      
      <div className="flex flex-col items-center text-center max-w-xs">
        <h3 className="text-lg font-medium text-foreground tracking-tight mb-1">
          Iniciando módulo
        </h3>
        <p className="text-xs text-muted-foreground/80 mb-8 leading-relaxed">
          Sincronizando seu ecossistema de dados para uma performance superior.
        </p>

        {/* Ultra-minimalist Loading Line */}
        <div className="relative h-[1px] w-40 overflow-hidden bg-muted/30">
          <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-primary to-transparent animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%' }}></div>
        </div>
      </div>
    </div>
  );
}

