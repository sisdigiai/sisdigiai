// A operação é em Brasília. `new Date().toISOString()` devolve o dia em UTC: depois das 21h
// (meia-noite em Londres) a tela passa a pedir o dia seguinte, que ainda não existe aqui —
// e vem vazia. O banco grava `dia` como data de Brasília; a tela tem que perguntar pelo mesmo.
export function diaBrasilia(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function hojeBrasilia(): string {
  return diaBrasilia(new Date());
}
