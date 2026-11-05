import React, { useState, useEffect, useCallback } from 'react';
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
  Star,
  AlertCircle,
} from 'lucide-react';
import { courseService, paymentService } from '../services/api';
import { useAuth } from '../context/useAuth';
import CourseReviewsSection from '../components/reviews/CourseReviewsSection';
import ThemeToggle from '../components/ThemeToggle';

export default function CourseDetailsPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const catalogTarget = isAuthenticated
    ? user?.role === 'instructor'
      ? '/instructor/dashboard?tab=courses'
      : user?.role === 'admin'
      ? '/admin/dashboard'
      : '/student/dashboard?tab=explore'
    : '/courses';

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

  const handleSummaryChange = useCallback((newSummary) => {
    if (!newSummary) return;
    setCourse((prev) => (prev ? { ...prev, ratingSummary: newSummary } : prev));
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.getElementById('razorpay-checkout-js');
      if (existingScript) {
        existingScript.onload = () => resolve(true);
        existingScript.onerror = () => resolve(false);
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
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

    const price = Number(course?.price || 0);

    // Free course enrollment flow
    if (price <= 0) {
      try {
        setEnrolling(true);
        setError(null);
        setEnrollSuccessMessage(null);
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
      return;
    }

    // Paid course checkout flow with Razorpay
    try {
      setEnrolling(true);
      setError(null);
      setEnrollSuccessMessage(null);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Could not load Razorpay payment gateway. Please check your network connection.');
      }

      // Step 1: Request order creation from server using database price
      const orderData = await paymentService.createOrder(course._id);

      // Step 2: Open Razorpay checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'LearnSpace LMS',
        description: course.title,
        image: course.thumbnail || undefined,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            setEnrolling(true);
            setEnrollSuccessMessage('Verifying payment and confirming enrollment...');
            // Step 3: Verify signature securely on backend
            const verifyRes = await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId: course._id,
            });

            setIsEnrolled(true);
            setHasFullAccess(true);
            setEnrollment(verifyRes.enrollment);
            setEnrollSuccessMessage(verifyRes.message || 'Payment confirmed! Course access unlocked.');
          } catch (verifyErr) {
            setError(verifyErr.normalizedMessage || 'Payment verification failed. Please contact support.');
            setEnrollSuccessMessage(null);
          } finally {
            setEnrolling(false);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#1E3A8A', // Cobalt Blue
        },
        modal: {
          ondismiss: function () {
            setEnrolling(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setEnrolling(false);
        setError(resp.error?.description || 'Payment was declined or failed.');
      });
      rzp.open();
    } catch (err) {
      setEnrolling(false);
      setError(err.normalizedMessage || err.message || 'Failed to initiate checkout.');
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
      <div className="min-h-screen bg-page py-16 px-4 flex items-center justify-center">
        <div className="bg-surface border border-border-subtle rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={24} />
          </div>
          <h2 className="text-lg font-bold text-primary mb-2">Course Unavailable</h2>
          <p className="text-xs text-secondary mb-6 leading-relaxed">
            {error || 'This course could not be located in our catalog.'}
          </p>
          <Link
            to={catalogTarget}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition"
          >
            <ArrowLeft size={14} />
            <span>Return to Course Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-primary pb-20">
      {/* Top Breadcrumb Nav */}
      <div className="bg-surface border-b border-border-subtle py-3.5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to={catalogTarget}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-primary transition"
          >
            <ArrowLeft size={14} />
            <span>Back to Catalog</span>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link
                to={
                  user?.role === 'student'
                    ? '/student/dashboard'
                    : user?.role === 'instructor'
                    ? '/instructor/dashboard'
                    : '/admin/dashboard'
                }
                className="font-medium text-accent hover:underline"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to={`/login?redirect=/courses/${course.slug}`}
                className="font-semibold text-primary hover:underline"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <section className="bg-surface border-b border-border-subtle pt-8 pb-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-blue/10 text-accent-blue-dark border border-accent-blue/20">
              {course.category}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-subtle text-secondary border border-border-subtle">
              {course.level}
            </span>
            {course.status !== 'published' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                {course.status.replace('_', ' ')}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary leading-tight mb-3">
            {course.title}
          </h1>

          <p className="text-sm text-secondary max-w-3xl leading-relaxed mb-6">
            {course.summary}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-xs text-secondary">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs uppercase">
                {course.instructor?.name ? course.instructor.name.charAt(0) : 'I'}
              </div>
              <span className="font-semibold text-primary">{course.instructor?.name || 'Instructor'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-secondary" />
              <span>{course.estimatedDuration}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-secondary" />
              <span>{course.totalLessons} lessons</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Globe size={14} className="text-secondary" />
              <span>{course.language}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Star size={14} className={course.ratingSummary && course.ratingSummary.totalReviews > 0 ? "fill-amber-400 text-amber-400" : "text-tertiary"} />
              {course.ratingSummary && course.ratingSummary.totalReviews > 0 ? (
                <span>
                  <strong className="text-primary">{course.ratingSummary.averageRating.toFixed(1)}</strong>
                  <span className="text-secondary ml-1">({course.ratingSummary.totalReviews} {course.ratingSummary.totalReviews === 1 ? 'review' : 'reviews'})</span>
                </span>
              ) : (
                <span className="text-secondary">New (Unrated)</span>
              )}
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
            <div className="bg-surface border border-border-subtle rounded-2xl p-4 sm:p-8 shadow-sm">
              <h2 className="text-base font-bold text-primary mb-3">About this Course</h2>
              <div className="text-xs sm:text-sm text-secondary leading-relaxed whitespace-pre-line">
                {course.description}
              </div>
            </div>

            {/* What you will learn */}
            {course.learningObjectives && course.learningObjectives.length > 0 && (
              <div className="bg-surface border border-border-subtle rounded-2xl p-4 sm:p-8 shadow-sm">
                <h2 className="text-base font-bold text-primary mb-4">What you will learn</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {course.learningObjectives.map((obj, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-primary">
                      <CheckCircle size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{obj}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Structured Curriculum */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-4 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-primary">Course Curriculum</h2>
                  <p className="text-xs text-secondary mt-0.5">
                    {course.sections?.length || 0} modules • {course.totalLessons} lessons
                  </p>
                </div>
              </div>

              {(!course.sections || course.sections.length === 0) ? (
                <div className="p-6 text-center text-xs text-secondary bg-surface-subtle rounded-xl border border-dashed border-border-subtle">
                  Curriculum details are being finalized by the instructor.
                </div>
              ) : (
                <div className="space-y-3">
                  {course.sections.map((section, sIdx) => {
                    const isExpanded = Boolean(expandedSections[section._id]);
                    return (
                      <div
                        key={section._id || sIdx}
                        className="border border-border-subtle rounded-xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection(section._id)}
                          className="w-full px-4 py-3 bg-surface-subtle hover:bg-page flex items-center justify-between transition text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-semibold text-accent-blue-dark">
                              Module {sIdx + 1}
                            </span>
                            <span className="text-xs font-bold text-primary">
                              {section.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-secondary">
                            <span>{section.lessons ? section.lessons.length : 0} lessons</span>
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="divide-y divide-border-subtle bg-surface">
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
                <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                    Prerequisites
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    {course.prerequisites}
                  </p>
                </div>
              )}

              {course.intendedAudience && (
                <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                    Intended Audience
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    {course.intendedAudience}
                  </p>
                </div>
              )}
            </div>

            {/* Course Ratings & Reviews Section */}
            <CourseReviewsSection
              courseIdOrSlug={idOrSlug}
              isEnrolled={isEnrolled}
              user={user}
              onSummaryChange={handleSummaryChange}
            />
          </div>

          {/* Right Column: Enrollment Card */}
          <div className="space-y-6">
            <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm lg:sticky lg:top-6">
              <div className="h-44 rounded-xl overflow-hidden bg-surface-subtle mb-5 border border-border-subtle">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-secondary">
                    <BookOpen size={36} />
                  </div>
                )}
              </div>

              {/* Feedback messages */}
              {enrollSuccessMessage && (
                <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{enrollSuccessMessage}</span>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="leading-relaxed font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Status & Enrollment CTA */}
              {isEnrolled || hasFullAccess ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                    <UserCheck size={16} className="text-emerald-600" />
                    <span>{isEnrolled ? 'You are enrolled in this track' : 'Full access authorized'}</span>
                  </div>

                  {enrollment && enrollment.completedLessons?.length > 0 && (
                    <div className="text-[11px] text-secondary flex justify-between px-1">
                      <span>Completed</span>
                      <span className="font-semibold text-primary">
                        {enrollment.completedLessons.length} lessons
                      </span>
                    </div>
                  )}

                  <Link
                    to={`/courses/${course.slug}/learn`}
                    className="w-full py-3 px-4 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-neutral-800 transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>{isEnrolled ? 'Continue Learning' : 'Launch Workspace'}</span>
                    <PlayCircle size={15} />
                  </Link>

                  <Link
                    to={`/courses/${course.slug}/learn?view=discussions`}
                    className="w-full py-2.5 px-4 rounded-xl bg-surface border border-border-subtle hover:border-accent text-primary text-xs font-semibold hover:bg-surface-subtle transition flex items-center justify-center gap-2 shadow-xs"
                  >
                    <MessageSquare size={14} className="text-accent-blue" />
                    <span>Q&A Discussion Forum</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      {Number(course.price || 0) > 0 ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-primary tracking-tight">
                            ₹{Number(course.price).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">INR</span>
                        </div>
                      ) : (
                        <span className="text-2xl font-extrabold text-primary">Free</span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-secondary px-2 py-0.5 rounded-full bg-surface-subtle border border-border-subtle">
                      {Number(course.price || 0) > 0 ? 'Paid Course' : 'Free Lifetime Access'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full py-3.5 px-4 rounded-xl bg-cobalt hover:bg-cobalt-hover active:bg-cobalt-pressed text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm shadow-cobalt/20 disabled:opacity-50 cursor-pointer"
                  >
                    {enrolling ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing...</span>
                      </span>
                    ) : !isAuthenticated ? (
                      <span>Log in to {Number(course.price || 0) > 0 ? 'Enroll' : 'Enroll Free'}</span>
                    ) : Number(course.price || 0) > 0 ? (
                      <span>Buy Course • ₹{Number(course.price).toLocaleString('en-IN')}</span>
                    ) : (
                      <span>Enroll in Course (Free)</span>
                    )}
                  </button>

                  <p className="text-[11px] text-secondary text-center leading-relaxed">
                    Immediate access to all lessons, interactive examples, and curriculum materials.
                  </p>
                </div>
              )}

              {/* Course Highlights */}
              <div className="mt-6 pt-6 border-t border-border-subtle space-y-3 text-xs text-secondary">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock size={14} /> Duration
                  </span>
                  <span className="font-medium text-primary">{course.estimatedDuration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Layers size={14} /> Total Lessons
                  </span>
                  <span className="font-medium text-primary">{course.totalLessons}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Award size={14} /> Certificate
                  </span>
                  <span className="font-medium text-primary">Included on finish</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Star size={14} className={course.ratingSummary && course.ratingSummary.totalReviews > 0 ? "fill-amber-400 text-amber-400" : "text-tertiary"} /> Rating
                  </span>
                  <span className="font-medium text-primary">
                    {course.ratingSummary && course.ratingSummary.totalReviews > 0
                      ? `${course.ratingSummary.averageRating.toFixed(1)} / 5.0 (${course.ratingSummary.totalReviews})`
                      : 'New'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
