import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Mail,
  Key,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Lock,
  Download,
  X,
} from 'lucide-react';
import { mfaService } from '../../services/api';

export default function MfaSettingsCard({ user }) {
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Modal states: null | 'setup_totp' | 'setup_email' | 'recovery_codes' | 'disable' | 'regenerate' | 'switch_method'
  const [activeModal, setActiveModal] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form states for modals
  const [passwordInput, setPasswordInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [targetMethod, setTargetMethod] = useState('totp');

  // TOTP setup data
  const [totpData, setTotpData] = useState(null); // { qrCode, secret, manualEntryKey }
  const [copiedKey, setCopiedKey] = useState(false);

  // Recovery codes display
  const [revealedRecoveryCodes, setRevealedRecoveryCodes] = useState([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Email setup cooldown
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Fetch status on load
  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await mfaService.getStatus();
      setMfaStatus(res.mfa);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.normalizedMessage || 'Failed to load Two-Factor Authentication status.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Email cooldown timer
  useEffect(() => {
    let timer;
    if (emailCooldown > 0) {
      timer = setInterval(() => {
        setEmailCooldown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [emailCooldown]);

  const closeModal = () => {
    setActiveModal(null);
    setModalError(null);
    setPasswordInput('');
    setCodeInput('');
    setTotpData(null);
  };

  // 1. Start TOTP Setup
  const handleStartTotpSetup = async () => {
    try {
      setModalSubmitting(true);
      setModalError(null);
      const res = await mfaService.setupTotp();
      setTotpData(res);
      setActiveModal('setup_totp');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.normalizedMessage || 'Failed to initiate authenticator setup.',
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  // 2. Verify TOTP Setup
  const handleVerifyTotp = async (e) => {
    e.preventDefault();
    if (!codeInput.trim()) {
      setModalError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);
      const res = await mfaService.verifyTotp(codeInput.trim());

      setRevealedRecoveryCodes(res.recoveryCodes || []);
      await loadStatus();
      setActiveModal('recovery_codes');
      setFeedback({
        type: 'success',
        message: 'Google Authenticator has been successfully verified and activated.',
      });
    } catch (err) {
      setModalError(err.normalizedMessage || 'Invalid verification code.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // 3. Start Email OTP Setup
  const handleStartEmailSetup = async () => {
    try {
      setModalSubmitting(true);
      setModalError(null);
      await mfaService.setupEmailOtp();
      setEmailCooldown(60);
      setActiveModal('setup_email');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.normalizedMessage || 'Failed to send email verification code.',
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  // 4. Verify Email OTP Setup
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (!codeInput.trim()) {
      setModalError('Please enter the 6-digit email verification code.');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);
      const res = await mfaService.verifyEmailOtp(codeInput.trim());

      if (res.recoveryCodes && res.recoveryCodes.length > 0) {
        setRevealedRecoveryCodes(res.recoveryCodes);
        setActiveModal('recovery_codes');
      } else {
        closeModal();
      }

      await loadStatus();
      setFeedback({
        type: 'success',
        message: 'Email Two-Factor Authentication activated successfully.',
      });
    } catch (err) {
      setModalError(err.normalizedMessage || 'Invalid email verification code.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // 5. Resend Email Setup Code
  const handleResendSetupEmail = async () => {
    if (emailCooldown > 0) return;
    try {
      setModalSubmitting(true);
      setModalError(null);
      await mfaService.setupEmailOtp();
      setEmailCooldown(60);
      setFeedback({ type: 'success', message: 'A fresh verification code has been dispatched to your email.' });
    } catch (err) {
      setModalError(err.normalizedMessage || 'Failed to resend email code.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // 6. Switch Preferred Method
  const handleSwitchPreference = async (e) => {
    e.preventDefault();
    if (!passwordInput) {
      setModalError('Current password is required to update security preferences.');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);
      await mfaService.updatePreference({
        preferredMethod: targetMethod,
        password: passwordInput,
      });

      await loadStatus();
      closeModal();
      setFeedback({
        type: 'success',
        message: `Preferred verification method changed to ${
          targetMethod === 'totp' ? 'Google Authenticator' : 'Email OTP'
        }.`,
      });
    } catch (err) {
      setModalError(err.normalizedMessage || 'Failed to update preferred method.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // 7. Regenerate Recovery Codes
  const handleRegenerateCodes = async (e) => {
    e.preventDefault();
    if (!passwordInput) {
      setModalError('Current password is required to generate new recovery codes.');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);
      const res = await mfaService.regenerateRecoveryCodes(passwordInput);

      setRevealedRecoveryCodes(res.recoveryCodes || []);
      await loadStatus();
      setActiveModal('recovery_codes');
      setFeedback({
        type: 'success',
        message: 'New backup recovery codes generated. Previous codes have been invalidated.',
      });
    } catch (err) {
      setModalError(err.normalizedMessage || 'Failed to regenerate recovery codes.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // 8. Disable MFA
  const handleDisableMfa = async (e) => {
    e.preventDefault();
    if (!passwordInput) {
      setModalError('Current password is required to disable two-factor authentication.');
      return;
    }
    if (!codeInput) {
      setModalError('A verification code or backup recovery code is required.');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);
      await mfaService.disableMfa({
        password: passwordInput,
        code: codeInput.trim(),
      });

      await loadStatus();
      closeModal();
      setFeedback({
        type: 'success',
        message: 'Two-Factor Authentication has been disabled for your account.',
      });
    } catch (err) {
      setModalError(err.normalizedMessage || 'Failed to disable two-factor authentication.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Copy helpers
  const handleCopyKey = () => {
    if (totpData?.secret) {
      navigator.clipboard.writeText(totpData.secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyRecoveryCodes = () => {
    if (revealedRecoveryCodes.length > 0) {
      navigator.clipboard.writeText(revealedRecoveryCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const handleDownloadCodes = () => {
    if (revealedRecoveryCodes.length > 0) {
      const content = `LearnSpace LMS — Two-Factor Recovery Codes\nUser: ${user?.email}\nGenerated: ${new Date().toISOString()}\n\nStore these single-use codes safely:\n\n${revealedRecoveryCodes.join(
        '\n'
      )}\n\nEach code can only be used once.`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `learnspace-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs flex items-center justify-center min-h-[220px]">
        <div className="flex items-center gap-2.5 text-xs text-secondary">
          <div className="w-4 h-4 border-2 border-cobalt/30 border-t-cobalt rounded-full animate-spin" />
          <span>Loading Two-Factor Authentication status...</span>
        </div>
      </div>
    );
  }

  const isEnabled = Boolean(mfaStatus?.enabled || (isAdmin && mfaStatus?.totpConfigured));
  const isEnforced = Boolean(mfaStatus?.enforced || isAdmin);
  const preferredMethod = mfaStatus?.preferredMethod || 'totp';
  const remainingCodes = mfaStatus?.recoveryCodesRemaining || 0;

  return (
    <div className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-subtle">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-subtle text-tertiary'
            }`}
          >
            {isEnabled ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-primary">Two-Factor Authentication (2FA)</h2>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isEnabled ? 'Enabled' : 'Disabled'}
              </span>
              {isEnforced && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Enforced Policy
                </span>
              )}
            </div>
            <p className="text-xs text-secondary mt-1 leading-relaxed">
              {isAdmin
                ? 'Mandatory TOTP authentication via Google Authenticator protects platform stewardship and governance operations.'
                : 'Add an extra layer of defense by requiring an authenticator code or email OTP when logging into your account.'}
            </p>
          </div>
        </div>

        {/* Action Button for Non-MFA users */}
        {!isEnabled && !isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleStartTotpSetup}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cobalt hover:bg-cobalt-hover text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Smartphone size={14} />
              <span>Setup Authenticator</span>
            </button>
            <button
              type="button"
              onClick={handleStartEmailSetup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle text-primary text-xs font-semibold transition-all cursor-pointer"
            >
              <Mail size={14} />
              <span>Use Email OTP</span>
            </button>
          </div>
        )}
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-[modalFadeIn_180ms_ease-out] ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 leading-snug">{feedback.message}</div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-tertiary hover:text-primary transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Enabled Configuration Details */}
      {isEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Method Card */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                Primary Factor Method
              </span>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetMethod(preferredMethod === 'totp' ? 'email_otp' : 'totp');
                    setActiveModal('switch_method');
                  }}
                  className="text-xs text-cobalt hover:underline font-semibold cursor-pointer"
                >
                  Switch Method
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-surface border border-border-subtle text-cobalt">
                {preferredMethod === 'totp' ? <Smartphone size={20} /> : <Mail size={20} />}
              </div>
              <div>
                <div className="text-sm font-bold text-primary">
                  {preferredMethod === 'totp' ? 'Google Authenticator (TOTP)' : 'Email Verification Code (OTP)'}
                </div>
                <div className="text-xs text-secondary mt-0.5">
                  {preferredMethod === 'totp'
                    ? '30-second rotating numerical codes'
                    : `Dispatched to ${user?.email}`}
                </div>
              </div>
            </div>

            {/* Re-link option */}
            <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
              <span className="text-secondary">Authenticator app</span>
              <button
                type="button"
                onClick={handleStartTotpSetup}
                className="text-cobalt hover:underline font-medium cursor-pointer"
              >
                Re-link or change device
              </button>
            </div>
          </div>

          {/* Backup Recovery Codes Card */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                Backup Recovery Codes
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface border border-border-subtle text-primary">
                {remainingCodes} of 8 remaining
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-surface border border-border-subtle text-amber-600">
                <Key size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-primary">Emergency Account Access</div>
                <div className="text-xs text-secondary mt-0.5">
                  Single-use codes for access when your primary device is unavailable
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
              <span className="text-secondary">Need new codes?</span>
              <button
                type="button"
                onClick={() => setActiveModal('regenerate')}
                className="text-cobalt hover:underline font-semibold cursor-pointer"
              >
                Generate fresh codes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Action (Students & Instructors only) */}
      {isEnabled && !isAdmin && (
        <div className="pt-2 flex items-center justify-between text-xs border-t border-border-subtle">
          <span className="text-secondary">Want to turn off two-factor authentication?</span>
          <button
            type="button"
            onClick={() => setActiveModal('disable')}
            className="text-red-600 hover:text-red-700 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
          >
            <Trash2 size={13} />
            <span>Disable 2FA</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TOTP SETUP / RE-LINK MODAL */}
      {/* ========================================================================= */}
      {activeModal === 'setup_totp' && totpData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-subtle animate-[modalFadeIn_180ms_ease-out] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-cobalt" />
                <h3 className="text-base font-bold text-primary">Configure Google Authenticator</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-tertiary hover:text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <p className="text-xs text-secondary leading-relaxed">
              1. Open <strong>Google Authenticator</strong>, <strong>Authy</strong>, or your preferred authenticator app.
              <br />
              2. Scan the QR code below or enter the manual key.
            </p>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-3 bg-surface-subtle border border-border-subtle rounded-xl">
              <img
                src={totpData.qrCode}
                alt="Authenticator QR Code"
                className="w-40 h-40 rounded-lg shadow-2xs"
              />
            </div>

            {/* Manual Entry Key */}
            <div className="p-3 bg-surface-subtle border border-border-subtle rounded-xl text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-secondary">Manual Setup Key</span>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="text-cobalt hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                >
                  {copiedKey ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-xs text-primary font-bold tracking-wider select-all break-all">
                {totpData.secret}
              </div>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleVerifyTotp} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  3. Enter 6-digit confirmation code from app
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full h-11 px-3.5 rounded-xl border border-border-subtle bg-surface-subtle text-center font-mono text-base font-bold tracking-widest text-primary focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-secondary hover:bg-surface-subtle transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || codeInput.length < 6}
                  className="px-5 py-2 rounded-xl bg-cobalt hover:bg-cobalt-hover text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? 'Verifying...' : 'Verify & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EMAIL OTP SETUP */}
      {/* ========================================================================= */}
      {activeModal === 'setup_email' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-subtle animate-[modalFadeIn_180ms_ease-out] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-cobalt" />
                <h3 className="text-base font-bold text-primary">Enable Email Two-Factor</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-tertiary hover:text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <p className="text-xs text-secondary leading-relaxed">
              We sent a 6-digit confirmation code to <strong>{user?.email}</strong>. Enter it below to activate Email OTP.
            </p>

            <form onSubmit={handleVerifyEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full h-11 px-3.5 rounded-xl border border-border-subtle bg-surface-subtle text-center font-mono text-base font-bold tracking-widest text-primary focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleResendSetupEmail}
                  disabled={emailCooldown > 0 || modalSubmitting}
                  className="text-cobalt hover:underline font-medium disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  <span>{emailCooldown > 0 ? `Resend code in ${emailCooldown}s` : 'Resend code'}</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-secondary hover:bg-surface-subtle transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || codeInput.length < 6}
                  className="px-5 py-2 rounded-xl bg-cobalt hover:bg-cobalt-hover text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REVEAL RECOVERY CODES */}
      {/* ========================================================================= */}
      {activeModal === 'recovery_codes' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-subtle animate-[modalFadeIn_180ms_ease-out] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-amber-600" />
                <h3 className="text-base font-bold text-primary">Your Backup Recovery Codes</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-tertiary hover:text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <strong>Save these codes safely:</strong> Each 10-character code can be used once to access your account if you lose your phone or access to your email.
            </div>

            <div className="p-4 bg-surface-subtle border border-border-subtle rounded-xl">
              <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs font-bold text-primary select-all">
                {revealedRecoveryCodes.map((c, idx) => (
                  <div key={idx} className="p-2 bg-surface border border-border-subtle rounded-lg">
                    {c}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={handleCopyRecoveryCodes}
                  className="text-cobalt hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
                >
                  {copiedCodes ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                  <span>{copiedCodes ? 'Copied' : 'Copy codes'}</span>
                </button>
                <span className="text-tertiary">•</span>
                <button
                  type="button"
                  onClick={handleDownloadCodes}
                  className="text-cobalt hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Download size={13} />
                  <span>Download .txt</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className="w-full py-2.5 rounded-xl bg-cobalt hover:bg-cobalt-hover text-white text-xs font-semibold transition-all cursor-pointer"
            >
              I have saved these codes
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: REGENERATE RECOVERY CODES PROMPT */}
      {/* ========================================================================= */}
      {activeModal === 'regenerate' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-subtle animate-[modalFadeIn_180ms_ease-out] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-cobalt" />
                <h3 className="text-base font-bold text-primary">Regenerate Recovery Codes</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-tertiary hover:text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <p className="text-xs text-secondary leading-relaxed">
              Generating new recovery codes will immediately invalidate any previous codes. Please enter your account password to confirm.
            </p>

            <form onSubmit={handleRegenerateCodes} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Account Password
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-11 px-3.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-secondary hover:bg-surface-subtle transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || !passwordInput}
                  className="px-5 py-2 rounded-xl bg-cobalt hover:bg-cobalt-hover text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? 'Generating...' : 'Generate New Codes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SWITCH PREFERRED METHOD */}
      {/* ========================================================================= */}
      {activeModal === 'switch_method' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-subtle animate-[modalFadeIn_180ms_ease-out] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-cobalt" />
                <h3 className="text-base font-bold text-primary">Switch Preferred 2FA Method</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-tertiary hover:text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <p className="text-xs text-secondary leading-relaxed">
              Switching your default method to{' '}
              <strong>{targetMethod === 'totp' ? 'Google Authenticator' : 'Email OTP'}</strong> requires entering your account password.
            </p>

            <form onSubmit={handleSwitchPreference} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Account Password
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-11 px-3.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-secondary hover:bg-surface-subtle transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || !passwordInput}
                  className="px-5 py-2 rounded-xl bg-cobalt hover:bg-cobalt-hover text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? 'Updating...' : 'Confirm Switch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: DISABLE MFA PROMPT */}
      {/* ========================================================================= */}
      {activeModal === 'disable' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-subtle animate-[modalFadeIn_180ms_ease-out] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Trash2 size={18} className="text-red-600" />
                <h3 className="text-base font-bold text-primary">Disable Two-Factor Authentication</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-tertiary hover:text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-800 leading-relaxed">
              Disabling Two-Factor Authentication removes the second layer of defense on your account. To proceed, please confirm your identity below.
            </div>

            <form onSubmit={handleDisableMfa} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Account Password
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-11 px-3.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Authenticator Code or Backup Recovery Code
                </label>
                <input
                  type="text"
                  required
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="000000 or XXXXX-XXXXX"
                  className="w-full h-11 px-3.5 rounded-xl border border-border-subtle bg-surface-subtle font-mono text-sm text-primary focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-secondary hover:bg-surface-subtle transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || !passwordInput || !codeInput}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? 'Disabling...' : 'Confirm Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

