import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Award, ExternalLink, Printer } from 'lucide-react';
import { certificateService } from '../../../services/api';
import EmptyState from '../EmptyState';
import LoadingState from '../LoadingState';

export default function CertificatesTab({ setActiveTab }) {
  const [certificates, setCertificates] = useState([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [certError, setCertError] = useState(null);

  const fetchCertificates = useCallback(async () => {
    try {
      setCertificatesLoading(true);
      setCertError(null);
      const res = await certificateService.getStudentCertificates();
      setCertificates(res?.certificates || []);
    } catch (err) {
      setCertError(err.normalizedMessage || 'Failed to load earned certificates.');
    } finally {
      setCertificatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-primary mb-1">
            Earned Certificates of Completion
          </h2>
          <p className="text-xs text-secondary">
            Official verifiable credentials awarded for completing course modules and passing required assessments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('learning')}
          className="px-3.5 py-2 rounded-xl border border-border-subtle bg-surface-subtle text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer self-start sm:self-auto"
        >
          View My Learning
        </button>
      </div>

      {certError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {certError}
        </div>
      )}

      {certificatesLoading ? (
        <LoadingState message="Loading your earned credentials..." cardsCount={2} />
      ) : certificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates earned yet."
          description="When you complete 100% of lessons and achieve passing scores on mandatory assessments in your enrolled courses, your official tamper-evident certificates will appear here."
          actionLabel="Go to My Learning"
          onAction={() => setActiveTab('learning')}
          secondaryActionLabel="Explore Catalog"
          onSecondaryAction={() => setActiveTab('explore')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert._id}
              className="bg-white border border-border-subtle rounded-3xl p-6 shadow-xs hover:border-accent-sage-dark/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-accent-sage-pale text-accent-sage-dark flex items-center justify-center">
                      <Award size={18} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent-sage-dark">
                      Verified Credential
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Active & Valid
                  </span>
                </div>

                <h3 className="text-base font-bold text-primary mb-1">
                  {cert.courseTitleSnapshot || cert.course?.title || 'Course Completion'}
                </h3>

                <div className="space-y-1.5 my-4 p-3 bg-surface-subtle rounded-xl border border-border-subtle text-xs">
                  <div className="flex justify-between">
                    <span className="text-secondary">Certificate ID:</span>
                    <span className="font-mono font-semibold text-primary">
                      {cert.certificateId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Issued To:</span>
                    <span className="font-semibold text-primary">
                      {cert.studentNameSnapshot}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Completion Date:</span>
                    <span className="font-medium text-primary">
                      {new Date(cert.issueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
                <Link
                  to={`/verify/${cert.certificateId}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={13} />
                  <span>View & Verify</span>
                </Link>

                <button
                  type="button"
                  onClick={() => window.open(`/verify/${cert.certificateId}`, '_blank')}
                  className="py-2 px-3 rounded-xl bg-surface-subtle border border-border-subtle text-secondary hover:text-primary text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

