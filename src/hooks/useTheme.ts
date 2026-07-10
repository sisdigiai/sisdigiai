import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

/**
 * Tema DIGIAI House — persistente + respeita preferência do sistema.
 * Escreve data-theme no <html>, então TODAS as utilities Tailwind
 * (bg-surface, text-on-surface, …) trocam junto (ver index.css).
 *
 *   const { theme, toggle } = useTheme();
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('dh-theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  useEffect(() => {
    const el = document.documentElement;
    // Desliga transições durante a troca — evita repaint travado de
    // background-color via var() com transition-colors (bug de engine).
    el.classList.add('dh-theme-switching');
    el.setAttribute('data-theme', theme);
    localStorage.setItem('dh-theme', theme);
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => el.classList.remove('dh-theme-switching'))
    );
    return () => cancelAnimationFrame(id);
  }, [theme]);
  return { theme, setTheme, toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) };
}
