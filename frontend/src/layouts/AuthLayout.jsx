import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

export default function AuthLayout({
  children,
  eyebrow = 'LEARNING PORTAL',
  headline = 'Your next breakthrough starts here.',
  description = 'Return to your courses, continue building practical skills, and keep your learning journey moving forward.',
  highlights = [],
  quote = 'Learn with purpose. Progress with confidence.',
  panelBadge = 'Platform',
  formTitle,
  formSubtitle,
  backLink = '/',
  backLabel = 'Back to Home'
}) {
  return (
    <div className="min-h-screen bg-white text-[#171717] font-sans antialiased selection:bg-[#EDF0E9] selection:text-[#171717]">
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        
        {/* ========================================================= */}
        {/* LEFT PANEL: LearnSpace Brand Experience (~46-48%)         */}
        {/* ========================================================= */}
        <aside className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-[#F2F2F0] border-r border-[#E4E4E1] flex-col justify-between p-8 xl:p-12 relative overflow-hidden">
          
          {/* Subtle architectural background accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#E9EFF2]/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#EDF0E9]/50 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          {/* Top Brand & Navigation Header */}
          <div className="relative z-10 flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-3 no-underline text-[#171717] font-bold text-lg tracking-tight group"
              aria-label="LearnSpace Home"
            >
              <div className="w-8 h-8 bg-[#171717] text-white rounded-lg flex items-center justify-center text-[15px] font-extrabold tracking-tighter shadow-xs group-hover:scale-105 transition-transform">
                L
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight">LearnSpace</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EDF0E9] text-[#5F7158] border border-[#A8B5A0]/30">
                  {panelBadge}
                </span>
              </div>
            </Link>

            <Link
              to={backLink}
              className="text-xs font-semibold text-[#686868] hover:text-[#171717] transition-colors inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E4E4E1] bg-white/80 hover:bg-white shadow-2xs backdrop-blur-xs"
            >
              <ArrowLeft size={13} />
              <span>{backLabel}</span>
            </Link>
          </div>

          {/* Middle Story & Highlights Section */}
          <div className="relative z-10 my-auto py-8 max-w-md">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E4E4E1] text-[11px] font-bold tracking-wider uppercase text-[#637D91] mb-5 shadow-2xs">
              <Sparkles size={12} className="text-[#637D91]" />
              <span>{eyebrow}</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl xl:text-[34px] font-extrabold tracking-tight text-[#171717] leading-[1.2] mb-4">
              {headline}
            </h1>

            {/* Supporting Text */}
            <p className="text-sm text-[#686868] leading-relaxed mb-8">
              {description}
            </p>

            {/* Custom Feature Highlights / Steps */}
            {highlights && highlights.length > 0 && (
              <div className="space-y-3.5">
                {highlights.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white/90 border border-[#E4E4E1] shadow-2xs flex items-start gap-3.5 transition-all hover:bg-white hover:border-[#D5D5D0]"
                    >
                      {Icon && (
                        <div className="w-9 h-9 rounded-xl bg-[#E9EFF2] text-[#4A6376] flex items-center justify-center shrink-0 border border-[#637D91]/20">
                          <Icon size={18} />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xs font-bold text-[#171717] leading-tight mb-0.5">
                          {item.title}
                        </h2>
                        <p className="text-[12px] text-[#686868] leading-normal">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Brand Credibility Footer */}
          <div className="relative z-10 pt-6 border-t border-[#E4E4E1]/80 flex flex-col gap-2">
            <p className="text-xs font-medium text-[#171717] italic">
              "{quote}"
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#8A8A86]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#5F7158]" />
                <span>Encrypted Session • Role-Based Security</span>
              </div>
              <span>v2.1</span>
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* RIGHT PANEL: Form Container (~52-54%)                     */}
        {/* ========================================================= */}
        <main className="col-span-1 lg:col-span-7 xl:col-span-7 bg-white flex flex-col justify-between min-h-screen p-5 sm:p-8 lg:p-10 xl:p-12 overflow-y-auto">
          
          {/* Mobile Top Header (hidden on desktop) */}
          <div className="flex lg:hidden items-center justify-between pb-6 border-b border-[#E4E4E1]">
            <Link
              to="/"
              className="flex items-center gap-2.5 no-underline text-[#171717] font-bold text-base tracking-tight"
            >
              <div className="w-7 h-7 bg-[#171717] text-white rounded-lg flex items-center justify-center text-xs font-extrabold">
                L
              </div>
              <span className="font-bold">LearnSpace</span>
            </Link>

            <Link
              to={backLink}
              className="text-xs font-semibold text-[#686868] hover:text-[#171717] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E4E4E1] bg-[#F8F8F6]"
            >
              <ArrowLeft size={12} />
              <span>{backLabel}</span>
            </Link>
          </div>

          {/* Center Form Wrapper */}
          <div className="w-full max-w-[420px] mx-auto my-auto py-6 sm:py-8">
            {formTitle && (
              <div className="mb-6">
                <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#171717]">
                  {formTitle}
                </h2>
                {formSubtitle && (
                  <p className="text-xs sm:text-sm text-[#686868] mt-1.5 leading-relaxed">
                    {formSubtitle}
                  </p>
                )}
              </div>
            )}

            {children}
          </div>

          {/* Subdued Bottom Form Footer */}
          <footer className="pt-6 border-t border-[#E4E4E1] text-[11px] text-[#8A8A86] flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <span>© 2026 LearnSpace Platform. All rights reserved.</span>
            <div className="flex items-center gap-3">
              <span className="hover:text-[#171717] cursor-pointer">Security</span>
              <span>•</span>
              <span className="hover:text-[#171717] cursor-pointer">Terms</span>
              <span>•</span>
              <span className="hover:text-[#171717] cursor-pointer">Privacy</span>
            </div>
          </footer>
        </main>

      </div>
    </div>
  );
}
