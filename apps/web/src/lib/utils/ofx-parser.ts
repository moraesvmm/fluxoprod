/**
 * Utilitário simples para processar arquivos OFX (Open Financial Exchange)
 * Focado em extrair transações (<STMTTRN>) para conciliação.
 */

export interface OfxTransaction {
  id: string;
  tipo: 'DEBIT' | 'CREDIT' | 'OTHER';
  data: string;
  valor: number;
  descricao: string;
}

export function parseOfx(ofxContent: string): OfxTransaction[] {
  const transactions: OfxTransaction[] = [];
  
  // Regex para capturar blocos <STMTTRN>...</STMTTRN>
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;

  while ((match = stmttrnRegex.exec(ofxContent)) !== null) {
    const block = match[1];
    
    // Extração simples via Regex para evitar dependências de XML complexos
    const trntype = extractTag(block, 'TRNTYPE');
    const dtposted = extractTag(block, 'DTPOSTED');
    const trnamt = extractTag(block, 'TRNAMT');
    const fitid = extractTag(block, 'FITID');
    const memo = extractTag(block, 'MEMO') || extractTag(block, 'NAME') || 'Sem descrição';

    if (fitid && trnamt) {
      transactions.push({
        id: fitid,
        tipo: trntype === 'CREDIT' ? 'CREDIT' : (trntype === 'DEBIT' ? 'DEBIT' : 'OTHER'),
        data: parseOfxDate(dtposted),
        valor: Math.abs(parseFloat(trnamt.replace(',', '.'))),
        descricao: memo.trim()
      });
    }
  }

  return transactions;
}

function extractTag(block: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<\\n\\r]+)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

function parseOfxDate(ofxDate: string | null): string {
  if (!ofxDate) return new Date().toISOString();
  // Formato OFX: YYYYMMDD...
  const year = ofxDate.substring(0, 4);
  const month = ofxDate.substring(4, 6);
  const day = ofxDate.substring(6, 8);
  return `${year}-${month}-${day}T12:00:00Z`;
}
