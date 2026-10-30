import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import BrandLogo from '../components/ui/BrandLogo';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6">
        <BrandLogo to="/" size="lg" ariaLabel="LearnSpace Home" />
      </div>

      <div className="max-w-md bg-surface border border-border-subtle rounded-2xl p-8 shadow-card">
        <span className="text-4xl font-extrabold text-cobalt block mb-2">404</span>
        <h1 className="text-xl font-bold text-primary mb-2">Page Not Found</h1>
        <p className="text-sm text-secondary mb-6">
          The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all"
          >
            <Home size={14} />
            <span>Return to Home</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border-subtle bg-surface text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
