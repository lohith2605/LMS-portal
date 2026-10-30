import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { authService } from '../../services/api';
import { useAuth } from '../../context/useAuth';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function ProfilePictureModal({ isOpen, onClose }) {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen]);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isUploading && !isRemoving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUploading, isRemoving, onClose]);

  if (!isOpen) return null;

  const currentAvatarUrl = user?.avatar?.url || null;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const validateAndSetFile = (file) => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage('Invalid file format. Please upload a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage('Image size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const handleSave = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await authService.updateProfilePicture(selectedFile);
      if (response && response.user) {
        updateUser(response.user);
        setSuccessMessage('Profile picture updated successfully!');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMessage(
        err.normalizedMessage ||
          err.response?.data?.error ||
          'Failed to upload profile picture. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await authService.deleteProfilePicture();
      if (response && response.user) {
        updateUser(response.user);
        setSelectedFile(null);
        setPreviewUrl(null);
        setSuccessMessage('Profile picture removed. Default avatar restored.');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMessage(
        err.normalizedMessage ||
          err.response?.data?.error ||
          'Failed to remove profile picture.'
      );
    } finally {
      setIsRemoving(false);
    }
  };

  const handleCancel = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage('');
    onClose();
  };

  // Determine which image to show in preview
  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-picture-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading && !isRemoving) {
          handleCancel();
        }
      }}
    >
      <div className="bg-surface border border-border-subtle rounded-3xl shadow-elevated w-full max-w-md overflow-hidden animate-[modalSlideUp_0.2s_ease-out]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-blue-pale text-accent-blue-dark flex items-center justify-center">
              <Camera size={16} strokeWidth={1.75} />
            </div>
            <div>
              <h2
                id="profile-picture-title"
                className="text-sm sm:text-base font-bold text-primary"
              >
                Profile Picture
              </h2>
              <p className="text-[11px] text-secondary">
                Upload a square photo to represent your profile
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isUploading || isRemoving}
            className="p-1.5 rounded-xl text-secondary hover:text-primary hover:bg-surface-subtle transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Feedback Banners */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-[shake_0.2s_ease-in-out]">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-accent-sage-pale border border-[#A8B5A0]/40 text-accent-sage-dark text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Avatar Preview Section */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full ring-4 ring-border-subtle overflow-hidden bg-primary text-white flex items-center justify-center shadow-md relative">
                {displayUrl ? (
                  <img
                    src={displayUrl}
                    alt={user?.name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-extrabold tracking-tight">
                    {initials}
                  </span>
                )}

                {/* Loading overlay */}
                {(isUploading || isRemoving) && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 text-white">
                    <Loader2 size={24} className="animate-spin text-white" />
                    <span className="text-[10px] font-semibold">
                      {isUploading ? 'Uploading...' : 'Removing...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="absolute bottom-1 right-1 p-1.5 rounded-full bg-surface border border-border-subtle shadow-xs">
                {displayUrl ? (
                  <CheckCircle2 size={14} className="text-emerald-600" />
                ) : (
                  <ImageIcon size={14} className="text-secondary" />
                )}
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-primary">{user?.name}</p>
              <p className="text-[11px] text-secondary">
                {selectedFile
                  ? `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)`
                  : currentAvatarUrl
                  ? 'Current custom profile picture'
                  : 'Using default system initials'}
              </p>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-accent bg-accent/5 scale-[1.01]'
                : 'border-border-subtle hover:border-primary/40 bg-surface-subtle/50 hover:bg-surface-subtle'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-secondary group-hover:text-primary transition-colors">
                <UploadCloud size={20} strokeWidth={1.75} />
              </div>
              <p className="text-xs font-semibold text-primary">
                Click to browse or drag and drop photo
              </p>
              <p className="text-[10px] text-secondary">
                Supported formats: JPG, PNG, WebP &bull; Maximum file size: 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-surface-subtle/50 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Remove Option */}
          {currentAvatarUrl && !selectedFile ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isUploading || isRemoving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={13} />
              <span>Remove Photo</span>
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}

          {/* Save / Cancel Options */}
          <div className="w-full sm:w-auto flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isUploading || isRemoving}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border-subtle bg-surface text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-subtle transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedFile || isUploading || isRemoving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
