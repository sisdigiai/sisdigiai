# Substituir /brand e /referencias-design — DIGIAI House v1.0

> Briefing pronto para o **agente do app** (`D:\projetos\digiai`) executar, verificar e publicar.
> Stack confirmado: React 19 + Vite 6 + **Tailwind 4 (`@theme`)** + lucide-react + motion. Rotas hash já existem (`#/brand`, `#/referencias-design`) — **não mexer no App.tsx** exceto o toggle opcional (§5).

## Arquivos deste pacote → destino no repo

| Deste pacote (`export/app/`) | Copiar para | Ação |
|---|---|---|
| `src/index.css` | `digiai/src/index.css` | **Substituir** (mantém todos os nomes de token atuais; só adiciona `-strong`, status, eco e o light mode). |
| `src/lib/dhMesh.ts` | `digiai/src/lib/dhMesh.ts` | **Novo** (motor da malha + reveal, verificado). |
| `src/hooks/useTheme.ts` | `digiai/src/hooks/useTheme.ts` | **Novo**. |

Depois: reconstruir os 2 componentes de página (§4) a partir da **referência visual verificada** (abrir no editor de design):
`DIGIAI Design System — Brand.dc.html` → `src/components/BrandGuidelines.tsx`
`DIGIAI Design System — Referências.dc.html` → `src/modules/ReferenciasDesign.tsx`

## 1. index.css
Substituir o arquivo. Nada quebra: `surface`, `on-surface`, `secondary`, `forest`, `muted`, `outline`, `brand-*` continuam com os mesmos valores no dark. Novidades: `outline-strong`, `action`/`action-hover`/`on-action`, `success|warning|danger|info(+bg/bd)`, `eco-*`, e o bloco `[data-theme="light"]`.

## 2. index.html
```html
<html lang="pt-BR" data-theme="dark">
```

## 3. Tema
`useTheme()` já escreve `data-theme` no `<html>` e persiste. Como o `index.css` sobrescreve os mesmos nomes de token sob `[data-theme="light"]`, **o app inteiro** ganha light/dark sem tocar em nenhum outro módulo.

## 4. Reconstruir as 2 páginas (a partir do .dc.html de referência)
Portar o markup 1:1 usando as **utilities Tailwind existentes** (`bg-surface`, `text-on-surface`, `text-secondary`, `text-muted`, `border-outline`, `font-serif`, `font-mono`) — evitar hex hardcoded. A parte difícil (malha 3D + animações) já está pronta em `dhMesh.ts`. Esqueleto:

```tsx
// src/components/BrandGuidelines.tsx
import { useEffect, useRef } from 'react';
import { initConvergenceMesh, initReveal } from '../lib/dhMesh';
import { useTheme } from '../hooks/useTheme';

export default function BrandGuidelines() {
  const { theme, toggle } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { return canvasRef.current ? initConvergenceMesh(canvasRef.current) : undefined; }, []);
  useEffect(() => { return rootRef.current ? initReveal(rootRef.current) : undefined; }, []);

  return (
    <div ref={rootRef} className="bg-surface text-on-surface">
      {/* Cover: <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" /> */}
      {/* Botão de tema: <button onClick={toggle}>…{theme}</button> */}
      {/* Fundamentos, expressão, componentes — portar do .dc.html de referência */}
      {/* Métricas/telemetria: <div data-reveal><div data-count="20488">20.488</div>…</div> */}
      {/* Linhas que desenham: <div data-draw className="h-0.5 bg-action" /> */}
    </div>
  );
}
```
`ReferenciasDesign.tsx` (em `src/modules/`) segue o mesmo padrão, sem canvas — só `initReveal` + `useTheme`. Manter o `export default`.

## 5. (Opcional) Toggle global no header
Em `App.tsx`, no `<header>`, adicionar um botão que chama `useTheme().toggle()` — assim a troca fica disponível em todo o app, não só nas páginas de design.

## 6. Verificar (obrigatório antes do push)
```bash
npm run lint      # tsc --noEmit — zero erros de tipo
npm run dev       # abrir #/brand e #/referencias-design
```
Aceite: malha renderiza (não fica 1×1/verde), toggle claro/escuro troca o app inteiro e persiste, métricas contam ao entrar, zero hex hardcoded fora do index.css, `prefers-reduced-motion` desliga animações.

## 7. Publicar
```bash
git switch -c feat/design-system-digiai-house
git add src/index.css src/lib/dhMesh.ts src/hooks/useTheme.ts src/components/BrandGuidelines.tsx src/modules/ReferenciasDesign.tsx index.html
git commit -m "feat(design-system): DIGIAI House v1.0 — /brand + /referencias-design + light mode"
git push -u origin feat/design-system-digiai-house
# abrir PR / merge → deploy (Netlify) publica sisdigiai
```

## 8. Travar nos docs (`digiai-docs`)
Copiar `DIGIAI-Design-System.md` para `digiai-docs/design-system/` + ADR "Adoção DIGIAI House v1.0 (recria e aposenta Cockpit/design_system)". Referenciar as rotas vivas como fonte canônica.

---
**Landing pública** (`digiai.app.br`) é outro repositório (`digiai-site`, Astro) — as home v1–v5 são a referência pra ela; tratamos numa próxima rodada linkando `digiai-site`.
