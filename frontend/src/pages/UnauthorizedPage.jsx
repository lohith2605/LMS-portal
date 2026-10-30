import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, LogOut, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import AuthLayout from '../layouts/AuthLayout';

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const reason = location.state?.reason;
  const isPending = reason === 'pending' || (user && user.accountStatus === 'pending');

  const authHighlights = [
    {
      icon: ShieldAlert,
      title: 'Role-based access boundaries',
      desc: 'Permissions are strictly enforced on both frontend routes and backend APIs.'
    },
    {
      icon: UserCheck,
      title: 'Current session intact',
      desc: 'Your authenticated session remains active and safe with your assigned privileges.'
    },
    {
      icon: ShieldCheck,
      title: 'Multi-tiered governance',
      desc: 'Students, Instructors, and Administrators maintain independent workspace scopes.'
    }
  ];

  const getDestinationPath = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'instructor') return '/instructor/dashboard';
    return '/student/dashboard';
  };

  return (
    <AuthLayout
      eyebrow="ACCESS CONTROL"
      headline="Protected area boundary."
      description="LearnSpace enforces strict permission boundaries to protect student records, cohort management, and curriculum publishing."
      highlights={authHighlights}
      panelBadge="Security"
      formTitle={isPending ? 'Approval Pending' : 'Access Restricted'}
      formSubtitle={
        isPending
          ? 'Your instructor application is currently under review by our administration team.'
          : 'You do not have the required permissions to access this specific area.'
      }
    >
      <div className="py-2">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl flex items-center justify-center mb-4 shadow-2xs">
          <ShieldAlert size={24} />
        </div>

        <p className="text-xs sm:text-sm text-[#686868] leading-relaxed mb-6">
          {isPending
            ? 'Your instructor profile has been submitted and is currently pending review by a system administrator. You will be granted full access as soon as your credentials are verified.'
            : 'Your current account does not have sufficient clearance to view or interact with this resource. Please navigate to an authorized view or contact support.'}
        </p>

        {user && (
          <div className="mb-6 p-3.5 bg-surface-subtle border border-border-subtle rounded-xl text-left text-xs space-y-1">
            <div className="font-bold text-primary">Current Session Identity:</div>
            <div className="text-secondary">
              Signed in as: <strong className="text-primary">{user.email}</strong>
            </div>
            <div className="text-secondary">
              Role: <span className="capitalize font-semibold text-primary">{user.role}</span>
              {user.accountStatus && (
                <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cobalt-soft text-cobalt border border-cobalt-border">
                  {user.accountStatus}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <Link
            to={getDestinationPath()}
            className="w-full h-11 px-4 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all inline-flex items-center justify-center gap-2"
          >
            <Home size={14} />
            <span>Go to My Dashboard</span>
          </Link>

          <Link
            to="/"
            className="w-full h-11 px-4 rounded-xl bg-surface-subtle text-secondary hover:text-primary border border-border-subtle text-xs font-semibold transition-all inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} />
            <span>Return to Landing Page</span>
          </Link>

          {user && (
            <button
              type="button"
              onClick={logout}
              className="mt-2 text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign out of session</span>
            </button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
