import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './context/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import StudentDashboard from './pages/StudentDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import CourseDetailsPage from './pages/CourseDetailsPage';
import CoursePlayerPage from './pages/CoursePlayerPage';
import CertificateVerifyPage from './pages/CertificateVerifyPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';

// Cookie Consent System
import CookieConsentBanner from './components/cookie/CookieConsentBanner';
import CookiePreferencesModal from './components/cookie/CookiePreferencesModal';

function DashboardRedirect() {
  const { user, isLoading, isLoggingOut } = useAuth();

  if (isLoggingOut) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role === 'instructor') {
    return <Navigate to="/instructor/dashboard" replace />;
  }

  return <Navigate to="/student/dashboard" replace />;
}

function CourseDiscussionsRedirect() {
  const { idOrSlug, discussionId } = useParams();
  const target = `/courses/${idOrSlug}/learn?view=discussions${
    discussionId ? `&discussionId=${encodeURIComponent(discussionId)}` : ''
  }`;
  return <Navigate to={target} replace />;
}

function CoursesRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === 'instructor') {
      return <Navigate to="/instructor/dashboard?tab=courses" replace />;
    }
    return <Navigate to="/student/dashboard?tab=explore" replace />;
  }

  return <Navigate to="/#courses" replace />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/courses" element={<CoursesRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Course Discovery & Player Pages */}
        <Route path="/courses/:idOrSlug" element={<CourseDetailsPage />} />
        <Route
          path="/courses/:idOrSlug/learn"
          element={
            <ProtectedRoute>
              <CoursePlayerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/:idOrSlug/discussions"
          element={
            <ProtectedRoute>
              <CourseDiscussionsRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/:idOrSlug/discussions/:discussionId"
          element={
            <ProtectedRoute>
              <CourseDiscussionsRedirect />
            </ProtectedRoute>
          }
        />

        {/* Public Certificate Verification */}
        <Route path="/verify/:certificateId" element={<CertificateVerifyPage />} />
        <Route path="/certificates/:certificateId" element={<CertificateVerifyPage />} />
        <Route path="/verify-certificate/:certificateId" element={<CertificateVerifyPage />} />

        {/* Role-Adaptive Dashboard Dispatcher */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* Dedicated Profile Route */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/student/profile" element={<Navigate to="/profile" replace />} />
        <Route path="/instructor/profile" element={<Navigate to="/profile" replace />} />

        {/* Role-Protected Dashboard Views */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/progress"
          element={<Navigate to="/student/dashboard?tab=analytics" replace />}
        />
        <Route
          path="/student/analytics"
          element={<Navigate to="/student/dashboard?tab=analytics" replace />}
        />

        <Route
          path="/instructor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['instructor', 'admin']}>
              <InstructorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Global Cookie Consent Banner & Preferences Modal */}
      <CookieConsentBanner />
      <CookiePreferencesModal />
    </>
  );
}
