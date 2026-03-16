'use client';

import { useTheme } from '@/lib/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all duration-300 ${
        isDark
          ? 'border-slate-700 bg-slate-900/80 text-slate-100 hover:border-sky-400 hover:text-sky-200'
          : 'border-slate-200 bg-white/85 text-slate-700 hover:border-blue-300 hover:text-blue-700'
      }`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${isDark ? 'bg-sky-400/15' : 'bg-amber-100'}`}>
        {isDark ? 'M' : 'S'}
      </span>
      <span>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
