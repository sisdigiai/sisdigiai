import React from 'react';

interface PageHeaderProps {
  /** Rótulo mono em sage acima do título (ex.: "DASHBOARD INTERNO"). Opcional. */
  eyebrow?: string;
  /** Título da página — renderizado em serif, escala-herói fixa. */
  title: string;
  /** Linha descritiva curta abaixo da régua. Opcional. */
  subtitle?: React.ReactNode;
  /** Controles à direita (botões, pills de status, etc.). Opcional. */
  actions?: React.ReactNode;
  /** Conteúdo extra logo abaixo do bloco de título (ex.: abas). Opcional. */
  children?: React.ReactNode;
}

/**
 * Abertura de seção canônica do app (sistema "Geometric Precision").
 * Padrão único usado por TODOS os módulos para garantir ritmo editorial:
 * eyebrow mono → título serif → régua sage → subtítulo.
 */
export default function PageHeader({ eyebrow, title, subtitle, actions, children }: PageHeaderProps) {
  return (
    <header className="mb-10">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          {eyebrow && (
            <span className="block font-mono text-[11px] text-secondary uppercase tracking-[0.2em] mb-2">
              {eyebrow}
            </span>
          )}
          <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-on-surface">
            {title}
          </h1>
          <div className="h-px w-24 bg-secondary mt-4" />
          {subtitle && (
            <p className="text-on-surface-variant mt-3 text-sm max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
