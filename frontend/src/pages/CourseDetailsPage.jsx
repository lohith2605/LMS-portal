import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  Globe,
  Layers,
  ArrowLeft,
  CheckCircle,
  PlayCircle,
  FileText,
  FileDown,
  Award,
  ChevronDown,
  ChevronUp,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import { courseService } from '../services/api';
import { useAuth } from '../context/useAuth';

export default function CourseDetailsPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [course, setCourse] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [enrollment, setEnrollment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState(null);
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState(null);

  // Section collapse toggle map
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    courseService
      .getCourseByIdOrSlug(idOrSlug)
      .then((data) => {
        if (!isMounted) return;
        setCourse(data.course);
        setIsEnrolled(data.isEnrolled);
        setHasFullAccess(data.hasFullAccess);
        setEnrollment(data.enrollment);

        // Expand first section by default
        if (data.course.sections && data.course.sections.length > 0) {
          setExpandedSections({ [data.course.sections[0]._id]: true });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.normalizedMessage || 'Course not found or unavailable.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [idOrSlug]);

  const toggleSection = (secId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/courses/${idOrSlug}`);
      return;
    }

    if (user?.role === 'instructor' && course?.instructor?.id === user?.id) {
      alert('You are the instructor of this course.');
      return;
    }

    try {
      setEnrolling(true);
      setError(null);
      const res = await courseService.enrollInCourse(course._id);
      setIsEnrolled(true);
      setHasFullAccess(true);
      setEnrollment(res.enrollment);
      setEnrollSuccessMessage(res.message || 'Successfully enrolled! You now have full access.');
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to process enrollment.');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F0] py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
          <div className="h-4 bg-[#E4E4E1] rounded w-28" />
          <div className="h-10 bg-[#E4E4E1] rounded w-3/4" />
          <div className="h-4 bg-[#E4E4E1] rounded w-1/2" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-48 bg-[#FFFFFF] rounded-2xl border border-[#E4E4E1]" />
              <div className="h-64 bg-[#FFFFFF] rounded-2xl border border-[#E4E4E1]" />
            </div>
            <div className="h-80 bg-[#FFFFFF] rounded-2xl border border-[#E4E4E1]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#F2F2F0] py-16 px-4 flex items-center justify-center">
        <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={24} />
          </div>
          <h2 className="text-lg font-bold text-[#171717] mb-2">Course Unavailable</h2>
          <p className="text-xs text-[#686868] mb-6 leading-relaxed">
            {error || 'This course could not be located in our catalog.'}
          </p>
          <Link
            to="/#courses"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#171717] text-white text-xs font-semibold rounded-xl hover:bg-[#2e2e2e] transition"
          >
            <ArrowLeft size={14} />
            <span>Return to Course Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F0] text-[#171717] pb-20">
      {/* Top Breadcrumb Nav */}
      <div className="bg-[#FFFFFF] border-b border-[#E4E4E1] py-3.5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/#courses"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#686868] hover:text-[#171717] transition"
          >
            <ArrowLeft size={14} />
            <span>Back to Catalog</span>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            {isAuthenticated ? (
              <Link
                to={
                  user?.role === 'student'
                    ? '/dashboard/student'
                    : user?.role === 'instructor'
                    ? '/dashboard/instructor'
                    : '/dashboard/admin'
                }
                className="font-medium text-[#637D91] hover:underline"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to={`/login?redirect=/courses/${course.slug}`}
                className="font-semibold text-[#171717] hover:underline"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <section className="bg-[#FFFFFF] border-b border-[#E4E4E1] pt-8 pb-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#637D91]/10 text-[#637D91] border border-[#637D91]/20">
              {course.category}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F2F2F0] text-[#686868] border border-[#E4E4E1]">
              {course.level}
            </span>
            {course.status !== 'published' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                {course.status.replace('_', ' ')}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] leading-tight mb-3">
            {course.title}
          </h1>

          <p className="text-sm text-[#686868] max-w-3xl leading-relaxed mb-6">
            {course.summary}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#686868]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs uppercase">
                {course.instructor?.name ? course.instructor.name.charAt(0) : 'I'}
              </div>
              <span className="font-semibold text-[#171717]">{course.instructor?.name || 'Instructor'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-[#686868]" />
              <span>{course.estimatedDuration}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-[#686868]" />
              <span>{course.totalLessons} lessons</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Globe size={14} className="text-[#686868]" />
              <span>{course.language}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Details + Enrollment Sidebar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {enrollSuccessMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 shadow-sm">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <span>{enrollSuccessMessage}</span>
            </div>
            <Link
              to={`/courses/${course.slug}/learn`}
              className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              Start Learning Now &rarr;
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Description, Objectives, Curriculum */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Course */}
            <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-base font-bold text-[#171717] mb-3">About this Course</h2>
              <div className="text-xs sm:text-sm text-[#686868] leading-relaxed whitespace-pre-line">
                {course.description}
              </div>
            </div>

            {/* What you will learn */}
            {course.learningObjectives && course.learningObjectives.length > 0 && (
              <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-6 sm:p-8 shadow-sm">
                <h2 className="text-base font-bold text-[#171717] mb-4">What you will learn</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {course.learningObjectives.map((obj, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-[#171717]">
                      <CheckCircle size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{obj}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Structured Curriculum */}
            <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#171717]">Course Curriculum</h2>
                  <p className="text-xs text-[#686868] mt-0.5">
                    {course.sections?.length || 0} modules • {course.totalLessons} lessons
                  </p>
                </div>
              </div>

              {(!course.sections || course.sections.length === 0) ? (
                <div className="p-6 text-center text-xs text-[#686868] bg-[#FAFAFA] rounded-xl border border-dashed border-[#E4E4E1]">
                  Curriculum details are being finalized by the instructor.
                </div>
              ) : (
                <div className="space-y-3">
                  {course.sections.map((section, sIdx) => {
                    const isExpanded = Boolean(expandedSections[section._id]);
                    return (
                      <div
                        key={section._id || sIdx}
                        className="border border-[#E4E4E1] rounded-xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection(section._id)}
                          className="w-full px-4 py-3 bg-[#FAFAFA] hover:bg-[#F2F2F0] flex items-center justify-between transition text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-semibold text-[#637D91]">
                              Module {sIdx + 1}
                            </span>
                            <span className="text-xs font-bold text-[#171717]">
                              {section.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[#686868]">
                            <span>{section.lessons ? section.lessons.length : 0} lessons</span>
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="divide-y divide-[#E4E4E1] bg-[#FFFFFF]">
                            {(section.lessons || []).map((lesson, lIdx) => (
                              <div
                                key={lesson._id || lIdx}
                                className="px-4 py-3 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  {lesson.contentType === 'video' ? (
                                    <PlayCircle size={15} className="text-[#637D91] shrink-0" />
                                  ) : lesson.contentType === 'document' ? (
                                    <FileDown size={15} className="text-[#637D91] shrink-0" />
                                  ) : (
                                    <FileText size={15} className="text-[#637D91] shrink-0" />
                                  )}
                                  <span className="font-medium text-[#171717]">{lesson.title}</span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-[#686868]">
                                  <span>{lesson.duration}</span>
                                  {(isEnrolled || hasFullAccess) && (
                                    <Link
                                      to={`/courses/${course.slug}/learn?lesson=${lesson._id}`}
                                      className="text-xs font-semibold text-[#637D91] hover:underline ml-2"
                                    >
                                      Play
                                    </Link>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Prerequisites & Audience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {course.prerequisites && (
                <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider mb-2">
                    Prerequisites
                  </h3>
                  <p className="text-xs text-[#686868] leading-relaxed">
                    {course.prerequisites}
                  </p>
                </div>
              )}

              {course.intendedAudience && (
                <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider mb-2">
                    Intended Audience
                  </h3>
                  <p className="text-xs text-[#686868] leading-relaxed">
                    {course.intendedAudience}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Enrollment Card */}
          <div className="space-y-6">
            <div className="bg-[#FFFFFF] border border-[#E4E4E1] rounded-2xl p-6 shadow-sm sticky top-6">
              <div className="h-44 rounded-xl overflow-hidden bg-[#F2F2F0] mb-5 border border-[#E4E4E1]">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#686868]">
                    <BookOpen size={36} />
                  </div>
                )}
              </div>

              {/* Status & Enrollment CTA */}
              {isEnrolled || hasFullAccess ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                    <UserCheck size={16} className="text-emerald-600" />
                    <span>{isEnrolled ? 'You are enrolled in this track' : 'Full access authorized'}</span>
                  </div>

                  {enrollment && enrollment.completedLessons?.length > 0 && (
                    <div className="text-[11px] text-[#686868] flex justify-between px-1">
                      <span>Completed</span>
                      <span className="font-semibold text-[#171717]">
                        {enrollment.completedLessons.length} lessons
                      </span>
                    </div>
                  )}

                  <Link
                    to={`/courses/${course.slug}/learn`}
                    className="w-full py-3 px-4 rounded-xl bg-[#171717] text-white text-xs font-semibold hover:bg-[#2b2b2b] transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>{isEnrolled ? 'Continue Learning' : 'Launch Workspace'}</span>
                    <PlayCircle size={15} />
                  </Link>

                  <Link
                    to={`/courses/${course.slug}/learn?view=discussions`}
                    className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#E4E4E1] hover:border-[#637D91] text-[#171717] text-xs font-semibold hover:bg-[#F2F2F0] transition flex items-center justify-center gap-2 shadow-xs"
                  >
                    <MessageSquare size={14} className="text-[#637D91]" />
                    <span>Q&A Discussion Forum</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-[#171717]">Free</span>
                    <span className="text-xs text-[#686868]">Full Lifetime Access</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#637D91] hover:bg-[#526879] text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {enrolling ? (
                      <span>Enrolling...</span>
                    ) : isAuthenticated ? (
                      <span>Enroll in Course</span>
                    ) : (
                      <span>Log in to Enroll</span>
                    )}
                  </button>

                  <p className="text-[11px] text-[#686868] text-center leading-relaxed">
                    Immediate access to all lessons, interactive examples, and curriculum materials.
                  </p>
                </div>
              )}

              {/* Course Highlights */}
              <div className="mt-6 pt-6 border-t border-[#E4E4E1] space-y-3 text-xs text-[#686868]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock size={14} /> Duration
                  </span>
                  <span className="font-medium text-[#171717]">{course.estimatedDuration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Layers size={14} /> Total Lessons
                  </span>
                  <span className="font-medium text-[#171717]">{course.totalLessons}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Award size={14} /> Certificate
                  </span>
                  <span className="font-medium text-[#171717]">Included on finish</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
