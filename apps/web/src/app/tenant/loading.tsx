export default function TenantLoading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center p-8 animate-fade-in">
      <div className="relative mb-6 flex items-center justify-center">
        {/* Pulsing rings */}
        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.3)] animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        <div className="absolute inset-[-10px] rounded-full border border-violet-400/30 shadow-[0_0_30px_rgba(139,92,246,0.2)] animate-[spin_4s_linear_infinite]"></div>
        
        {/* Logo Container */}
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0a0a0c] to-[#12121a] border border-violet-500/30 shadow-xl backdrop-blur-sm">
          <img 
            src="/logo-fluxo.png" 
            alt="Fluxo"
            className="h-10 w-10 object-contain drop-shadow-[0_0_8px_rgba(167,139,250,0.6)] animate-pulse"
          />
        </div>
      </div>
      
      <div className="flex flex-col items-center text-center">
        <h3 className="text-xl font-semibold bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent mb-2">
          Preparando módulo...
        </h3>
        <p className="text-sm font-medium text-slate-500 max-w-sm mb-6">
          Sincronizando dados e construindo a melhor experiência.
        </p>

        {/* Loading Bar Premium */}
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-200/50 dark:bg-slate-800/50">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500 animate-[loading-bar_1.5s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }}></div>
        </div>
      </div>
    </div>
  );
}
