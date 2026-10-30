import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
  Clock,
  Award,
  Layers,
  AlertCircle,
  Save,
  Send,
} from 'lucide-react';
import { quizService } from '../../services/api';

export default function QuizStudioModal({
  courseId,
  quizId = null,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(Boolean(quizId));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: 'Select the best answer for each question. You may review your answers before submitting.',
    durationMinutes: 15,
    passingPercentage: 70,
    maxAttempts: 3,
    isRequiredForCompletion: true,
    questions: [],
    status: 'draft',
  });

  // Current question builder state
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([
    { id: 'opt_1', text: '' },
    { id: 'opt_2', text: '' },
  ]);
  const [correctOptionId, setCorrectOptionId] = useState('opt_1');
  const [points, setPoints] = useState(1);
  const [explanation, setExplanation] = useState('');
  const [editingQuestionIdx, setEditingQuestionIdx] = useState(null);

  // Load existing quiz if editing
  useEffect(() => {
    if (!quizId) return;

    let isMounted = true;
    setLoading(true);

    quizService
      .getInstructorQuizById(quizId)
      .then((data) => {
        if (!isMounted) return;
        const q = data.quiz;
        setFormData({
          title: q.title || '',
          description: q.description || '',
          instructions: q.instructions || '',
          durationMinutes: q.durationMinutes || 0,
          passingPercentage: q.passingPercentage || 70,
          maxAttempts: q.maxAttempts || 3,
          isRequiredForCompletion: q.isRequiredForCompletion !== false,
          questions: q.questions || [],
          status: q.status || 'draft',
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.normalizedMessage || 'Failed to load quiz details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [quizId]);

  const handleAddOption = () => {
    if (options.length >= 6) return;
    const newId = `opt_${Date.now()}`;
    setOptions([...options, { id: newId, text: '' }]);
  };

  const handleRemoveOption = (indexToRemove) => {
    if (options.length <= 2) return;
    const filtered = options.filter((_, idx) => idx !== indexToRemove);
    setOptions(filtered);
    if (!filtered.some((o) => o.id === correctOptionId)) {
      setCorrectOptionId(filtered[0]?.id || '');
    }
  };

  const handleOptionTextChange = (idx, text) => {
    const updated = [...options];
    updated[idx].text = text;
    setOptions(updated);
  };

  const handleSaveQuestion = () => {
    if (!questionText.trim()) {
      alert('Please enter a question description or prompt.');
      return;
    }

    const validOptions = options.filter((o) => o.text.trim().length > 0);
    if (validOptions.length < 2) {
      alert('Each question must have at least 2 non-empty answer options.');
      return;
    }

    if (!correctOptionId || !validOptions.some((o) => o.id === correctOptionId)) {
      alert('Please select which option is the correct answer.');
      return;
    }

    const questionObj = {
      questionText: questionText.trim(),
      options: validOptions,
      correctOptionId,
      points: Number(points) > 0 ? Number(points) : 1,
      explanation: explanation.trim(),
      order: formData.questions.length,
    };

    if (editingQuestionIdx !== null) {
      const updatedQuestions = [...formData.questions];
      updatedQuestions[editingQuestionIdx] = questionObj;
      setFormData({ ...formData, questions: updatedQuestions });
      setEditingQuestionIdx(null);
    } else {
      setFormData({
        ...formData,
        questions: [...formData.questions, questionObj],
      });
    }

    // Reset question builder
    setQuestionText('');
    setOptions([
      { id: `opt_${Date.now()}_1`, text: '' },
      { id: `opt_${Date.now()}_2`, text: '' },
    ]);
    setCorrectOptionId('');
    setPoints(1);
    setExplanation('');
  };

  const handleEditQuestion = (idx) => {
    const q = formData.questions[idx];
    setQuestionText(q.questionText);
    setOptions(q.options.map((o) => ({ ...o })));
    setCorrectOptionId(q.correctOptionId);
    setPoints(q.points || 1);
    setExplanation(q.explanation || '');
    setEditingQuestionIdx(idx);
  };

  const handleDeleteQuestion = (idx) => {
    const filtered = formData.questions.filter((_, i) => i !== idx);
    setFormData({ ...formData, questions: filtered });
    if (editingQuestionIdx === idx) {
      setEditingQuestionIdx(null);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      setError('Quiz title is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      let res;
      if (quizId) {
        res = await quizService.updateQuiz(quizId, formData);
      } else {
        res = await quizService.createQuiz(courseId, formData);
      }
      setSuccessMessage('Draft saved successfully.');
      if (onSaved) onSaved(res.quiz);
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to save quiz draft.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!formData.title.trim()) {
      setError('Quiz title is required.');
      return;
    }
    if (formData.questions.length === 0) {
      setError('A published quiz must contain at least 1 question.');
      return;
    }

    try {
      setPublishing(true);
      setError(null);
      let savedQuizId = quizId;
      if (!savedQuizId) {
        const createRes = await quizService.createQuiz(courseId, formData);
        savedQuizId = createRes.quiz._id;
      } else {
        await quizService.updateQuiz(savedQuizId, formData);
      }

      const pubRes = await quizService.publishQuiz(savedQuizId);
      setSuccessMessage('Quiz published successfully! Learners can now attempt this assessment.');
      if (onSaved) onSaved(pubRes.quiz);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to publish quiz.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#171717]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E4E1] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#637D91]/10 text-[#637D91] flex items-center justify-center">
              <Award size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#171717]">
                {quizId ? 'Edit Assessment Quiz' : 'Create Assessment Quiz'}
              </h2>
              <p className="text-[11px] text-[#686868]">
                Configure questions, automated grading keys, and passing thresholds
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#686868] hover:text-[#171717] rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
              <CheckCircle size={15} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Basic Settings */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-[#171717] uppercase tracking-wider pb-1 border-b border-[#E4E4E1]">
              1. Assessment Configuration
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-[#171717] mb-1">
                Quiz Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Module 1: Design Systems Conceptual Evaluation"
                className="w-full px-3 py-2 bg-[#F2F2F0]/50 border border-[#E4E4E1] rounded-xl text-xs focus:outline-none focus:border-[#171717]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#171717] mb-1 flex items-center gap-1">
                  <Clock size={12} className="text-[#637D91]" />
                  Time Limit (mins)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-[#F2F2F0]/50 border border-[#E4E4E1] rounded-xl text-xs focus:outline-none focus:border-[#171717]"
                  title="0 for untimed"
                />
                <span className="text-[10px] text-[#686868]">0 for untimed</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#171717] mb-1 flex items-center gap-1">
                  <Award size={12} className="text-[#637D91]" />
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.passingPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, passingPercentage: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-[#F2F2F0]/50 border border-[#E4E4E1] rounded-xl text-xs focus:outline-none focus:border-[#171717]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#171717] mb-1">
                  Max Attempts
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={formData.maxAttempts}
                  onChange={(e) =>
                    setFormData({ ...formData, maxAttempts: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-[#F2F2F0]/50 border border-[#E4E4E1] rounded-xl text-xs focus:outline-none focus:border-[#171717]"
                  title="0 for unlimited"
                />
                <span className="text-[10px] text-[#686868]">0 for unlimited</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="reqCompletion"
                checked={formData.isRequiredForCompletion}
                onChange={(e) =>
                  setFormData({ ...formData, isRequiredForCompletion: e.target.checked })
                }
                className="w-4 h-4 rounded text-[#171717] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="reqCompletion" className="text-xs text-[#171717] cursor-pointer">
                Required for Course Completion and Certificate Issuance
              </label>
            </div>
          </div>

          {/* Section 2: Question Authoring */}
          <div className="space-y-4 pt-2">
            <h3 className="text-[11px] font-bold text-[#171717] uppercase tracking-wider pb-1 border-b border-[#E4E4E1]">
              2. Question Builder
            </h3>

            <div className="bg-[#F2F2F0]/40 border border-[#E4E4E1] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#637D91]">
                  {editingQuestionIdx !== null
                    ? `Editing Question #${editingQuestionIdx + 1}`
                    : 'Add New Question'}
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-[#686868]">Points:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-14 px-2 py-1 bg-white border border-[#E4E4E1] rounded-lg text-xs text-center"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter multiple choice question prompt..."
                  className="w-full px-3 py-2 bg-white border border-[#E4E4E1] rounded-xl text-xs focus:outline-none focus:border-[#171717]"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#686868]">
                    Options (Select radio button next to the correct answer):
                  </span>
                  {options.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-[11px] text-[#637D91] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Plus size={12} /> Add Option
                    </button>
                  )}
                </div>

                {options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={correctOptionId === opt.id}
                      onChange={() => setCorrectOptionId(opt.id)}
                      className="cursor-pointer text-[#637D91]"
                      title="Mark as correct answer"
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3 py-1.5 bg-white border border-[#E4E4E1] rounded-lg text-xs focus:outline-none focus:border-[#171717]"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-[#686868] hover:text-red-600 p-1 cursor-pointer"
                        title="Remove option"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Explanation */}
              <div>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Optional answer explanation shown after submission..."
                  className="w-full px-3 py-1.5 bg-white border border-[#E4E4E1] rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  className="px-4 py-2 bg-cobalt text-white rounded-xl text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-cobalt/20"
                >
                  <Plus size={14} />
                  <span>{editingQuestionIdx !== null ? 'Save Question Edit' : 'Add Question'}</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#171717]">
                <span>Quiz Questions ({formData.questions.length})</span>
                <span>
                  Total Points:{' '}
                  {formData.questions.reduce((sum, q) => sum + (q.points || 1), 0)}
                </span>
              </div>

              {formData.questions.length === 0 ? (
                <div className="p-4 border border-dashed border-[#E4E4E1] rounded-xl text-center text-[11px] text-[#686868]">
                  No questions created yet. Use the question builder above to add questions.
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-[#E4E4E1] rounded-xl flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-[#637D91] shrink-0">#{idx + 1}</span>
                        <div>
                          <p className="font-medium text-[#171717]">{q.questionText}</p>
                          <p className="text-[10px] text-[#686868] mt-0.5">
                            {q.options?.length || 0} options • {q.points || 1} points
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditQuestion(idx)}
                          className="px-2 py-1 text-[11px] text-[#637D91] hover:bg-[#F2F2F0] rounded-lg cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(idx)}
                          className="p-1 text-[#686868] hover:text-red-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E4E4E1] bg-[#F2F2F0]/30 flex items-center justify-between">
          <span className="text-[11px] text-[#686868]">
            Status:{' '}
            <span
              className={`font-semibold capitalize ${
                formData.status === 'published' ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {formData.status}
            </span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || publishing}
              className="px-4 py-2 rounded-xl border border-[#E4E4E1] bg-white text-xs font-semibold text-[#171717] hover:bg-[#F2F2F0] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={saving || publishing || formData.questions.length === 0}
              className="px-4 py-2 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm shadow-cobalt/20"
            >
              <Send size={14} />
              <span>{publishing ? 'Publishing...' : 'Publish Quiz'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
