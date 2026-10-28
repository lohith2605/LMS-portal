import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useNotifications } from '../context/useNotifications';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import MobileNavigation from '../components/dashboard/MobileNavigation';
import NotificationDrawer from '../components/dashboard/NotificationDrawer';
import ChangePasswordModal from '../components/dashboard/ChangePasswordModal';

export default function DashboardLayout({
  title = 'Dashboard',
  subtitle,
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

  const role = user?.role || 'student';

  return (
    <div className="min-h-screen bg-page flex text-primary font-sans antialiased">
      {/* Desktop Sidebar */}
      <DashboardSidebar
        user={user}
        role={role}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        logout={logout}
        onOpenPasswordModal={() => setPasswordModalOpen(true)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          title={title}
          subtitle={subtitle}
          role={role}
          user={user}
          logout={logout}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          unreadCount={unreadCount}
          onOpenPasswordModal={() => setPasswordModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
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
    </div>
  );
}
