// A operação é em Brasília. `new Date().toISOString()` devolve o dia em UTC: depois das 21h
// (meia-noite em Londres) a tela passa a pedir o dia seguinte, que ainda não existe aqui —
// e vem vazia. O banco grava `dia` como data de Brasília; a tela tem que perguntar pelo mesmo.
export function diaBrasilia(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function hojeBrasilia(): string {
  return diaBrasilia(new Date());
}

// Segunda-feira da semana de Brasília, no mesmo corte que `date_trunc('week', ...)` do Postgres (ISO:
// semana começa na segunda). A tela e a view TÊM de usar o mesmo corte, senão a "última semana completa"
// da tela não é a mesma linha da view e a comparação mente sem dar erro.
export function semanaBrasilia(d: Date): string {
  const [a, m, dia] = diaBrasilia(d).split('-').map(Number);
  const utc = new Date(Date.UTC(a, m - 1, dia));
  const dow = utc.getUTCDay();                 // 0 = domingo
  utc.setUTCDate(utc.getUTCDate() - ((dow + 6) % 7));
  return utc.toISOString().slice(0, 10);
}

// A última semana COMPLETA: a que fechou no domingo passado. A semana corrente não entra num
// comparativo — meia semana sempre parece queda em relação a uma semana inteira.
export function ultimaSemanaCompleta(hoje = new Date()): string {
  const seg = semanaBrasilia(hoje);
  const d = new Date(`${seg}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

/** As `n` semanas que terminam na última completa, da mais nova para a mais antiga. */
export function semanasAnteriores(n: number, hoje = new Date()): string[] {
  const fim = new Date(`${ultimaSemanaCompleta(hoje)}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(fim);
    d.setUTCDate(d.getUTCDate() - i * 7);
    return d.toISOString().slice(0, 10);
  });
}
