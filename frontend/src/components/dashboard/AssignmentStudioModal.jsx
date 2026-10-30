import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Calendar,
  Clock,
  Award,
  Upload,
  Layers,
  AlertCircle,
  Save,
  Send,
  Plus,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { assignmentService } from '../../services/api';

export default function AssignmentStudioModal({
  courseId,
  assignmentId = null,
  courses = [],
  onClose,
  onSaved,
}) {
  const [selectedCourseId, setSelectedCourseId] = useState(courseId || courses[0]?._id || '');
  const [loading, setLoading] = useState(Boolean(assignmentId));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    maxMarks: 100,
    dueDate: '',
    submissionTypes: ['text', 'file'],
    allowedFileTypes: ['pdf', 'zip', 'docx'],
    maxFileSizeMB: 10,
    allowLateSubmissions: true,
    latePenaltyPercent: 0,
    attachments: [],
    sectionId: '',
  });

  // Attachment state for adding supplementary resources
  const [attName, setAttName] = useState('');
  const [attUrl, setAttUrl] = useState('');

  // Load existing assignment if editing
  useEffect(() => {
    if (!assignmentId) return;

    let isMounted = true;
    setLoading(true);

    assignmentService
      .getInstructorAssignmentById(assignmentId)
      .then((data) => {
        if (!isMounted) return;
        const a = data.assignment;
        setSelectedCourseId(typeof a.course === 'object' ? a.course?._id : a.course);
        setFormData({
          title: a.title || '',
          description: a.description || '',
          instructions: a.instructions || '',
          maxMarks: a.maxMarks || 100,
          dueDate: a.dueDate ? new Date(a.dueDate).toISOString().slice(0, 16) : '',
          submissionTypes: a.submissionTypes || ['text'],
          allowedFileTypes: a.allowedFileTypes || ['pdf', 'zip', 'docx'],
          maxFileSizeMB: a.maxFileSizeMB || 10,
          allowLateSubmissions: a.allowLateSubmissions !== false,
          latePenaltyPercent: a.latePenaltyPercent || 0,
          attachments: a.attachments || [],
          sectionId: a.sectionId || '',
        });
      })
      .catch((err) => {
        if (isMounted) setError(err.normalizedMessage || 'Failed to load assignment details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [assignmentId]);

  // Handle submission type toggle
  const toggleSubmissionType = (type) => {
    setFormData((prev) => {
      const exists = prev.submissionTypes.includes(type);
      if (exists) {
        if (prev.submissionTypes.length === 1) return prev; // Keep at least one
        return { ...prev, submissionTypes: prev.submissionTypes.filter((t) => t !== type) };
      }
      return { ...prev, submissionTypes: [...prev.submissionTypes, type] };
    });
  };

  // Add supplementary attachment
  const handleAddAttachment = () => {
    if (!attName.trim() || !attUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, { name: attName.trim(), url: attUrl.trim(), fileType: 'link' }],
    }));
    setAttName('');
    setAttUrl('');
  };

  const handleRemoveAttachment = (idx) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      setError('Assignment title is required.');
      return;
    }
    if (!selectedCourseId) {
      setError('Please select a course for this assignment.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      let res;
      if (assignmentId) {
        res = await assignmentService.updateAssignment(assignmentId, formData);
      } else {
        res = await assignmentService.createAssignment(selectedCourseId, formData);
      }
      setSuccessMessage('Assignment draft saved successfully.');
      if (onSaved) onSaved(res.assignment);
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to save assignment draft.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!formData.title.trim()) {
      setError('Assignment title is required.');
      return;
    }
    if (!formData.instructions.trim()) {
      setError('Assignment instructions are required.');
      return;
    }
    if (!formData.dueDate) {
      setError('Assignment due date is required for publishing.');
      return;
    }
    if (!selectedCourseId) {
      setError('Please select a course for this assignment.');
      return;
    }

    try {
      setPublishing(true);
      setError(null);
      let savedId = assignmentId;
      if (!savedId) {
        const createRes = await assignmentService.createAssignment(selectedCourseId, formData);
        savedId = createRes.assignment._id;
      } else {
        await assignmentService.updateAssignment(savedId, formData);
      }

      const publishRes = await assignmentService.publishAssignment(savedId);
      setSuccessMessage('Assignment successfully published to learners!');
      if (onSaved) onSaved(publishRes.assignment);
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to publish assignment.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#171717]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-border-subtle rounded-3xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-blue-pale text-accent-blue-dark flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">
                {assignmentId ? 'Assignment Studio: Edit' : 'Assignment Studio: Create'}
              </h2>
              <p className="text-xs text-secondary">
                Configure deliverables, grading rubrics, deadlines, and submission policies.
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              {successMessage}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-secondary">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading assignment configuration...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Course Selector */}
              <div>
                <label className="block font-semibold text-primary mb-1">Associated Course *</label>
                <select
                  disabled={Boolean(assignmentId)}
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs text-primary focus:outline-none focus:bg-white focus:border-primary disabled:opacity-60"
                >
                  <option value="">Select a Course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-primary mb-1">Assignment Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Capstone Architecture Blueprint"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs text-primary focus:outline-none focus:bg-white focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-primary mb-1">Summary / Context</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief 1-line overview of the assignment topic"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs text-primary focus:outline-none focus:bg-white focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-primary mb-1">Detailed Instructions *</label>
                  <textarea
                    rows={4}
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Provide detailed submission deliverables, requirements, and evaluation rubric..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs text-primary focus:outline-none focus:bg-white focus:border-primary"
                  />
                </div>
              </div>

              {/* Evaluation & Deadlines */}
              <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-4">
                <h4 className="font-bold text-primary uppercase text-[10px] tracking-wider text-secondary">
                  Deadlines & Grading Configuration
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-primary mb-1">Maximum Marks *</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.maxMarks}
                      onChange={(e) => setFormData({ ...formData, maxMarks: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl border border-border-subtle bg-white text-xs text-primary focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-primary mb-1">Due Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-border-subtle bg-white text-xs text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-subtle/60">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowLate"
                      checked={formData.allowLateSubmissions}
                      onChange={(e) => setFormData({ ...formData, allowLateSubmissions: e.target.checked })}
                      className="rounded border-border-subtle text-primary focus:ring-primary"
                    />
                    <label htmlFor="allowLate" className="font-medium text-primary">
                      Allow late submissions after deadline
                    </label>
                  </div>

                  {formData.allowLateSubmissions && (
                    <div>
                      <label className="block font-semibold text-primary mb-1">Late Penalty (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.latePenaltyPercent}
                        onChange={(e) => setFormData({ ...formData, latePenaltyPercent: Number(e.target.value) })}
                        placeholder="e.g. 10 for 10% deduction"
                        className="w-full px-3.5 py-1.5 rounded-xl border border-border-subtle bg-white text-xs text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Submission Format Settings */}
              <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-4">
                <h4 className="font-bold text-primary uppercase text-[10px] tracking-wider text-secondary">
                  Submission Types & File Rules
                </h4>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 font-medium text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.submissionTypes.includes('text')}
                      onChange={() => toggleSubmissionType('text')}
                      className="rounded border-border-subtle text-primary focus:ring-primary"
                    />
                    <span>Written Text Response</span>
                  </label>

                  <label className="flex items-center gap-2 font-medium text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.submissionTypes.includes('file')}
                      onChange={() => toggleSubmissionType('file')}
                      className="rounded border-border-subtle text-primary focus:ring-primary"
                    />
                    <span>File Upload Attachment</span>
                  </label>
                </div>

                {formData.submissionTypes.includes('file') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-subtle/60">
                    <div>
                      <label className="block font-semibold text-primary mb-1">
                        Allowed File Types (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={formData.allowedFileTypes.join(', ')}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            allowedFileTypes: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="pdf, zip, docx, png"
                        className="w-full px-3.5 py-1.5 rounded-xl border border-border-subtle bg-white text-xs text-primary focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-primary mb-1">Max File Size (MB)</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.maxFileSizeMB}
                        onChange={(e) => setFormData({ ...formData, maxFileSizeMB: Number(e.target.value) })}
                        className="w-full px-3.5 py-1.5 rounded-xl border border-border-subtle bg-white text-xs text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Supplementary Attachments */}
              <div className="space-y-3">
                <label className="block font-semibold text-primary">
                  Supplementary Learning Resources / Reference Files
                </label>

                {formData.attachments.length > 0 && (
                  <div className="space-y-2">
                    {formData.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-surface-subtle border border-border-subtle"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <Paperclip size={13} className="text-secondary shrink-0" />
                          <span className="font-semibold text-primary truncate">{att.name}</span>
                          <span className="text-[10px] text-tertiary truncate max-w-[200px]">{att.url}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={attName}
                    onChange={(e) => setAttName(e.target.value)}
                    placeholder="Resource name (e.g. Starter Code Zip)"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs"
                  />
                  <input
                    type="text"
                    value={attUrl}
                    onChange={(e) => setAttUrl(e.target.value)}
                    placeholder="URL (https://...)"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-3 py-1.5 rounded-xl bg-surface-subtle border border-border-subtle text-primary font-semibold hover:bg-border-subtle cursor-pointer shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border-subtle bg-surface-subtle flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border-subtle bg-white text-xs font-semibold text-secondary hover:text-primary transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || publishing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-border-subtle text-primary text-xs font-semibold hover:bg-surface-subtle transition cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={saving || publishing}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cobalt text-white text-xs font-bold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>{publishing ? 'Publishing...' : 'Publish Assignment'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
