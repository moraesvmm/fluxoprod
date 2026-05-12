export interface ExportData {
  filename: string;
  data: unknown[];
  columns: { key: string; label: string }[];
}

export function exportToCSV({ filename, data, columns }: ExportData) {
  try {
    // Criar cabeçalho
    const header = columns.map(col => col.label).join(',');
    
    // Criar linhas de dados
    const rows = data.map(rawRow => {
      const row = rawRow as Record<string, unknown>;
      return columns.map(col => {
        const value = row[col.key] ?? '';
        // Escapar valores com vírgulas
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });

    // Combinar cabeçalho e linhas
    const csvContent = [header, ...rows].join('\n');

    // Criar blob e baixar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Erro ao exportar para CSV:', error);
    throw new Error('Erro ao exportar para CSV');
  }
}
