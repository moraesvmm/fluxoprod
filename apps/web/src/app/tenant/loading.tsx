export default function TenantLoading() {
  return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary"></div>
        <p className="text-sm font-medium text-slate-500">Carregando módulo...</p>
      </div>
    </div>
  );
}
