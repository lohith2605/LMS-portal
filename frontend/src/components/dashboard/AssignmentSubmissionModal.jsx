import React, { useState } from 'react';
import {
  X,
  FileText,
  Upload,
  Calendar,
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Trash2,
  FileDown,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { assignmentService } from '../../services/api';

export default function AssignmentSubmissionModal({
  assignment,
  existingSubmission = null,
  onClose,
  onSubmitted,
}) {
  const [submissionText, setSubmissionText] = useState(
    existingSubmission?.submissionText || ''
  );
  const [submittedFiles, setSubmittedFiles] = useState(
    existingSubmission?.submittedFiles || []
  );
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadingName, setCurrentUploadingName] = useState('');
  const [error, setError] = useState(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const dueDate = new Date(assignment.dueDate);
  const isPastDue = new Date() > dueDate;
  const allowsLate = assignment.allowLateSubmissions !== false;
  const isSubmissionBlocked = isPastDue && !allowsLate;

  const supportsText = assignment.submissionTypes?.includes('text');
  const supportsFile = assignment.submissionTypes?.includes('file');
  const maxFileSizeMB = assignment.maxFileSizeMB || 10;
  const allowedExts = (assignment.allowedFileTypes || ['pdf', 'zip', 'docx']).map((e) =>
    e.toLowerCase().replace('.', '')
  );

  // Secure Multipart File Upload to Cloudinary via Backend
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    setError(null);

    // Reset input value so same file can be re-selected if needed
    const fileInputElement = e.target;

    for (const file of files) {
      // Validate file size locally before sending
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the maximum limit of ${maxFileSizeMB} MB.`);
        fileInputElement.value = '';
        return;
      }

      // Validate extension locally before sending
      const ext = file.name.split('.').pop().toLowerCase();
      if (allowedExts.length > 0 && !allowedExts.includes(ext)) {
        setError(`File format ".${ext}" is not permitted. Allowed types: ${allowedExts.join(', ')}`);
        fileInputElement.value = '';
        return;
      }

      try {
        setUploading(true);
        setCurrentUploadingName(file.name);
        setUploadProgress(10);

        const uploadRes = await assignmentService.uploadAssignmentFile(
          assignment._id,
          file,
          (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          }
        );

        if (uploadRes && uploadRes.file) {
          setSubmittedFiles((prev) => [...prev, uploadRes.file]);
        }
      } catch (uploadErr) {
        setError(uploadErr.normalizedMessage || `Failed to upload "${file.name}". Please try again.`);
        fileInputElement.value = '';
        setUploading(false);
        return;
      } finally {
        setUploading(false);
        setUploadProgress(0);
        setCurrentUploadingName('');
      }
    }

    fileInputElement.value = '';
  };

  const handleRemoveFile = (idx) => {
    setSubmittedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmissionBlocked) {
      setError('The deadline has passed and late submissions are disabled.');
      return;
    }

    if (uploading) {
      setError('Please wait for file uploads to complete before submitting.');
      return;
    }

    const hasText = Boolean(submissionText.trim());
    const hasFiles = submittedFiles.length > 0;

    if (!hasText && !hasFiles) {
      setError('Please provide a written response or attach a valid file.');
      return;
    }

    if (!confirmSubmit && !existingSubmission) {
      setConfirmSubmit(true);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await assignmentService.submitAssignment(assignment._id, {
        submissionText,
        submittedFiles,
      });

      if (onSubmitted) onSubmitted(res.submission);
      onClose();
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to submit assignment.');
      setConfirmSubmit(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#171717]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-border-subtle rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-blue-pale text-accent-blue-dark flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">{assignment.title}</h2>
              <p className="text-xs text-secondary">
                {assignment.course?.title || 'Enrolled Course'} • Max {assignment.maxMarks} points
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-primary rounded-lg hover:bg-border-subtle transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Deadline Pill */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              isPastDue
                ? allowsLate
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-surface-subtle border-border-subtle text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock size={16} className="shrink-0" />
              <div>
                <span className="font-bold block">
                  {isPastDue
                    ? allowsLate
                      ? 'Late Submission Period'
                      : 'Deadline Has Passed'
                    : 'Submission Deadline'}
                </span>
                <span className="text-[11px] opacity-90">Due: {dueDate.toLocaleString()}</span>
              </div>
            </div>

            {assignment.latePenaltyPercent > 0 && allowsLate && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 shrink-0">
                {assignment.latePenaltyPercent}% Late Penalty
              </span>
            )}
          </div>

          {/* Instructions Box */}
          <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-2">
            <h4 className="font-bold text-primary uppercase text-[10px] tracking-wider text-secondary">
              Assignment Instructions & Requirements
            </h4>
            <p className="text-secondary leading-relaxed whitespace-pre-wrap">
              {assignment.instructions}
            </p>

            {/* Instructor Attachments */}
            {assignment.attachments && assignment.attachments.length > 0 && (
              <div className="pt-2 border-t border-border-subtle/60 space-y-1">
                <span className="font-semibold text-primary block">Supplementary Resources:</span>
                <div className="flex flex-wrap gap-2">
                  {assignment.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-border-subtle text-primary font-medium hover:bg-surface-subtle transition"
                    >
                      <Paperclip size={12} />
                      <span>{att.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Existing Evaluation Feedback if Graded or Returned */}
          {existingSubmission && (
            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                existingSubmission.status === 'graded'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : existingSubmission.status === 'returned_for_revision'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-surface-subtle border-border-subtle text-primary'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider">
                  Submission Status: {existingSubmission.status.replace(/_/g, ' ')} (v{existingSubmission.version})
                </span>
                {existingSubmission.grade !== null && (
                  <span className="font-bold text-sm">
                    {existingSubmission.grade} / {assignment.maxMarks} pts
                  </span>
                )}
              </div>

              {existingSubmission.feedback && (
                <div className="pt-1 text-[11px] leading-relaxed">
                  <strong>Instructor Feedback:</strong> {existingSubmission.feedback}
                </div>
              )}
            </div>
          )}

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Written Text Field */}
            {supportsText && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-primary">Written Text Response</label>
                  <span className="text-[10px] text-tertiary">{submissionText.length} / 10,000</span>
                </div>
                <textarea
                  rows={6}
                  disabled={isSubmissionBlocked}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Enter your written response, analysis, or project documentation..."
                  className="w-full p-3.5 rounded-2xl border border-border-subtle bg-surface-subtle text-xs text-primary focus:outline-none focus:bg-white focus:border-primary disabled:opacity-50 leading-relaxed"
                />
              </div>
            )}

            {/* File Upload Field */}
            {supportsFile && (
              <div className="space-y-2">
                <label className="font-semibold text-primary block">
                  File Upload (Allowed: {allowedExts.join(', ')} • Max {maxFileSizeMB} MB)
                </label>

                {!isSubmissionBlocked && (
                  <div className="p-4 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-subtle/50 text-center hover:bg-surface-subtle transition">
                    <Upload size={20} className="mx-auto text-secondary mb-1.5" />
                    <p className="font-semibold text-primary text-[11px]">Choose files to attach</p>
                    <p className="text-[10px] text-tertiary mb-2">Drag and drop or browse local storage</p>
                    <input
                      type="file"
                      multiple
                      disabled={uploading}
                      onChange={handleFileChange}
                      className="text-xs text-secondary file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-primary file:text-white hover:file:bg-[#2b2b2b] cursor-pointer disabled:opacity-50"
                    />
                  </div>
                )}

                {/* Upload Progress Indicator */}
                {uploading && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="truncate">Uploading {currentUploadingName}...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Attached Files List */}
                {submittedFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {submittedFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-surface-subtle border border-border-subtle"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <Paperclip size={13} className="text-secondary shrink-0" />
                          <span className="font-semibold text-primary truncate">{f.originalName}</span>
                          <span className="text-[10px] text-tertiary shrink-0">
                            ({Math.round(f.fileSize / 1024)} KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {f.fileUrl && (
                            <a
                              href={assignmentService.getFileDownloadUrl(f.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-secondary text-[10px] font-semibold underline"
                            >
                              Download
                            </a>
                          )}
                          {!isSubmissionBlocked && !uploading && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Confirmation Banner */}
            {confirmSubmit && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>Ready to submit? You may resubmit if revision is permitted.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmSubmit(false)}
                  className="text-xs font-bold underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border-subtle bg-white font-semibold text-secondary hover:text-primary transition cursor-pointer"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={isSubmissionBlocked || submitting || uploading}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-[#2b2b2b] transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send size={14} />
                <span>
                  {submitting
                    ? 'Submitting...'
                    : uploading
                    ? 'Uploading Files...'
                    : confirmSubmit
                    ? 'Confirm & Submit Deliverable'
                    : existingSubmission
                    ? 'Submit Updated Version'
                    : 'Submit Assignment'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
