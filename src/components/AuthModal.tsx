import React, { useState } from 'react';
import { Phone, ShieldCheck, X } from 'lucide-react';
import { api, setStoredToken } from '../lib/api';
import type { UserAccount } from '../shared/types';
import { BRAND_NAME, COMPANY_PHONE } from '../shared/constants';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'user' | 'owner';
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'user',
  onClose,
  onSuccess,
}) => {
  const [tab, setTab] = useState<'user' | 'owner'>(initialTab);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    setTab(initialTab);
    setError('');
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.mobileLogin({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        termsAccepted,
      });
      setStoredToken(res.token);
      onSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.ownerLogin({
        mobile: mobile.trim() || '9826045120',
        passcode: passcode.trim(),
      });
      setStoredToken(res.token);
      onSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid Owner credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <h2 id="auth-modal-title" className="font-display text-xl font-bold text-zinc-900">
              {BRAND_NAME}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {tab === 'user'
                ? 'Direct mobile number sign-in — no OTP required'
                : 'Owner & Admin Approval Board Sign-In'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close sign-in dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-1 rounded-lg bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => {
              setTab('user');
              setError('');
            }}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === 'user'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Buyer / Seller Login
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('owner');
              setError('');
            }}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === 'owner'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Owner Backend Login
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        {tab === 'user' ? (
          <form onSubmit={handleUserSubmit} className="mt-5 space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs leading-relaxed text-emerald-950">
              <div className="flex items-center gap-2 font-semibold text-emerald-900">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>Call-Based Verification (No OTP Needed)</span>
              </div>
              <p className="mt-1 text-emerald-900/90">
                Sign in directly using your 10-digit Indian mobile number and name. Our Berasia
                team verifies accounts and listings by direct phone call from {COMPANY_PHONE}.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">
                Full Name (Hindi or English) <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. रामेश्वर शर्मा / Rameshwar Sharma"
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">
                Mobile Number <span className="text-red-600">*</span>
              </label>
              <div className="mt-1.5 flex overflow-hidden rounded-lg border border-zinc-300 focus-within:border-emerald-800">
                <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 font-mono text-sm font-medium text-zinc-700">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  className="w-full bg-white px-3.5 py-2.5 font-mono text-sm text-zinc-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">
                Email <span className="text-xs font-normal text-zinc-500">(Optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
              />
            </div>

            <label className="flex items-start gap-2.5 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-900 focus:ring-emerald-800"
              />
              <span>
                I accept the service & privacy terms of {BRAND_NAME} and consent to verification
                phone calls for my property enquiries or listings.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Continue with Mobile Number'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOwnerSubmit} className="mt-5 space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
              <div className="flex items-center gap-2 font-semibold text-zinc-900">
                <ShieldCheck className="h-4 w-4 text-emerald-800" />
                <span>Owner Approval & Management Access</span>
              </div>
              <p className="mt-1">
                Review incoming Berasia property submissions, view private ownership documents &
                Video 2, call owners/submitters, and approve or reject listings.
              </p>
              <p className="mt-1.5 font-mono text-[11px] text-zinc-600">
                Default Owner Passcode: <strong className="text-zinc-900">BERASIA2026</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">Owner Mobile</label>
              <div className="mt-1.5 flex overflow-hidden rounded-lg border border-zinc-300">
                <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 font-mono text-sm text-zinc-700">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9826045120"
                  className="w-full bg-white px-3.5 py-2.5 font-mono text-sm text-zinc-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">
                Owner Passcode <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter Owner Passcode"
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 font-mono text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Open Owner Backend Board'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
