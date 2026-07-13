// Keep-alive dos projetos Supabase free da DIGIAI.
// Free tier pausa após ~7 dias sem requests — em 13/jul/2026 nipo e qual_foto
// estavam pausados (qual_foto a 21 dias do limite de restauração).
// Roda 2x/semana; as anon keys são públicas por design (vivem no bundle de cada site).
const PROJETOS = [
  ['nipo-school', 'tqlwkgiytdikumtcnizf', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbHdrZ2l5dGRpa3VtdGNuaXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTQwOTYsImV4cCI6MjA4NzEzMDA5Nn0.NnXt7cFAj5mKoYvmAy7HfFye-mMse1f4Eahk9b9gcGE'],
  ['qual-foto', 'zlfyxndjpdwbbxuypova', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZnl4bmRqcGR3YmJ4dXlwb3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTQzMDEsImV4cCI6MjA4MzkzMDMwMX0.2YRtjRaTQjcFyv6wE_1nBVjuP389SjW3G3pDvbouSTc'],
  ['easy-idiomas', 'nrrkcfxcqnvvhhamhrqf', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ycmtjZnhjcW52dmhoYW1ocnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzU0NzgsImV4cCI6MjA5NDY1MTQ3OH0.Om9HO-1RMc55d2U7BeosTCYh3L1gRd4CPhG1MiDhjI8'],
  ['digiai', 'hswyopqvnolqpmprqvzh', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzd3lvcHF2bm9scXBtcHJxdnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzY0NzMsImV4cCI6MjA5MjAxMjQ3M30.ZCtoaMGvko1QHVFs23gC8nDpfTG-xgieaRsIPNAT21s'],
  ['clearix', 'mhgbuplnxtfgipbemchb', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZ2J1cGxueHRmZ2lwYmVtY2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODAwMDQsImV4cCI6MjA1OTY1NjAwNH0.478ltLNyzDefQFZjnMHxuM2Qk8Aw8lsIpIrdb-h7rl0'],
  ['nexus', 'tkbhhbzhlqsgcwljeesg', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrYmhoYnpobHFzZ2N3bGplZXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMzNjcsImV4cCI6MjA4OTQ0OTM2N30.mzHTjV8ilOtNV6ydZuEWI11pHVuw3G5yLqlHW4bGrX4'],
  ['polapetit', 'cvqoqnjitqvuopqadfbh', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cW9xbmppdHF2dW9wcWFkZmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzE1ODEsImV4cCI6MjA5MDkwNzU4MX0.YQxZ-My4ap4QB-KMK8U3MgvDsWXNPPexYx0QfFYptME'],
];

export default async () => {
  const resultados = [];
  for (const [nome, ref, key] of PROJETOS) {
    try {
      const r = await fetch(`https://${ref}.supabase.co/rest/v1/`, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(20000),
      });
      resultados.push(`${nome}: ${r.status}`);
    } catch (e) {
      resultados.push(`${nome}: ERRO ${e.name}`);
    }
  }
  console.log('[keepalive]', resultados.join(' · '));
};

export const config = { schedule: '0 9 * * 1,4' };
