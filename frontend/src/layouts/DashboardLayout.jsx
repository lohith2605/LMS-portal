import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { useNotifications } from '../context/useNotifications';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import MobileNavigation from '../components/dashboard/MobileNavigation';
import NotificationDrawer from '../components/dashboard/NotificationDrawer';
import ChangePasswordModal from '../components/dashboard/ChangePasswordModal';
import ProfilePictureModal from '../components/profile/ProfilePictureModal';

export default function DashboardLayout({
  activeTab = 'overview',
  onSelectTab = () => {},
  announcements = [],
  children,
}) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  // Desktop sidebar collapsed state with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('learnspace_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Track responsive screen width for accessible aria roles
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (isDesktop) {
          setSidebarCollapsed((prev) => {
            const next = !prev;
            try {
              localStorage.setItem('learnspace_sidebar_collapsed', String(next));
            } catch {
              // Ignore storage write errors (e.g. private browsing)
            }
            return next;
          });
        } else {
          setMobileNavOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop]);

  const handleToggleSidebar = () => {
    if (isDesktop) {
      setSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('learnspace_sidebar_collapsed', String(next));
        } catch {
          // Ignore storage write errors
        }
        return next;
      });
    } else {
      setMobileNavOpen(true);
    }
  };

  const role = user?.role || 'student';

  return (
    <div className="min-h-screen bg-page flex text-primary font-sans antialiased">
      {/* Desktop Sidebar */}
      <DashboardSidebar
        id="dashboard-sidebar"
        user={user}
        role={role}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        logout={logout}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onOpenPasswordModal={() => setPasswordModalOpen(true)}
        onOpenAvatarModal={() => setAvatarModalOpen(true)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <DashboardHeader
          user={user}
          logout={logout}
          isCollapsed={sidebarCollapsed}
          isDesktop={isDesktop}
          onToggleSidebar={handleToggleSidebar}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          unreadCount={unreadCount}
          onOpenPasswordModal={() => setPasswordModalOpen(true)}
          onOpenAvatarModal={() => setAvatarModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto transition-all duration-300">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      <MobileNavigation
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        user={user}
        role={role}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        logout={logout}
        onOpenPasswordModal={() => setPasswordModalOpen(true)}
        onOpenAvatarModal={() => setAvatarModalOpen(true)}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        announcements={announcements}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />

      {/* Profile Picture Modal */}
      <ProfilePictureModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
      />
    </div>
  );
}
