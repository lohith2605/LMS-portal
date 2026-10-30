import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/useTheme';

export default function ThemeToggle({ className = '', showLabel = false }) {
  const { theme, isDark, toggleTheme } = useTheme();

  const nextThemeName = isDark ? 'Paper Light' : 'Midnight Ink';
  const currentThemeName = isDark ? 'Midnight Ink' : 'Paper Light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextThemeName} theme`}
      aria-pressed={isDark}
      title={`Switch to ${nextThemeName} theme (currently ${currentThemeName})`}
      className={`relative inline-flex items-center justify-center gap-2 p-2 rounded-xl border border-border-subtle bg-surface text-secondary hover:text-primary hover:border-border-medium transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95 ${className}`}
    >
      <div className="relative w-4.5 h-4.5 flex items-center justify-center">
        {/* Sun Icon (Paper Light) */}
        <Sun
          size={16}
          className={`transition-all duration-300 absolute ${
            isDark
              ? 'opacity-0 rotate-90 scale-50 pointer-events-none'
              : 'opacity-100 rotate-0 scale-100 text-amber-600'
          }`}
          aria-hidden="true"
        />
        {/* Moon Icon (Midnight Ink) */}
        <Moon
          size={16}
          className={`transition-all duration-300 absolute ${
            isDark
              ? 'opacity-100 rotate-0 scale-100 text-indigo-300'
              : 'opacity-0 -rotate-90 scale-50 pointer-events-none'
          }`}
          aria-hidden="true"
        />
      </div>

      {showLabel && (
        <span className="text-xs font-semibold select-none">
          {currentThemeName}
        </span>
      )}
    </button>
  );
}
