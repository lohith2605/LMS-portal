import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  PlayCircle,
  FileText,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  BookOpen,
  Award,
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  HelpCircle,
  Printer,
  FileCheck,
  MessageSquare,
} from 'lucide-react';
import {
  courseService,
  quizService,
  certificateService,
  assignmentService,
} from '../services/api';
import AssignmentSubmissionModal from '../components/dashboard/AssignmentSubmissionModal';
import { useAuth } from '../context/useAuth';
import CourseDiscussionForum from '../components/dashboard/CourseDiscussionForum';

export default function CoursePlayerPage() {
  const { idOrSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Navigation & Active View: 'lesson' | 'quiz' | 'completion'
  const [activeView, setActiveView] = useState('lesson');

  // Course & Curriculum State
  const [course, setCourse] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Phase 5: Assessments & Quizzes State
  const [courseQuizzes, setCourseQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizStage, setQuizStage] = useState('intro'); // 'intro' | 'taking' | 'result'
  const [quizDetailsLoading, setQuizDetailsLoading] = useState(false);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [currentAttempt, setCurrentAttempt] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [quizError, setQuizError] = useState(null);

  // Phase 5: Course Completion & Certificate State
  const [completionData, setCompletionData] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionError, setCompletionError] = useState(null);
  const [claimingCert, setClaimingCert] = useState(false);
  const [certFeedback, setCertFeedback] = useState(null);

  // Phase 6: Course Assignments State
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [selectedPlayerAssignment, setSelectedPlayerAssignment] = useState(null);
  const [playerAssignmentModalOpen, setPlayerAssignmentModalOpen] = useState(false);

  // Flattened list of lessons for seamless next/prev navigation
  const flatLessons = useMemo(() => {
    if (!course || !course.sections) return [];
    const list = [];
    course.sections.forEach((sec, sIdx) => {
      (sec.lessons || []).forEach((les, lIdx) => {
        list.push({
          ...les,
          sectionId: sec._id,
          sectionTitle: sec.title,
          sectionIndex: sIdx + 1,
          lessonIndex: lIdx + 1,
        });
      });
    });
    return list;
  }, [course]);

  // Load lesson content
  const loadLesson = useCallback(
    async (lessonId, shouldActivateView = true) => {
      try {
        setLessonLoading(true);
        if (shouldActivateView) {
          setActiveView('lesson');
        }
        const data = await courseService.getLessonContent(idOrSlug, lessonId);
        setActiveSection(data.section);
        setActiveLesson(data.lesson);
        setIsLessonCompleted(Boolean(data.isCompleted));
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (shouldActivateView) {
              next.delete('view');
            }
            next.set('lesson', lessonId);
            return next;
          },
          { replace: true }
        );
      } catch (err) {
        setError(err.normalizedMessage || 'Failed to load lesson content.');
      } finally {
        setLessonLoading(false);
      }
    },
    [idOrSlug, setSearchParams]
  );

  // Open Discussions view and sync query param
  const handleOpenDiscussions = useCallback(() => {
    setActiveView('discussions');
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('view', 'discussions');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  // Sync activeView with URL query params on navigation / back-forward
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'discussions') {
      setActiveView('discussions');
    }
  }, [searchParams]);

  // Fetch quizzes, completion criteria, and assignments
  const fetchQuizzesAndCompletion = useCallback(async () => {
    try {
      setCompletionLoading(true);
      setCompletionError(null);
      const [quizRes, compRes, assignRes] = await Promise.all([
        quizService.getCourseQuizzes(idOrSlug).catch(() => ({ quizzes: [] })),
        certificateService.getCompletionStatus(idOrSlug).catch((err) => {
          setCompletionError(
            err?.normalizedMessage ||
              err?.response?.data?.error ||
              'Unable to load course completion status.'
          );
          return null;
        }),
        assignmentService.getCourseAssignments(idOrSlug).catch(() => ({ assignments: [] })),
      ]);
      setCourseQuizzes(quizRes?.quizzes || []);
      if (compRes) {
        setCompletionData(compRes);
      }
      setCourseAssignments(assignRes?.assignments || []);
    } catch (err) {
      setCompletionError(err?.normalizedMessage || 'Failed to fetch course data.');
    } finally {
      setCompletionLoading(false);
    }
  }, [idOrSlug]);

  // Load course details and enrollment on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    courseService
      .getCourseByIdOrSlug(idOrSlug)
      .then((data) => {
        if (!isMounted) return;
        setCourse(data.course);

        const initialCompleted = (data.enrollment?.completedLessons || []).map((id) =>
          id.toString()
        );
        setCompletedLessonIds(initialCompleted);

        // Determine which lesson to load first
        const paramView = searchParams.get('view');
        const isDiscussionsInitial = paramView === 'discussions';
        if (isDiscussionsInitial) {
          setActiveView('discussions');
        }
        const paramLessonId = searchParams.get('lesson');
        const firstLesson = data.course.sections?.[0]?.lessons?.[0] || null;

        const targetLessonId =
          paramLessonId ||
          data.enrollment?.lastAccessedLesson ||
          (firstLesson ? firstLesson._id : null);

        if (targetLessonId) {
          loadLesson(targetLessonId, !isDiscussionsInitial);
        }

        fetchQuizzesAndCompletion();
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.normalizedMessage || 'Failed to load course workspace.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [idOrSlug, loadLesson, searchParams, fetchQuizzesAndCompletion]);

  // Toggle lesson complete
  const handleToggleComplete = async () => {
    if (!course || !activeLesson) return;

    try {
      const res = await courseService.toggleLessonComplete(course._id, activeLesson._id);
      setIsLessonCompleted(res.isCompleted);
      setCompletedLessonIds(res.completedLessons || []);
      fetchQuizzesAndCompletion();
    } catch (err) {
      alert(err.normalizedMessage || 'Failed to update lesson completion status.');
    }
  };

  // Next / Prev Lesson Navigation
  const currentFlatIndex = flatLessons.findIndex(
    (l) => l._id.toString() === (activeLesson?._id ? activeLesson._id.toString() : '')
  );

  const prevLesson = currentFlatIndex > 0 ? flatLessons[currentFlatIndex - 1] : null;
  const nextLesson =
    currentFlatIndex !== -1 && currentFlatIndex < flatLessons.length - 1
      ? flatLessons[currentFlatIndex + 1]
      : null;

  // Progress metrics
  const totalLessons = flatLessons.length;
  const completedCount = completedLessonIds.length;
  const progressPercent =
    totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

  // Helper for YouTube embed vs generic video
  const getEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`;
    }
    return null;
  };

  // ==========================================
  // QUIZ HANDLING LOGIC
  // ==========================================

  const handleSelectQuiz = async (quiz) => {
    setActiveView('quiz');
    setActiveQuiz(quiz);
    setQuizStage('intro');
    setQuizResult(null);
    setCurrentAttempt(null);
    setSelectedAnswers({});
    setQuizError(null);
    if (window.innerWidth < 768) setSidebarOpen(false);

    try {
      setQuizDetailsLoading(true);
      const [qData, attData] = await Promise.all([
        quizService.getQuizForAttempt(idOrSlug, quiz._id),
        quizService.getStudentQuizAttempts(idOrSlug, quiz._id),
      ]);
      setActiveQuiz(qData.quiz);
      setQuizAttempts(attData.attempts || []);
    } catch (err) {
      setQuizError(err.normalizedMessage || 'Failed to load quiz details.');
    } finally {
      setQuizDetailsLoading(false);
    }
  };

  const handleStartAttempt = async () => {
    if (!activeQuiz) return;
    try {
      setQuizDetailsLoading(true);
      setQuizError(null);
      const data = await quizService.startQuizAttempt(idOrSlug, activeQuiz._id);
      setCurrentAttempt(data);
      setSelectedAnswers({});
      setCurrentQuestionIdx(0);
      setQuizStage('taking');

      if (data.timeLimitSeconds) {
        setSecondsRemaining(data.timeLimitSeconds);
      } else if (data.expiresAt) {
        const secs = Math.max(0, Math.floor((new Date(data.expiresAt) - new Date()) / 1000));
        setSecondsRemaining(secs);
      } else {
        setSecondsRemaining(null);
      }
    } catch (err) {
      setQuizError(err.normalizedMessage || 'Failed to start assessment attempt.');
    } finally {
      setQuizDetailsLoading(false);
    }
  };

  // Submit attempt
  const handleSubmitAttempt = useCallback(
    async (autoSubmitDueToTime = false) => {
      if (!currentAttempt || submittingAttempt) return;
      try {
        setSubmittingAttempt(true);
        setQuizError(null);

        const answersArray = Object.entries(selectedAnswers).map(
          ([questionId, selectedOptionId]) => ({
            questionId,
            selectedOptionId,
          })
        );

        const res = await quizService.submitQuizAttempt(
          idOrSlug,
          activeQuiz._id,
          currentAttempt.attemptId,
          answersArray
        );

        setQuizResult(res.result);
        setQuizStage('result');
        setSecondsRemaining(null);

        if (autoSubmitDueToTime) {
          setQuizError('Time expired! Your assessment has been automatically graded.');
        }

        fetchQuizzesAndCompletion();
      } catch (err) {
        setQuizError(err.normalizedMessage || 'Failed to submit assessment.');
      } finally {
        setSubmittingAttempt(false);
      }
    },
    [
      currentAttempt,
      submittingAttempt,
      selectedAnswers,
      idOrSlug,
      activeQuiz,
      fetchQuizzesAndCompletion,
    ]
  );

  // Countdown timer effect
  useEffect(() => {
    if (quizStage !== 'taking' || secondsRemaining === null) return;
    if (secondsRemaining <= 0) {
      handleSubmitAttempt(true);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitAttempt(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStage, secondsRemaining, handleSubmitAttempt]);

  const handleSelectOption = (questionId, optionId) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  // Format seconds to mm:ss
  const formatTimer = (seconds) => {
    if (seconds === null || seconds === undefined) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ==========================================
  // CERTIFICATE & COMPLETION LOGIC
  // ==========================================

  const handleClaimCertificate = async () => {
    try {
      setClaimingCert(true);
      setCertFeedback(null);
      const res = await certificateService.claimCertificate(idOrSlug);
      setCertFeedback({
        type: 'success',
        text: res.message || 'Certificate successfully awarded!',
      });
      if (res?.certificate) {
        setCompletionData((prev) => ({
          ...(prev || {}),
          isCompleted: true,
          certificateIssued: true,
          certificateId: res.certificate.certificateId,
          certificate: res.certificate,
        }));
      }
      await fetchQuizzesAndCompletion();
    } catch (err) {
      setCertFeedback({
        type: 'error',
        text: err.normalizedMessage || err.message || 'Could not claim certificate.',
      });
    } finally {
      setClaimingCert(false);
    }
  };

  // Derived completion and certificate variables
  const isCertIssued = Boolean(
    completionData?.certificateIssued ||
    completionData?.certificate ||
    completionData?.certificateId
  );

  const certificateObj =
    completionData?.certificate ||
    (completionData?.certificateId
      ? {
          certificateId: completionData.certificateId,
          studentSnapshot: { name: user?.name || 'Verified Learner' },
          courseSnapshot: { title: course?.title || 'Course of Study' },
          issuedAt: completionData?.completedAt || null,
        }
      : null);

  const lessonsTotalCount =
    completionData?.criteria?.totalLessons ??
    completionData?.progress?.lessons?.totalCount ??
    totalLessons;

  const lessonsDoneCount =
    completionData?.criteria?.lessonsCompleted ??
    completionData?.progress?.lessons?.completedCount ??
    completedCount;

  const allLessonsDone = Boolean(
    completionData?.criteria?.allLessonsCompleted ??
    completionData?.progress?.lessons?.completed ??
    (lessonsTotalCount > 0 && lessonsDoneCount >= lessonsTotalCount)
  );

  const totalMandatoryQuizzes =
    completionData?.criteria?.totalMandatoryQuizzes ??
    completionData?.progress?.quizzes?.requiredCount ??
    0;

  const passedMandatoryQuizzes =
    completionData?.criteria?.mandatoryQuizzesPassed ??
    completionData?.progress?.quizzes?.passedCount ??
    0;

  const allQuizzesDone = Boolean(
    completionData?.criteria?.allQuizzesPassed ??
    completionData?.progress?.quizzes?.completed ??
    (totalMandatoryQuizzes === 0 || passedMandatoryQuizzes >= totalMandatoryQuizzes)
  );

  const isEligibleToClaim = Boolean(
    !isCertIssued &&
    (completionData?.isEligibleForCompletion ??
      completionData?.isEligible ??
      (allLessonsDone && allQuizzesDone))
  );

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] text-white flex items-center justify-center">
        <div className="text-center space-y-3 animate-pulse">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#A0A0A0]">Opening course workspace...</p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error && !course) {
    return (
      <div className="min-h-screen bg-[#F2F2F0] flex items-center justify-center p-4">
        <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <BookOpen size={28} className="text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#171717] mb-2">Access Restricted</h2>
          <p className="text-xs text-[#686868] mb-6 leading-relaxed">{error}</p>
          <Link
            to={`/courses/${idOrSlug}`}
            className="px-4 py-2 bg-[#171717] text-white text-xs font-semibold rounded-xl hover:bg-[#2e2e2e] transition"
          >
            Go to Course Overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F2F0] text-[#171717]">
      {/* Top Learning Bar */}
      <header className="h-14 bg-[#FFFFFF] border-b border-[#E4E4E1] px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to={`/courses/${course?.slug || idOrSlug}`}
            className="p-1.5 text-[#686868] hover:text-[#171717] rounded-lg hover:bg-[#F2F2F0] transition"
            title="Return to Course Details"
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="border-l border-[#E4E4E1] pl-3">
            <h1 className="text-xs sm:text-sm font-bold text-[#171717] line-clamp-1">
              {course?.title}
            </h1>
            <p className="text-[10px] text-[#686868] hidden sm:block">
              {activeView === 'lesson' &&
                (activeSection ? `${activeSection.title} • ` : '') +
                  (activeLesson?.title || 'Lesson Player')}
              {activeView === 'quiz' && `Assessment • ${activeQuiz?.title || 'Quiz'}`}
              {activeView === 'completion' && 'Course Completion & Verified Certificate'}
              {activeView === 'discussions' && 'Course Discussion Forum & Q&A'}
            </p>
          </div>
        </div>

        {/* Header Progress & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-28 h-1.5 bg-[#E4E4E1] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-[#686868]">
              {progressPercent}% completed
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenDiscussions}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeView === 'discussions'
                ? 'bg-blue-50 text-blue-800 border border-blue-300'
                : 'bg-surface-subtle text-secondary hover:text-primary border border-border-subtle'
            }`}
          >
            <MessageSquare size={14} className="text-accent-blue-dark" />
            <span className="hidden sm:inline">Q&A Forum</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('completion')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isCertIssued || isEligibleToClaim
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                : 'bg-surface-subtle text-secondary hover:text-primary border border-border-subtle'
            }`}
          >
            <Award
              size={14}
              className={
                isCertIssued || isEligibleToClaim
                  ? 'text-emerald-700'
                  : 'text-accent-sage-dark'
              }
            />
            <span className="hidden sm:inline">
              {isCertIssued
                ? 'Certificate Earned'
                : isEligibleToClaim
                ? 'Ready to Claim'
                : 'Completion Status'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="p-2 text-[#686868] hover:text-[#171717] rounded-lg hover:bg-[#F2F2F0] transition"
            title={sidebarOpen ? 'Collapse playlist' : 'Expand playlist'}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Main Workspace: Left Playlist Sidebar + Main Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Playlist Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-80 border-r border-[#E4E4E1]' : 'w-0'
          } bg-[#FFFFFF] transition-all duration-200 shrink-0 overflow-y-auto flex flex-col z-20 absolute md:relative inset-y-0 left-0 shadow-md md:shadow-none`}
        >
          {/* Completion Progress Header */}
          <div
            onClick={() => setActiveView('completion')}
            className={`p-4 border-b border-[#E4E4E1] cursor-pointer transition ${
              activeView === 'completion' ? 'bg-accent-sage-pale/40' : 'bg-[#FAFAFA] hover:bg-[#F2F2F0]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-sage-dark">
                Course Progress
              </span>
              <span className="text-xs font-bold text-primary">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#E4E4E1] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-[#686868] flex items-center justify-between">
              <span>{lessonsDoneCount} of {lessonsTotalCount} lessons completed</span>
              {isCertIssued && (
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle size={11} /> Certified
                </span>
              )}
            </p>
          </div>

          <div className="flex-1 divide-y divide-[#E4E4E1]">
            {/* MODULES & LESSONS */}
            {course?.sections?.map((section, sIdx) => (
              <div key={section._id} className="py-2">
                <div className="px-4 py-1.5 text-[11px] font-bold text-[#686868] uppercase tracking-wider">
                  Module {sIdx + 1}: {section.title}
                </div>

                <div className="mt-1">
                  {(section.lessons || []).map((lesson, lIdx) => {
                    const isSelected =
                      activeView === 'lesson' && activeLesson?._id === lesson._id;
                    const isDone = completedLessonIds.includes(lesson._id.toString());

                    return (
                      <button
                        key={lesson._id}
                        type="button"
                        onClick={() => {
                          loadLesson(lesson._id);
                          if (window.innerWidth < 768) setSidebarOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#637D91]/10 border-l-3 border-[#637D91] text-[#171717]'
                            : 'hover:bg-[#F2F2F0] text-[#686868]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {isDone ? (
                            <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                          ) : lesson.contentType === 'video' ? (
                            <PlayCircle size={14} className="text-[#686868] shrink-0" />
                          ) : (
                            <FileText size={14} className="text-[#686868] shrink-0" />
                          )}
                          <span
                            className={`text-xs truncate ${
                              isSelected ? 'font-bold text-[#171717]' : 'font-medium'
                            }`}
                          >
                            {sIdx + 1}.{lIdx + 1} {lesson.title}
                          </span>
                        </div>

                        <span className="text-[10px] text-[#A0A0A0] shrink-0 font-mono">
                          {lesson.duration}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* ASSESSMENTS & QUIZZES */}
            {courseQuizzes && courseQuizzes.length > 0 && (
              <div className="py-3">
                <div className="px-4 py-1.5 text-[11px] font-bold text-[#686868] uppercase tracking-wider flex items-center justify-between">
                  <span>Assessments & Quizzes</span>
                  <span className="text-[10px] font-semibold text-tertiary">
                    {courseQuizzes.length} tests
                  </span>
                </div>

                <div className="mt-1 space-y-1">
                  {courseQuizzes.map((quiz) => {
                    const isSelected =
                      activeView === 'quiz' && activeQuiz?._id === quiz._id;
                    const hasPassed = quiz.userStats?.hasPassed;
                    const attemptsCount = quiz.userStats?.totalAttempts || 0;

                    return (
                      <button
                        key={quiz._id}
                        type="button"
                        onClick={() => handleSelectQuiz(quiz)}
                        className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-accent-sage-pale/60 border-l-3 border-accent-sage-dark text-[#171717]'
                            : 'hover:bg-[#F2F2F0] text-[#686868]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <Award
                            size={14}
                            className={`shrink-0 ${
                              hasPassed ? 'text-emerald-600' : 'text-accent-sage-dark'
                            }`}
                          />
                          <div className="min-w-0">
                            <span
                              className={`text-xs block truncate ${
                                isSelected ? 'font-bold text-[#171717]' : 'font-medium'
                              }`}
                            >
                              {quiz.title}
                            </span>
                            <span className="text-[10px] text-tertiary">
                              {quiz.questionsCount || quiz.questions?.length || 0} questions •{' '}
                              {quiz.passingPercentage}% to pass
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {hasPassed ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Passed {quiz.userStats?.bestScore || 0}%
                            </span>
                          ) : attemptsCount > 0 ? (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {attemptsCount} att.
                            </span>
                          ) : (
                            <span className="text-[10px] text-secondary font-medium">Ready</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* COURSE Q&A & DISCUSSION FORUM */}
            <div className="py-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={handleOpenDiscussions}
                className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition cursor-pointer ${
                  activeView === 'discussions'
                    ? 'bg-blue-50 text-blue-800 font-semibold border-r-2 border-accent-blue-dark'
                    : 'hover:bg-[#F2F2F0] text-[#686868]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare
                    size={14}
                    className={activeView === 'discussions' ? 'text-accent-blue-dark' : 'text-tertiary'}
                  />
                  <span className="text-xs">Q&A & Discussion Forum</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-subtle text-secondary border border-border-subtle">
                  Forum
                </span>
              </button>
            </div>

            {/* COURSE ASSIGNMENTS & DELIVERABLES */}
            {courseAssignments && courseAssignments.length > 0 && (
              <div className="py-3 border-t border-border-subtle">
                <div className="px-4 py-1.5 text-[11px] font-bold text-[#686868] uppercase tracking-wider flex items-center justify-between">
                  <span>Assignments & Projects</span>
                  <span className="text-[10px] font-semibold text-tertiary">
                    {courseAssignments.length} tasks
                  </span>
                </div>

                <div className="mt-1 space-y-1">
                  {courseAssignments.map((assignment) => {
                    const isDuePast = new Date(assignment.dueDate) < new Date();
                    const isGraded = assignment.submissionStatus === 'graded';
                    const isSubmitted = assignment.isSubmitted;

                    return (
                      <button
                        key={assignment._id}
                        type="button"
                        onClick={() => {
                          setSelectedPlayerAssignment(assignment);
                          setPlayerAssignmentModalOpen(true);
                        }}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-left transition cursor-pointer hover:bg-[#F2F2F0] text-[#686868]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <FileCheck
                            size={14}
                            className={`shrink-0 ${
                              isGraded
                                ? 'text-emerald-600'
                                : isSubmitted
                                ? 'text-blue-600'
                                : 'text-accent-blue-dark'
                            }`}
                          />
                          <div className="min-w-0">
                            <span className="text-xs block truncate font-medium text-[#171717]">
                              {assignment.title}
                            </span>
                            <span className="text-[10px] text-tertiary">
                              Due: {new Date(assignment.dueDate).toLocaleDateString()} •{' '}
                              {assignment.maxMarks} pts
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {isGraded ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Graded: {assignment.grade}/{assignment.maxMarks}
                            </span>
                          ) : isSubmitted ? (
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              Submitted
                            </span>
                          ) : isDuePast ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              Overdue
                            </span>
                          ) : (
                            <span className="text-[10px] text-secondary font-medium">Open</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Stage Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-6">
            {/* VIEW 4: COURSE DISCUSSION FORUM & Q&A */}
            {activeView === 'discussions' && (
              <CourseDiscussionForum
                courseId={course?._id || idOrSlug}
                courseTitle={course?.title}
                currentUser={user}
              />
            )}

            {/* VIEW 1: LESSON CONTENT */}
            {activeView === 'lesson' && (
              <>
                {lessonLoading ? (
                  <div className="h-96 bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl flex items-center justify-center animate-pulse">
                    <div className="text-center space-y-2">
                      <div className="w-8 h-8 border-2 border-[#637D91] border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-[#686868]">Loading lesson content...</p>
                    </div>
                  </div>
                ) : activeLesson ? (
                  <>
                    {/* Media Stage: Video player if video lecture */}
                    {activeLesson.contentType === 'video' && activeLesson.videoUrl && (
                      <div className="bg-[#171717] rounded-2xl overflow-hidden aspect-video shadow-lg relative flex items-center justify-center">
                        {getEmbedUrl(activeLesson.videoUrl) ? (
                          <iframe
                            src={getEmbedUrl(activeLesson.videoUrl)}
                            title={activeLesson.title}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            controls
                            src={activeLesson.videoUrl}
                            className="w-full h-full object-contain"
                          >
                            Your browser does not support HTML5 video streaming.
                          </video>
                        )}
                      </div>
                    )}

                    {/* Lesson Header & Mark Complete action */}
                    <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1 text-[11px] font-bold text-[#637D91] uppercase tracking-wider">
                          <span>{activeSection?.title}</span>
                          <span>•</span>
                          <span>{activeLesson.duration}</span>
                        </div>
                        <h2 className="text-xl font-bold text-[#171717]">{activeLesson.title}</h2>
                        {activeLesson.description && (
                          <p className="text-xs text-[#686868] mt-1">{activeLesson.description}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleComplete}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer self-start sm:self-auto ${
                          isLessonCompleted
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                            : 'bg-[#171717] text-white hover:bg-[#2b2b2b] shadow-sm'
                        }`}
                      >
                        <CheckCircle size={15} />
                        <span>{isLessonCompleted ? 'Completed' : 'Mark as Complete'}</span>
                      </button>
                    </div>

                    {/* Text Content / Markdown Notes */}
                    {activeLesson.textContent && (
                      <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-6 sm:p-8 shadow-sm">
                        <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider mb-4 pb-2 border-b border-[#E4E4E1]">
                          Lesson Notes & Guide
                        </h3>
                        <div className="text-xs sm:text-sm text-[#171717] leading-relaxed whitespace-pre-wrap font-sans">
                          {activeLesson.textContent}
                        </div>
                      </div>
                    )}

                    {/* Attachment or Reference Resource */}
                    {activeLesson.attachmentUrl && (
                      <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-5 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#637D91]/10 text-[#637D91] flex items-center justify-center">
                            <FileDown size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#171717]">Supplementary Asset</h4>
                            <p className="text-[11px] text-[#686868]">
                              Code repository or reference file
                            </p>
                          </div>
                        </div>

                        <a
                          href={activeLesson.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#F2F2F0] hover:bg-[#E4E4E1] text-[#171717] transition"
                        >
                          Open Attachment &rarr;
                        </a>
                      </div>
                    )}

                    {/* Previous / Next Lesson Footer Controls */}
                    <div className="flex items-center justify-between pt-4 pb-12">
                      {prevLesson ? (
                        <button
                          type="button"
                          onClick={() => loadLesson(prevLesson._id)}
                          className="px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#E4E4E1] text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <ChevronLeft size={14} />
                          <span>Previous: {prevLesson.title}</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      {nextLesson ? (
                        <button
                          type="button"
                          onClick={() => loadLesson(nextLesson._id)}
                          className="px-5 py-2.5 rounded-xl bg-[#637D91] text-white text-xs font-semibold hover:bg-[#526879] flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                        >
                          <span>Next: {nextLesson.title}</span>
                          <ChevronRight size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveView('completion')}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Award size={14} />
                          <span>Complete Course & Get Certificate</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-12 text-center text-xs text-[#686868]">
                    Select a lesson from the playlist to begin learning.
                  </div>
                )}
              </>
            )}

            {/* VIEW 2: QUIZ & ASSESSMENT STAGE */}
            {activeView === 'quiz' && (
              <div className="space-y-6">
                {quizError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{quizError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuizError(null)}
                      className="font-bold ml-2 cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {quizDetailsLoading ? (
                  <div className="h-80 bg-white border border-border-subtle rounded-2xl flex items-center justify-center animate-pulse">
                    <div className="text-center space-y-2">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-secondary">Preparing assessment environment...</p>
                    </div>
                  </div>
                ) : !activeQuiz ? (
                  <div className="bg-white border border-border-subtle rounded-2xl p-8 text-center text-xs text-secondary">
                    Assessment details unavailable.
                  </div>
                ) : quizStage === 'intro' ? (
                  /* STAGE: INTRO */
                  <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent-sage-dark uppercase tracking-wider mb-1">
                          <Award size={14} />
                          <span>Course Assessment</span>
                        </div>
                        <h2 className="text-2xl font-extrabold text-primary">{activeQuiz.title}</h2>
                        {activeQuiz.description && (
                          <p className="text-xs text-secondary mt-1">{activeQuiz.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {activeQuiz.userStats?.hasPassed && (
                          <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} /> Passed ({activeQuiz.userStats.bestScore}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Criteria Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-surface-subtle p-3.5 rounded-2xl border border-border-subtle">
                        <span className="text-[10px] uppercase font-bold text-tertiary block">
                          Questions
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {activeQuiz.questionsCount || activeQuiz.questions?.length || 0}
                        </span>
                      </div>
                      <div className="bg-surface-subtle p-3.5 rounded-2xl border border-border-subtle">
                        <span className="text-[10px] uppercase font-bold text-tertiary block">
                          Passing Score
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {activeQuiz.passingPercentage}%
                        </span>
                      </div>
                      <div className="bg-surface-subtle p-3.5 rounded-2xl border border-border-subtle">
                        <span className="text-[10px] uppercase font-bold text-tertiary block">
                          Time Limit
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {activeQuiz.durationMinutes ? `${activeQuiz.durationMinutes} min` : 'Untimed'}
                        </span>
                      </div>
                      <div className="bg-surface-subtle p-3.5 rounded-2xl border border-border-subtle">
                        <span className="text-[10px] uppercase font-bold text-tertiary block">
                          Attempts Left
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {activeQuiz.maxAttempts
                            ? Math.max(0, activeQuiz.maxAttempts - (quizAttempts.length || 0))
                            : 'Unlimited'}
                        </span>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-5 space-y-2">
                      <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <HelpCircle size={14} className="text-secondary" />
                        <span>Assessment Instructions</span>
                      </h4>
                      <p className="text-xs text-secondary leading-relaxed">
                        {activeQuiz.instructions ||
                          'Read each question carefully and select the single best option. Questions are server-graded upon submission.'}
                      </p>
                    </div>

                    {/* Start CTA */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={handleStartAttempt}
                        disabled={
                          activeQuiz.maxAttempts &&
                          quizAttempts.length >= activeQuiz.maxAttempts &&
                          !activeQuiz.userStats?.hasPassed
                        }
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#2b2b2b] transition cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {quizAttempts.length === 0
                          ? 'Start Assessment'
                          : activeQuiz.userStats?.hasPassed
                          ? 'Retake Assessment (For Practice)'
                          : 'Begin Next Attempt'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveView('lesson')}
                        className="text-xs text-secondary hover:text-primary font-medium"
                      >
                        &larr; Back to Curriculum
                      </button>
                    </div>

                    {/* Attempt History */}
                    {quizAttempts.length > 0 && (
                      <div className="pt-6 border-t border-border-subtle space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                          Past Attempts ({quizAttempts.length})
                        </h4>
                        <div className="divide-y divide-border-subtle border border-border-subtle rounded-2xl overflow-hidden bg-white text-xs">
                          {quizAttempts.map((att) => (
                            <div
                              key={att._id}
                              className="p-3.5 flex items-center justify-between hover:bg-surface-subtle transition"
                            >
                              <div className="space-y-0.5">
                                <span className="font-semibold text-primary">
                                  Attempt #{att.attemptNumber}
                                </span>
                                <span className="text-[10px] text-tertiary block">
                                  Submitted on {new Date(att.submittedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-primary">
                                  {att.score}/{att.maxScore} pts ({att.percentage}%)
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    att.isPassed
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                      : 'bg-rose-50 text-rose-800 border border-rose-300'
                                  }`}
                                >
                                  {att.isPassed ? 'Passed' : 'Failed'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : quizStage === 'taking' ? (
                  /* STAGE: TAKING QUIZ */
                  <div className="space-y-4">
                    {/* Top Timer & Header */}
                    <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xs font-bold text-primary">{activeQuiz.title}</h3>
                        <p className="text-[10px] text-secondary">
                          Attempt #{currentAttempt?.attemptNumber} • Question{' '}
                          {currentQuestionIdx + 1} of {currentAttempt?.questions?.length || 0}
                        </p>
                      </div>

                      {secondsRemaining !== null && (
                        <div
                          className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
                            secondsRemaining < 120
                              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                              : 'bg-surface-subtle text-primary border-border-subtle'
                          }`}
                        >
                          <Clock size={14} />
                          <span>{formatTimer(secondsRemaining)}</span>
                        </div>
                      )}
                    </div>

                    {/* Question Stepper / Navigation Dots */}
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white border border-border-subtle rounded-xl">
                      {currentAttempt?.questions?.map((q, idx) => {
                        const isAnswered = Boolean(selectedAnswers[q._id]);
                        const isCurrent = idx === currentQuestionIdx;

                        return (
                          <button
                            key={q._id}
                            type="button"
                            onClick={() => setCurrentQuestionIdx(idx)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                              isCurrent
                                ? 'bg-primary text-white shadow-xs'
                                : isAnswered
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-surface-subtle text-secondary hover:bg-border-subtle'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Question Box */}
                    {currentAttempt?.questions?.[currentQuestionIdx] && (
                      <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                        {(() => {
                          const question = currentAttempt.questions[currentQuestionIdx];
                          const selectedOption = selectedAnswers[question._id];

                          return (
                            <>
                              <div className="flex items-start justify-between gap-4">
                                <h3 className="text-base sm:text-lg font-bold text-primary leading-snug">
                                  <span className="text-secondary mr-2">
                                    Q{currentQuestionIdx + 1}.
                                  </span>
                                  {question.questionText}
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-subtle text-secondary shrink-0">
                                  {question.points} {question.points === 1 ? 'pt' : 'pts'}
                                </span>
                              </div>

                              {/* Options Radio List */}
                              <div className="space-y-3">
                                {question.options?.map((opt) => {
                                  const isChecked = selectedOption === opt.id;

                                  return (
                                    <label
                                      key={opt.id}
                                      onClick={() => handleSelectOption(question._id, opt.id)}
                                      className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-center gap-3 cursor-pointer transition ${
                                        isChecked
                                          ? 'bg-accent-sage-pale/60 border-accent-sage-dark text-primary shadow-xs'
                                          : 'bg-surface-subtle border-border-subtle text-secondary hover:bg-white hover:border-primary/40'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`question_${question._id}`}
                                        checked={isChecked}
                                        onChange={() => {}}
                                        className="w-4 h-4 text-primary focus:ring-primary"
                                      />
                                      <span className="flex-1">{opt.text}</span>
                                    </label>
                                  );
                                })}
                              </div>

                              {/* Navigation & Submit */}
                              <div className="pt-6 border-t border-border-subtle flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))
                                  }
                                  disabled={currentQuestionIdx === 0}
                                  className="px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-xs font-semibold text-primary disabled:opacity-40 cursor-pointer"
                                >
                                  &larr; Previous
                                </button>

                                <div className="flex items-center gap-2">
                                  {currentQuestionIdx < currentAttempt.questions.length - 1 ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCurrentQuestionIdx((prev) =>
                                          Math.min(currentAttempt.questions.length - 1, prev + 1)
                                        )
                                      }
                                      className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition cursor-pointer"
                                    >
                                      Next &rarr;
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSubmitAttempt(false)}
                                      disabled={submittingAttempt}
                                      className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer shadow-xs disabled:opacity-50"
                                    >
                                      {submittingAttempt
                                        ? 'Submitting & Grading...'
                                        : 'Submit Assessment'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  /* STAGE: RESULT REVIEW */
                  <div className="space-y-6">
                    {/* Results Banner */}
                    <div
                      className={`p-6 sm:p-8 rounded-3xl border shadow-xs ${
                        quizResult?.isPassed
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50/70 border-rose-200 text-rose-950'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                quizResult?.isPassed
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : 'bg-rose-200 text-rose-900'
                              }`}
                            >
                              {quizResult?.isPassed ? 'Passed' : 'Needs Retake'}
                            </span>
                            <span className="text-xs font-semibold">
                              Passing Mark: {activeQuiz.passingPercentage}%
                            </span>
                          </div>
                          <h2 className="text-2xl font-extrabold tracking-tight">
                            {quizResult?.isPassed
                              ? 'Congratulations! Assessment Passed'
                              : 'Assessment Threshold Not Met'}
                          </h2>
                          <p className="text-xs opacity-90 max-w-lg leading-relaxed">
                            {quizResult?.isPassed
                              ? 'Your objective answers have met the proficiency requirement for this course assessment module.'
                              : 'Review the question explanations below and attempt the assessment again when prepared.'}
                          </p>
                        </div>

                        <div className="text-center sm:text-right bg-white/70 p-4 rounded-2xl border border-current/20 shrink-0">
                          <span className="text-3xl font-extrabold block">
                            {quizResult?.percentage}%
                          </span>
                          <span className="text-xs font-semibold opacity-80">
                            {quizResult?.score} / {quizResult?.maxScore} points
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-current/20 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleStartAttempt}
                          className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#2b2b2b] transition cursor-pointer"
                        >
                          Retake Assessment
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveView('completion')}
                          className="px-4 py-2 rounded-xl bg-white text-primary border border-border-subtle text-xs font-semibold hover:bg-surface-subtle transition cursor-pointer"
                        >
                          Check Course Completion &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Question by Question Review */}
                    {quizResult?.questions && quizResult.questions.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                          Answer Review & Explanations
                        </h4>

                        <div className="space-y-4">
                          {quizResult.questions.map((q, idx) => (
                            <div
                              key={q.questionId}
                              className={`bg-white border rounded-2xl p-5 shadow-xs space-y-3 ${
                                q.isCorrect ? 'border-emerald-200' : 'border-rose-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <h5 className="text-xs sm:text-sm font-bold text-primary">
                                  <span className="text-secondary mr-1">Q{idx + 1}.</span>
                                  {q.questionText}
                                </h5>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                    q.isCorrect
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {q.earnedPoints}/{q.points} pts
                                </span>
                              </div>

                              {/* Options */}
                              <div className="space-y-2">
                                {q.options?.map((opt) => {
                                  const isSelected = q.selectedOptionId === opt.id;
                                  const isCorrect = q.correctOptionId === opt.id;

                                  let optClass = 'bg-surface-subtle text-secondary border-border-subtle';
                                  if (isCorrect) {
                                    optClass = 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold';
                                  } else if (isSelected && !q.isCorrect) {
                                    optClass = 'bg-rose-50 text-rose-900 border-rose-300 font-semibold';
                                  }

                                  return (
                                    <div
                                      key={opt.id}
                                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${optClass}`}
                                    >
                                      <span>{opt.text}</span>
                                      <div className="text-[10px] font-bold">
                                        {isCorrect && <span>✓ Correct Answer</span>}
                                        {isSelected && !isCorrect && <span>✗ Selected</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Explanation */}
                              {q.explanation && (
                                <div className="p-3 bg-surface-subtle border border-border-subtle rounded-xl text-xs text-secondary space-y-1">
                                  <span className="font-bold text-primary block">
                                    Explanation:
                                  </span>
                                  <p>{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: COURSE COMPLETION & VERIFIED CERTIFICATES */}
            {activeView === 'completion' && (
              <div className="space-y-6">
                {certFeedback && (
                  <div
                    className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
                      certFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    <span>{certFeedback.text}</span>
                    <button
                      type="button"
                      onClick={() => setCertFeedback(null)}
                      className="font-bold ml-2 cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {/* Status Card */}
                {completionLoading && !completionData ? (
                  <div className="bg-white border border-border-subtle rounded-3xl p-10 text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-secondary">
                      Auditing graduation criteria and verified course progress...
                    </p>
                  </div>
                ) : completionError && !completionData ? (
                  <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center space-y-4">
                    <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-primary mb-1">
                        Unable to Load Completion Status
                      </h3>
                      <p className="text-xs text-secondary leading-relaxed max-w-md mx-auto">
                        {completionError}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchQuizzesAndCompletion}
                      className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-[#2e2e2e] transition cursor-pointer"
                    >
                      Retry Verification
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent-sage-dark uppercase tracking-wider mb-1">
                          <ShieldCheck size={14} />
                          <span>Graduation & Credentialing</span>
                        </div>
                        <h2 className="text-2xl font-extrabold text-primary">
                          Course Completion & Verification
                        </h2>
                        <p className="text-xs text-secondary mt-1">
                          Review academic requirements to unlock your tamper-evident LearnSpace
                          Certificate of Completion.
                        </p>
                      </div>

                      <div className="shrink-0">
                        {isCertIssued ? (
                          <span className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 size={15} /> Certificate Issued
                          </span>
                        ) : isEligibleToClaim ? (
                          <span className="px-4 py-2 rounded-full bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40 font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 size={15} /> Ready to Claim
                          </span>
                        ) : (
                          <span className="px-4 py-2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5">
                            <Clock size={15} /> Requirements Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Criteria Checklist */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                        Mandatory Completion Criteria
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Lesson Requirement */}
                        <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              allLessonsDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {allLessonsDone ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <Clock size={16} />
                            )}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-primary">Curriculum Lectures</h5>
                            <p className="text-[11px] text-secondary mt-0.5">
                              {lessonsDoneCount} of {lessonsTotalCount} lessons marked complete
                            </p>
                            <span className="text-[10px] font-semibold text-tertiary block mt-1">
                              Requires 100% lecture engagement
                            </span>
                          </div>
                        </div>

                        {/* Quizzes Requirement */}
                        <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              allQuizzesDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {allQuizzesDone ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <Clock size={16} />
                            )}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-primary">Required Assessments</h5>
                            <p className="text-[11px] text-secondary mt-0.5">
                              {totalMandatoryQuizzes === 0
                                ? '0 of 0 mandatory quizzes required'
                                : `${passedMandatoryQuizzes} of ${totalMandatoryQuizzes} mandatory quizzes passed`}
                            </p>
                            <span className="text-[10px] font-semibold text-tertiary block mt-1">
                              {totalMandatoryQuizzes === 0
                                ? 'No mandatory quizzes required for this course'
                                : 'Requires passing score on all mandatory tests'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Certificate Claim Action or Preview Card */}
                    {isCertIssued && certificateObj ? (
                      <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-br from-white to-surface-subtle border-2 border-accent-sage-dark/30 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-border-subtle">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-accent-sage-pale text-accent-sage-dark flex items-center justify-center">
                              <Award size={24} />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-sage-dark">
                                Official Credential
                              </span>
                              <h3 className="text-base font-bold text-primary">
                                {certificateObj.courseSnapshot?.title ||
                                  certificateObj.courseTitleSnapshot ||
                                  course?.title}
                              </h3>
                              <span className="text-xs text-secondary font-mono">
                                ID: {certificateObj.certificateId}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              to={`/verify/${certificateObj.certificateId}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition"
                            >
                              <ExternalLink size={13} />
                              <span>Verify Page</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-border-subtle text-primary text-xs font-semibold hover:bg-surface-subtle transition cursor-pointer"
                            >
                              <Printer size={13} />
                              <span>Print</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-secondary">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-tertiary block">
                              Recipient
                            </span>
                            <span className="font-semibold text-primary">
                              {certificateObj.studentSnapshot?.name ||
                                certificateObj.studentNameSnapshot ||
                                user?.name ||
                                'Verified Learner'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-tertiary block">
                              Awarded Date
                            </span>
                            <span className="font-semibold text-primary">
                              {certificateObj.issuedAt ||
                              certificateObj.issueDate ||
                              completionData?.completedAt
                                ? new Date(
                                    certificateObj.issuedAt ||
                                      certificateObj.issueDate ||
                                      completionData?.completedAt
                                  ).toLocaleDateString()
                                : 'Issued'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-tertiary block">
                              Verification Link
                            </span>
                            <span className="font-mono text-[11px] text-accent-blue-dark truncate block">
                              learnspace.io/verify/{certificateObj.certificateId}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : isEligibleToClaim ? (
                      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-emerald-950">
                            All requirements completed!
                          </h4>
                          <p className="text-xs text-emerald-900/90 mt-0.5">
                            Claim your unique verified certificate to showcase your achievement.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleClaimCertificate}
                          disabled={claimingCert}
                          className="px-6 py-3 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {claimingCert ? 'Awarding Certificate...' : 'Claim Official Certificate'}
                        </button>
                      </div>
                    ) : (
                      <div className="p-6 bg-surface-subtle border border-border-subtle rounded-2xl text-xs text-secondary leading-relaxed">
                        {!allLessonsDone && !allQuizzesDone
                          ? 'Please finish all outstanding lessons and achieve passing marks on all mandatory assessments to unlock your certificate.'
                          : !allLessonsDone
                          ? 'Please complete all remaining lessons in the curriculum to unlock your certificate.'
                          : 'Please achieve passing marks on all mandatory assessments to unlock your certificate.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Assignment Submission Modal */}
      {playerAssignmentModalOpen && selectedPlayerAssignment && (
        <AssignmentSubmissionModal
          assignment={selectedPlayerAssignment}
          isOpen={playerAssignmentModalOpen}
          onClose={() => {
            setPlayerAssignmentModalOpen(false);
            setSelectedPlayerAssignment(null);
          }}
          onSubmitted={() => {
            setPlayerAssignmentModalOpen(false);
            setSelectedPlayerAssignment(null);
            fetchQuizzesAndCompletion();
          }}
        />
      )}
    </div>
  );
}
