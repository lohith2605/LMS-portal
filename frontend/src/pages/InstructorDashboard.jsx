import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ArrowLeft, Users, FileCheck, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/useAuth';

export default function InstructorDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-page text-primary font-sans">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline text-primary font-bold text-lg tracking-tight">
            <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-[15px] font-extrabold tracking-tighter">
              L
            </div>
            <span>LearnSpace</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-[7px] py-[2px] rounded-full bg-accent-sage-pale text-accent-sage-dark">
              Instructor Console
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors py-2 px-3"
            >
              <ArrowLeft size={14} />
              <span>Landing Page</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-surface-subtle text-secondary hover:text-primary border border-border-subtle transition-all cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="bg-white border border-border-subtle rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-10 shadow-card mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-sage-dark mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-sage-dark" />
                <span>Instructor Management Console</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary">
                Welcome, {user?.name}!
              </h1>
              <p className="text-xs sm:text-sm text-secondary mt-1">
                Educator: <span className="font-medium text-primary">{user?.email}</span> • Role: <span className="font-semibold text-accent-sage-dark uppercase text-[11px]">Approved Instructor</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40">
                Active Cohort
              </span>
            </div>
          </div>

          <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface-subtle rounded-xl border border-border-subtle">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-secondary mb-1">
                <Users size={14} />
                <span>Enrolled Learners</span>
              </div>
              <div className="text-2xl font-extrabold text-primary">38 Students</div>
              <div className="text-[11px] text-tertiary mt-1">Distributed across 2 active cohorts</div>
            </div>

            <div className="p-4 bg-surface-subtle rounded-xl border border-border-subtle">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-secondary mb-1">
                <FileCheck size={14} />
                <span>Pending Reviews</span>
              </div>
              <div className="text-2xl font-extrabold text-primary">4 Submissions</div>
              <div className="text-[11px] text-tertiary mt-1">Assignment 02: Event Queue Architecture</div>
            </div>

            <div className="p-4 bg-surface-subtle rounded-xl border border-border-subtle">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-secondary mb-1">
                <Clock size={14} />
                <span>Pacing Velocity</span>
              </div>
              <div className="text-2xl font-extrabold text-primary">91% On Track</div>
              <div className="text-[11px] text-tertiary mt-1">Cohort completion projection: Spring 2026</div>
            </div>
          </div>
        </div>

        <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6 sm:p-8">
          <h2 className="text-base font-bold text-primary mb-2">Instructor Role Policy Enforced</h2>
          <p className="text-xs text-secondary leading-relaxed mb-4">
            You are authenticated with instructor privileges. Access to administrative controls is restricted, while cohort management and assignment grading are permitted.
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent-sage-dark bg-white px-3 py-1.5 rounded-lg border border-border-subtle">
            <CheckCircle2 size={14} />
            <span>Role-Based Access Control Active</span>
          </div>
        </div>
      </main>
    </div>
  );
}
