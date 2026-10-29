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

      <div className="max-w-md bg-white border border-[#E4E4E1] rounded-2xl p-8 shadow-xs">
        <span className="text-4xl font-extrabold text-[#171717] block mb-2">404</span>
        <h1 className="text-xl font-bold text-[#171717] mb-2">Page Not Found</h1>
        <p className="text-sm text-[#686868] mb-6">
          The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#171717] text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all"
          >
            <Home size={14} />
            <span>Return to Home</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E4E4E1] bg-white text-xs font-semibold text-[#171717] hover:bg-[#F2F2F0] transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
