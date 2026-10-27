import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Award,
  Calendar,
  User,
  BookOpen,
  ArrowLeft,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import { certificateService } from '../services/api';

export default function CertificateVerifyPage() {
  const { certificateId } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    certificateService
      .verifyCertificate(certificateId)
      .then((data) => {
        if (!isMounted) return;
        setCertificate(data.certificate);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.normalizedMessage || 'Certificate not found or revoked.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [certificateId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F0] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#171717] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#686868] font-medium">
            Verifying credential authenticity...
          </p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-[#F2F2F0] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-[#E4E4E1] rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <h1 className="text-lg font-bold text-[#171717]">Invalid Certificate ID</h1>
          <p className="text-xs text-[#686868] leading-relaxed">
            The certificate reference{' '}
            <span className="font-mono font-semibold text-[#171717]">{certificateId}</span>{' '}
            could not be validated against the LearnSpace credential registry.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#171717] text-white text-xs font-semibold rounded-xl hover:bg-[#2b2b2b] transition"
            >
              <ArrowLeft size={14} /> Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#F2F2F0] py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation & Verification Status Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-xs text-[#686868] hover:text-[#171717] flex items-center gap-1.5 font-medium transition"
          >
            <ArrowLeft size={14} />
            <span>LearnSpace Academy</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-white border border-[#E4E4E1] text-xs font-medium text-[#171717] rounded-xl hover:bg-[#F2F2F0] transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} className="text-[#686868]" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#171717] text-white text-xs font-medium rounded-xl hover:bg-[#2b2b2b] transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer size={13} />
              <span>Print Credential</span>
            </button>
          </div>
        </div>

        {/* Official Certificate Card */}
        <div
          id="certificate-print-area"
          className="bg-white border-4 border-[#171717] rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden"
        >
          {/* Subtle Decorative Background Lines */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#A8B5A0]/10 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-[#637D91]/10 rounded-full pointer-events-none" />

          {/* Certificate Header */}
          <div className="text-center space-y-2 relative z-10">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#171717] text-white mb-2 shadow-sm">
              <Award size={32} />
            </div>
            <div className="text-[11px] font-bold text-[#637D91] tracking-[0.2em] uppercase">
              Official Credential of Completion
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
              LearnSpace Academic Certification
            </h1>
          </div>

          <div className="my-8 text-center space-y-4 relative z-10">
            <p className="text-xs text-[#686868] uppercase tracking-wider font-semibold">
              This acknowledges that
            </p>
            <div className="text-xl sm:text-2xl font-bold text-[#171717] underline decoration-[#A8B5A0] decoration-2 underline-offset-8">
              {certificate.studentName}
            </div>
            <p className="text-xs text-[#686868] leading-relaxed max-w-md mx-auto pt-2">
              has satisfactorily completed the curriculum requirements, rigorous assessments, and
              practical mastery evaluations for
            </p>
            <div className="text-lg sm:text-xl font-bold text-[#171717] px-4 py-2 bg-[#F2F2F0] rounded-2xl inline-block border border-[#E4E4E1]">
              {certificate.courseTitle}
            </div>
          </div>

          {/* Metadata Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-[#E4E4E1] my-6 text-center relative z-10">
            <div>
              <span className="block text-[10px] font-bold text-[#686868] uppercase tracking-wider">
                Specialization
              </span>
              <span className="text-xs font-semibold text-[#171717]">
                {certificate.category}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#686868] uppercase tracking-wider">
                Difficulty
              </span>
              <span className="text-xs font-semibold text-[#171717]">{certificate.level}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#686868] uppercase tracking-wider">
                Final Grade
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {certificate.finalGrade}% (Passed)
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#686868] uppercase tracking-wider">
                Issue Date
              </span>
              <span className="text-xs font-semibold text-[#171717]">{formattedDate}</span>
            </div>
          </div>

          {/* Footer Signature & Verification Badge */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-[#171717] flex items-center gap-1">
                  Verified Authenticity <CheckCircle2 size={13} className="text-emerald-600" />
                </span>
                <span className="block font-mono text-[11px] text-[#637D91]">
                  ID: {certificate.certificateId}
                </span>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <div className="font-serif italic text-sm text-[#171717] font-semibold border-b border-[#171717] pb-1 inline-block">
                {certificate.instructorName}
              </div>
              <span className="block text-[10px] font-medium text-[#686868] mt-1">
                Authorized Lead Instructor
              </span>
            </div>
          </div>
        </div>

        {/* Public Registry Note */}
        <div className="text-center text-[11px] text-[#686868] space-y-1">
          <p>
            LearnSpace Immutable Credential Registry • Verified cryptographically against server-side
            assessment records.
          </p>
        </div>
      </div>
    </div>
  );
}
