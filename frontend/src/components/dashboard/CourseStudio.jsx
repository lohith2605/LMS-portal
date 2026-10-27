import React, { useState, useEffect } from 'react';
import { instructorCourseService } from '../../services/api';

const CATEGORIES = ['Development', 'Design', 'Data', 'Business', 'Other'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

const SAMPLE_THUMBNAILS = [
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
];

export default function CourseStudio({ courseId, onClose, onSaved }) {
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(Boolean(courseId));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    description: '',
    category: 'Development',
    level: 'Beginner',
    language: 'English',
    thumbnail: SAMPLE_THUMBNAILS[0],
    learningObjectives: [''],
    prerequisites: '',
    intendedAudience: '',
    estimatedDuration: '4 weeks',
    sections: [],
    status: 'draft',
    rejectionReason: '',
  });

  // Current editing state for section / lesson modals
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState({ title: '', description: '' });

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [targetSectionIdx, setTargetSectionIdx] = useState(null);
  const [editingLessonIdx, setEditingLessonIdx] = useState(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    contentType: 'video',
    videoUrl: '',
    textContent: '',
    attachmentUrl: '',
    duration: '10 mins',
    isPublished: true,
  });

  // Load existing course if editing
  useEffect(() => {
    if (!courseId) return;

    let isMounted = true;
    setLoading(true);

    instructorCourseService
      .getCourseById(courseId)
      .then((data) => {
        if (!isMounted) return;
        const c = data.course;
        setFormData({
          _id: c._id,
          title: c.title || '',
          summary: c.summary || '',
          description: c.description || '',
          category: c.category || 'Development',
          level: c.level || 'Beginner',
          language: c.language || 'English',
          thumbnail: c.thumbnail || SAMPLE_THUMBNAILS[0],
          learningObjectives:
            c.learningObjectives && c.learningObjectives.length > 0
              ? c.learningObjectives
              : [''],
          prerequisites: c.prerequisites || '',
          intendedAudience: c.intendedAudience || '',
          estimatedDuration: c.estimatedDuration || '4 weeks',
          sections: c.sections || [],
          status: c.status || 'draft',
          rejectionReason: c.rejectionReason || '',
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.normalizedMessage || 'Failed to load course details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // Handle Basic info input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Learning Objectives array helpers
  const handleObjectiveChange = (index, val) => {
    const updated = [...formData.learningObjectives];
    updated[index] = val;
    setFormData((prev) => ({ ...prev, learningObjectives: updated }));
  };

  const addObjective = () => {
    setFormData((prev) => ({
      ...prev,
      learningObjectives: [...prev.learningObjectives, ''],
    }));
  };

  const removeObjective = (index) => {
    const updated = formData.learningObjectives.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      learningObjectives: updated.length > 0 ? updated : [''],
    }));
  };

  // Section Management
  const openAddSection = () => {
    setEditingSectionIndex(null);
    setSectionForm({ title: '', description: '' });
    setSectionModalOpen(true);
  };

  const openEditSection = (index) => {
    setEditingSectionIndex(index);
    const sec = formData.sections[index];
    setSectionForm({ title: sec.title, description: sec.description || '' });
    setSectionModalOpen(true);
  };

  const saveSection = () => {
    if (!sectionForm.title.trim()) return;

    if (editingSectionIndex !== null) {
      // Edit existing
      const updated = [...formData.sections];
      updated[editingSectionIndex] = {
        ...updated[editingSectionIndex],
        title: sectionForm.title.trim(),
        description: sectionForm.description.trim(),
      };
      setFormData((prev) => ({ ...prev, sections: updated }));
    } else {
      // Add new
      const newSec = {
        _id: `temp_sec_${Date.now()}`,
        title: sectionForm.title.trim(),
        description: sectionForm.description.trim(),
        sortOrder: formData.sections.length,
        lessons: [],
      };
      setFormData((prev) => ({ ...prev, sections: [...prev.sections, newSec] }));
    }
    setSectionModalOpen(false);
  };

  const deleteSection = (index) => {
    if (!window.confirm('Are you sure you want to delete this section and all its lessons?')) return;
    const updated = formData.sections.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, sections: updated }));
  };

  // Lesson Management
  const openAddLesson = (sectionIndex) => {
    setTargetSectionIdx(sectionIndex);
    setEditingLessonIdx(null);
    setLessonForm({
      title: '',
      description: '',
      contentType: 'video',
      videoUrl: '',
      textContent: '',
      attachmentUrl: '',
      duration: '10 mins',
      isPublished: true,
    });
    setLessonModalOpen(true);
  };

  const openEditLesson = (sectionIndex, lessonIndex) => {
    setTargetSectionIdx(sectionIndex);
    setEditingLessonIdx(lessonIndex);
    const les = formData.sections[sectionIndex].lessons[lessonIndex];
    setLessonForm({
      title: les.title,
      description: les.description || '',
      contentType: les.contentType || 'video',
      videoUrl: les.videoUrl || '',
      textContent: les.textContent || '',
      attachmentUrl: les.attachmentUrl || '',
      duration: les.duration || '10 mins',
      isPublished: les.isPublished !== undefined ? les.isPublished : true,
    });
    setLessonModalOpen(true);
  };

  const saveLesson = () => {
    if (!lessonForm.title.trim()) return;

    const updatedSections = [...formData.sections];
    const targetSection = { ...updatedSections[targetSectionIdx] };
    const updatedLessons = [...targetSection.lessons];

    if (editingLessonIdx !== null) {
      updatedLessons[editingLessonIdx] = {
        ...updatedLessons[editingLessonIdx],
        ...lessonForm,
        title: lessonForm.title.trim(),
        description: lessonForm.description.trim(),
      };
    } else {
      updatedLessons.push({
        _id: `temp_les_${Date.now()}`,
        ...lessonForm,
        title: lessonForm.title.trim(),
        description: lessonForm.description.trim(),
        sortOrder: updatedLessons.length,
      });
    }

    targetSection.lessons = updatedLessons;
    updatedSections[targetSectionIdx] = targetSection;
    setFormData((prev) => ({ ...prev, sections: updatedSections }));
    setLessonModalOpen(false);
  };

  const deleteLesson = (sectionIndex, lessonIndex) => {
    const updatedSections = [...formData.sections];
    const targetSection = { ...updatedSections[sectionIndex] };
    targetSection.lessons = targetSection.lessons.filter((_, i) => i !== lessonIndex);
    updatedSections[sectionIndex] = targetSection;
    setFormData((prev) => ({ ...prev, sections: updatedSections }));
  };

  // Save Course as Draft
  const handleSaveDraft = async () => {
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      const payload = {
        title: formData.title,
        summary: formData.summary,
        description: formData.description,
        category: formData.category,
        level: formData.level,
        language: formData.language,
        thumbnail: formData.thumbnail,
        learningObjectives: formData.learningObjectives.filter((o) => o.trim()),
        prerequisites: formData.prerequisites,
        intendedAudience: formData.intendedAudience,
        estimatedDuration: formData.estimatedDuration,
      };

      let savedCourse;
      if (formData._id) {
        const res = await instructorCourseService.updateCourse(formData._id, payload);
        savedCourse = res.course;
      } else {
        const res = await instructorCourseService.createCourse(payload);
        savedCourse = res.course;
        setFormData((prev) => ({ ...prev, _id: savedCourse._id }));
      }

      // Sync sections & lessons if any were added
      if (formData.sections && formData.sections.length > 0) {
        // Sync each section
        for (const sec of formData.sections) {
          if (sec._id.toString().startsWith('temp_')) {
            const secRes = await instructorCourseService.addSection(savedCourse._id, {
              title: sec.title,
              description: sec.description,
            });
            const createdSec = secRes.section;

            // Sync lessons under this section
            if (sec.lessons && sec.lessons.length > 0) {
              for (const les of sec.lessons) {
                await instructorCourseService.addLesson(savedCourse._id, createdSec._id, les);
              }
            }
          }
        }
      }

      setSuccessMessage('Course draft saved successfully.');
      if (onSaved) onSaved(savedCourse);
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to save course draft.');
    } finally {
      setSaving(false);
    }
  };

  // Submit for Review
  const handleSubmitForReview = async () => {
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Course title is required before submission.');
      setActiveStep(1);
      return;
    }
    if (!formData.summary.trim()) {
      setError('Course summary is required before submission.');
      setActiveStep(1);
      return;
    }
    if (!formData.description.trim()) {
      setError('Course description is required before submission.');
      setActiveStep(1);
      return;
    }
    if (formData.sections.length === 0) {
      setError('Course must contain at least one section before submission.');
      setActiveStep(3);
      return;
    }
    const totalLessons = formData.sections.reduce(
      (sum, s) => sum + (s.lessons ? s.lessons.length : 0),
      0
    );
    if (totalLessons === 0) {
      setError('Course must contain at least one lesson before submission.');
      setActiveStep(3);
      return;
    }

    setSubmitting(true);
    try {
      // First save draft state
      await handleSaveDraft();

      const courseIdToSubmit = formData._id;
      if (!courseIdToSubmit) {
        throw new Error('Course must be created before review submission.');
      }

      const res = await instructorCourseService.submitForReview(courseIdToSubmit);
      setFormData((prev) => ({ ...prev, status: 'pending_review' }));
      setSuccessMessage(res.message || 'Course submitted for review successfully!');
      if (onSaved) onSaved(res.course);
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to submit course for review.');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Learning Info' },
    { num: 3, label: 'Curriculum' },
    { num: 4, label: 'Review & Publish' },
  ];

  if (loading) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-8 text-center animate-pulse">
        <div className="h-6 bg-[#F2F2F0] rounded w-1/4 mx-auto mb-4" />
        <div className="h-4 bg-[#F2F2F0] rounded w-1/2 mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#E4E4E1] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#FAFAFA]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-[#171717]">
              {formData._id ? 'Edit Course Studio' : 'Create New Course Studio'}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                formData.status === 'published'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : formData.status === 'pending_review'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : formData.status === 'rejected'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-[#F2F2F0] text-[#686868] border border-[#E4E4E1]'
              }`}
            >
              {formData.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-[#686868] mt-1">
            Author and publish structured curriculum for the LearnSpace student community.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || submitting}
            className="px-4 py-2 text-xs font-medium text-[#171717] bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg hover:bg-[#F2F2F0] transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#686868] hover:text-[#171717] rounded-lg hover:bg-[#F2F2F0] transition"
            aria-label="Close Studio"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Rejection Warning Banner if applicable */}
      {formData.status === 'rejected' && formData.rejectionReason && (
        <div className="mx-6 mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-rose-900">Course Revision Requested by Administrator</h4>
              <p className="text-xs text-rose-700 mt-1">{formData.rejectionReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 font-bold ml-2">
            &times;
          </button>
        </div>
      )}
      {successMessage && (
        <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center justify-between">
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Step Stepper Navigation */}
      <div className="px-6 pt-5 pb-3 border-b border-[#E4E4E1]">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <button
                type="button"
                onClick={() => setActiveStep(s.num)}
                className={`flex items-center gap-2.5 text-xs font-medium pb-2 border-b-2 transition ${
                  activeStep === s.num
                    ? 'border-[#637D91] text-[#171717] font-semibold'
                    : 'border-transparent text-[#686868] hover:text-[#171717]'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    activeStep === s.num
                      ? 'bg-[#637D91] text-[#FFFFFF]'
                      : 'bg-[#F2F2F0] text-[#686868]'
                  }`}
                >
                  {s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-[#E4E4E1] mx-2 -mt-2" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {/* STEP 1: Basic Information */}
        {activeStep === 1 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div>
              <label htmlFor="course-title" className="block text-xs font-semibold text-[#171717] mb-1.5">
                Course Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="course-title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Design Systems from Figma to Production Code"
                className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] text-[#171717]"
              />
            </div>

            <div>
              <label htmlFor="course-summary" className="block text-xs font-semibold text-[#171717] mb-1.5">
                Short Summary <span className="text-rose-500">*</span>
              </label>
              <input
                id="course-summary"
                name="summary"
                type="text"
                value={formData.summary}
                onChange={handleChange}
                maxLength={300}
                placeholder="A concise 1-2 sentence overview for the course card catalog."
                className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] text-[#171717]"
              />
              <span className="text-[10px] text-[#686868] mt-1 block">
                {formData.summary.length}/300 characters
              </span>
            </div>

            <div>
              <label htmlFor="course-description" className="block text-xs font-semibold text-[#171717] mb-1.5">
                Full Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="course-description"
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                placeholder="Detailed curriculum overview, methodologies, what students will construct, and practical applications."
                className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] text-[#171717]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="course-category" className="block text-xs font-semibold text-[#171717] mb-1.5">Category</label>
                <select
                  id="course-category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] text-[#171717]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="course-level" className="block text-xs font-semibold text-[#171717] mb-1.5">Difficulty Level</label>
                <select
                  id="course-level"
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] text-[#171717]"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="course-language" className="block text-xs font-semibold text-[#171717] mb-1.5">Language</label>
                <input
                  id="course-language"
                  name="language"
                  type="text"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] text-[#171717]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="course-thumbnail" className="block text-xs font-semibold text-[#171717] mb-1.5">
                Cover Thumbnail Image
              </label>
              <input
                id="course-thumbnail"
                name="thumbnail"
                type="url"
                value={formData.thumbnail}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] text-[#171717] mb-3"
              />

              <div className="flex items-center gap-3">
                {SAMPLE_THUMBNAILS.map((thumbUrl, idx) => (
                  <button
                    key={thumbUrl}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, thumbnail: thumbUrl }))}
                    className={`relative w-20 h-12 rounded-lg overflow-hidden border-2 transition ${
                      formData.thumbnail === thumbUrl
                        ? 'border-[#637D91] ring-2 ring-[#637D91]/20'
                        : 'border-[#E4E4E1] hover:border-[#686868]'
                    }`}
                  >
                    <img src={thumbUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Learning Information */}
        {activeStep === 2 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5">
                Learning Objectives
              </label>
              <p className="text-xs text-[#686868] mb-3">
                Key competencies and practical capabilities students will achieve upon completion.
              </p>

              <div className="space-y-2">
                {formData.learningObjectives.map((obj, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#686868] w-5 text-center">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={obj}
                      onChange={(e) => handleObjectiveChange(idx, e.target.value)}
                      placeholder="e.g. Construct resilient token architectures from Figma to code"
                      className="flex-1 px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] text-[#171717]"
                    />
                    <button
                      type="button"
                      onClick={() => removeObjective(idx)}
                      className="p-2 text-[#686868] hover:text-rose-600 rounded-lg transition"
                      title="Remove objective"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addObjective}
                className="mt-3 text-xs font-medium text-[#637D91] hover:text-[#171717] flex items-center gap-1 transition"
              >
                + Add Learning Objective
              </button>
            </div>

            <div>
              <label htmlFor="course-prerequisites" className="block text-xs font-semibold text-[#171717] mb-1.5">
                Prerequisites
              </label>
              <textarea
                id="course-prerequisites"
                name="prerequisites"
                rows={3}
                value={formData.prerequisites}
                onChange={handleChange}
                placeholder="e.g. Basic understanding of JavaScript and modern component-based frontend libraries."
                className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] text-[#171717]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="course-audience" className="block text-xs font-semibold text-[#171717] mb-1.5">
                  Intended Audience
                </label>
                <input
                  id="course-audience"
                  name="intendedAudience"
                  type="text"
                  value={formData.intendedAudience}
                  onChange={handleChange}
                  placeholder="e.g. Frontend developers, design technologists"
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] text-[#171717]"
                />
              </div>

              <div>
                <label htmlFor="course-duration" className="block text-xs font-semibold text-[#171717] mb-1.5">
                  Estimated Duration
                </label>
                <input
                  id="course-duration"
                  name="estimatedDuration"
                  type="text"
                  value={formData.estimatedDuration}
                  onChange={handleChange}
                  placeholder="e.g. 6 weeks"
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] text-[#171717]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Curriculum Builder */}
        {activeStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#171717]">Course Curriculum</h3>
                <p className="text-xs text-[#686868] mt-0.5">
                  Organize modules into sequential sections and lessons.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddSection}
                className="px-3.5 py-1.5 text-xs font-medium text-[#FFFFFF] bg-[#637D91] hover:bg-[#526879] rounded-lg transition"
              >
                + Add Section
              </button>
            </div>

            {formData.sections.length === 0 ? (
              <div className="border-2 border-dashed border-[#E4E4E1] rounded-2xl p-8 text-center bg-[#FAFAFA]">
                <p className="text-sm font-medium text-[#171717]">No sections created yet</p>
                <p className="text-xs text-[#686868] mt-1 mb-4">
                  Divide your course into structured sections like "Module 1: Foundations".
                </p>
                <button
                  type="button"
                  onClick={openAddSection}
                  className="px-4 py-2 text-xs font-medium text-[#FFFFFF] bg-[#637D91] hover:bg-[#526879] rounded-lg transition"
                >
                  Create First Section
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.sections.map((section, sIdx) => (
                  <div
                    key={section._id || sIdx}
                    className="border border-[#E4E4E1] rounded-xl overflow-hidden bg-[#FFFFFF]"
                  >
                    {/* Section Header */}
                    <div className="p-4 bg-[#FAFAFA] border-b border-[#E4E4E1] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#637D91]/10 text-[#637D91] text-xs font-semibold flex items-center justify-center">
                          {sIdx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-[#171717]">{section.title}</h4>
                          {section.description && (
                            <p className="text-xs text-[#686868] mt-0.5">{section.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openAddLesson(sIdx)}
                          className="px-2.5 py-1 text-xs font-medium text-[#637D91] hover:bg-[#F2F2F0] rounded transition"
                        >
                          + Lesson
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditSection(sIdx)}
                          className="p-1 text-[#686868] hover:text-[#171717] rounded"
                          title="Edit section"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSection(sIdx)}
                          className="p-1 text-[#686868] hover:text-rose-600 rounded"
                          title="Delete section"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Lessons list */}
                    <div className="divide-y divide-[#E4E4E1]">
                      {(!section.lessons || section.lessons.length === 0) ? (
                        <div className="p-4 text-center text-xs text-[#686868]">
                          No lessons added to this section yet.{' '}
                          <button
                            type="button"
                            onClick={() => openAddLesson(sIdx)}
                            className="text-[#637D91] font-medium underline"
                          >
                            Add one now
                          </button>
                        </div>
                      ) : (
                        section.lessons.map((lesson, lIdx) => (
                          <div
                            key={lesson._id || lIdx}
                            className="p-3.5 pl-6 flex items-center justify-between hover:bg-[#FAFAFA] transition"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-[#686868] font-mono">
                                {sIdx + 1}.{lIdx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-[#171717]">
                                    {lesson.title}
                                  </span>
                                  <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-[#F2F2F0] text-[#686868]">
                                    {lesson.contentType}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[#686868]">
                                  Duration: {lesson.duration}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditLesson(sIdx, lIdx)}
                                className="p-1 text-[#686868] hover:text-[#171717] rounded"
                                title="Edit lesson"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteLesson(sIdx, lIdx)}
                                className="p-1 text-[#686868] hover:text-rose-600 rounded"
                                title="Delete lesson"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Review & Publish */}
        {activeStep === 4 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div>
              <h3 className="text-sm font-semibold text-[#171717]">Course Summary & Readiness Check</h3>
              <p className="text-xs text-[#686868] mt-0.5">
                Review how your course appears to learners and submit it for administrative review.
              </p>
            </div>

            {/* Preview Card */}
            <div className="border border-[#E4E4E1] rounded-2xl overflow-hidden bg-[#FFFFFF] shadow-sm">
              <div className="h-44 relative overflow-hidden bg-[#F2F2F0]">
                {formData.thumbnail && (
                  <img src={formData.thumbnail} alt={formData.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className="px-2.5 py-1 bg-[#171717]/80 text-[#FFFFFF] text-xs font-medium rounded-full backdrop-blur-sm">
                    {formData.category}
                  </span>
                  <span className="px-2.5 py-1 bg-[#637D91]/90 text-[#FFFFFF] text-xs font-medium rounded-full backdrop-blur-sm">
                    {formData.level}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <h4 className="text-lg font-semibold text-[#171717]">{formData.title || 'Untitled Course'}</h4>
                <p className="text-xs text-[#686868] mt-1.5 line-clamp-2">
                  {formData.summary || 'No summary provided.'}
                </p>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#E4E4E1] text-xs text-[#686868]">
                  <span>Modules: {formData.sections.length}</span>
                  <span>
                    Lessons:{' '}
                    {formData.sections.reduce(
                      (acc, s) => acc + (s.lessons ? s.lessons.length : 0),
                      0
                    )}
                  </span>
                  <span>Duration: {formData.estimatedDuration}</span>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-[#FAFAFA] border border-[#E4E4E1] rounded-xl p-4 space-y-2">
              <h5 className="text-xs font-semibold text-[#171717] uppercase tracking-wider mb-2">
                Publication Requirements Checklist
              </h5>
              <div className="flex items-center gap-2 text-xs">
                {formData.title.trim() ? (
                  <span className="text-emerald-600 font-bold">✓</span>
                ) : (
                  <span className="text-rose-500 font-bold">✕</span>
                )}
                <span className={formData.title.trim() ? 'text-[#171717]' : 'text-rose-600'}>
                  Course title defined
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {formData.summary.trim() ? (
                  <span className="text-emerald-600 font-bold">✓</span>
                ) : (
                  <span className="text-rose-500 font-bold">✕</span>
                )}
                <span className={formData.summary.trim() ? 'text-[#171717]' : 'text-rose-600'}>
                  Course summary defined
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {formData.sections.length > 0 ? (
                  <span className="text-emerald-600 font-bold">✓</span>
                ) : (
                  <span className="text-rose-500 font-bold">✕</span>
                )}
                <span className={formData.sections.length > 0 ? 'text-[#171717]' : 'text-rose-600'}>
                  At least 1 curriculum section added
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {formData.sections.some((s) => s.lessons && s.lessons.length > 0) ? (
                  <span className="text-emerald-600 font-bold">✓</span>
                ) : (
                  <span className="text-rose-500 font-bold">✕</span>
                )}
                <span
                  className={
                    formData.sections.some((s) => s.lessons && s.lessons.length > 0)
                      ? 'text-[#171717]'
                      : 'text-rose-600'
                  }
                >
                  At least 1 lesson created
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving || submitting}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-medium text-[#171717] bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg hover:bg-[#F2F2F0] transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Keep as Draft'}
              </button>
              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={saving || submitting || formData.status === 'pending_review'}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#637D91] hover:bg-[#526879] rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {submitting
                  ? 'Submitting...'
                  : formData.status === 'pending_review'
                  ? 'Awaiting Administrative Review'
                  : 'Submit for Review'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Footer Controls */}
      <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E4E4E1] flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
          disabled={activeStep === 1}
          className="px-4 py-2 text-xs font-medium text-[#686868] hover:text-[#171717] disabled:opacity-30 transition"
        >
          &larr; Previous Step
        </button>

        {activeStep < 4 ? (
          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.min(4, prev + 1))}
            className="px-5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#637D91] hover:bg-[#526879] rounded-lg transition"
          >
            Continue to {steps[activeStep].label} &rarr;
          </button>
        ) : (
          <span className="text-xs text-[#686868]">Step 4 of 4</span>
        )}
      </div>

      {/* SECTION MODAL */}
      {sectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[#171717] mb-4">
              {editingSectionIndex !== null ? 'Edit Section' : 'Add New Section'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Section Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={sectionForm.title}
                  onChange={(e) => setSectionForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Module 1: Architecture Foundations"
                  className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={sectionForm.description}
                  onChange={(e) => setSectionForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief summary of topics covered in this module."
                  className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setSectionModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#686868] hover:text-[#171717]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSection}
                disabled={!sectionForm.title.trim()}
                className="px-4 py-2 text-xs font-medium text-[#FFFFFF] bg-[#637D91] hover:bg-[#526879] rounded-lg transition disabled:opacity-50"
              >
                Save Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LESSON MODAL */}
      {lessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl w-full max-w-lg p-6 shadow-xl my-8">
            <h3 className="text-base font-semibold text-[#171717] mb-4">
              {editingLessonIdx !== null ? 'Edit Lesson' : 'Add New Lesson'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Lesson Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Component Trees & Spatial Grids"
                  className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Content Type</label>
                  <select
                    value={lessonForm.contentType}
                    onChange={(e) => setLessonForm((p) => ({ ...p, contentType: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91]"
                  >
                    <option value="video">Video Lecture</option>
                    <option value="text">Rich Reading / Markdown</option>
                    <option value="document">Document / Attachment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Estimated Duration</label>
                  <input
                    type="text"
                    value={lessonForm.duration}
                    onChange={(e) => setLessonForm((p) => ({ ...p, duration: e.target.value }))}
                    placeholder="e.g. 15 mins"
                    className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91]"
                  />
                </div>
              </div>

              {lessonForm.contentType === 'video' && (
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Video URL (YouTube, Vimeo, or direct MP4 link)
                  </label>
                  <input
                    type="url"
                    value={lessonForm.videoUrl}
                    onChange={(e) => setLessonForm((p) => ({ ...p, videoUrl: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Lesson Text Content / Notes (Markdown supported)
                </label>
                <textarea
                  rows={4}
                  value={lessonForm.textContent}
                  onChange={(e) => setLessonForm((p) => ({ ...p, textContent: e.target.value }))}
                  placeholder="# Lesson Overview&#10;&#10;Key concepts covered in this lesson..."
                  className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Attachment / Reference Link (Optional)
                </label>
                <input
                  type="url"
                  value={lessonForm.attachmentUrl}
                  onChange={(e) => setLessonForm((p) => ({ ...p, attachmentUrl: e.target.value }))}
                  placeholder="https://github.com/learnspace/example-code"
                  className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E4E4E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#637D91]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setLessonModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#686868] hover:text-[#171717]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLesson}
                disabled={!lessonForm.title.trim()}
                className="px-4 py-2 text-xs font-medium text-[#FFFFFF] bg-[#637D91] hover:bg-[#526879] rounded-lg transition disabled:opacity-50"
              >
                Save Lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
