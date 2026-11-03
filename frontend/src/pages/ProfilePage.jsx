import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import DashboardLayout from '../layouts/DashboardLayout';
import ProfileView from '../components/profile/ProfileView';
import ProfileEditModal from '../components/profile/ProfileEditModal';
import ProfilePictureModal from '../components/profile/ProfilePictureModal';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [editModalOpen, setEditModalOpen] = useState(() => searchParams.get('edit') === 'true');
  const [editField, setEditField] = useState(() => searchParams.get('field') || 'headline');
  const [avatarModalOpen, setAvatarModalOpen] = useState(() => searchParams.get('avatar') === 'true');

  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setEditField(searchParams.get('field') || 'headline');
      setEditModalOpen(true);
    }
    if (searchParams.get('avatar') === 'true') {
      setAvatarModalOpen(true);
    }
  }, [searchParams]);

  const handleOpenEdit = (field = 'headline') => {
    setEditField(field);
    setEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setEditModalOpen(false);
    if (searchParams.get('edit')) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('edit');
        next.delete('field');
        return next;
      });
    }
  };

  const handleCloseAvatar = () => {
    setAvatarModalOpen(false);
    if (searchParams.get('avatar')) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('avatar');
        return next;
      });
    }
  };

  const handleSelectTab = (tabId) => {
    if (tabId === 'profile') return;
    const dest =
      user?.role === 'instructor'
        ? `/instructor/dashboard?tab=${tabId}`
        : user?.role === 'admin'
        ? `/admin/dashboard?tab=${tabId}`
        : `/student/dashboard?tab=${tabId}`;
    navigate(dest);
  };

  return (
    <DashboardLayout
      activeTab="profile"
      onSelectTab={handleSelectTab}
      onOpenProfileModal={handleOpenEdit}
    >
      <ProfileView
        user={user}
        onOpenEditProfile={handleOpenEdit}
        onOpenAvatarModal={() => setAvatarModalOpen(true)}
      />

      <ProfileEditModal
        isOpen={editModalOpen}
        onClose={handleCloseEdit}
        initialField={editField}
        onOpenAvatarModal={() => setAvatarModalOpen(true)}
      />

      <ProfilePictureModal
        isOpen={avatarModalOpen}
        onClose={handleCloseAvatar}
      />
    </DashboardLayout>
  );
}

