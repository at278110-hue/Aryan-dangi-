import React, { useState } from 'react';
import { Bell, Edit3, EyeOff, Phone, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import {
  CATEGORY_LABELS,
  COMPANY_PHONE,
  formatAreaUnitLabel,
  formatINR,
  USER_UNLIST_REASONS,
} from '../shared/constants';
import type {
  ListingRecord,
  NotificationItem,
  PublicListingView,
  UnlistReason,
  UserAccount,
} from '../shared/types';

interface MyActivityViewProps {
  currentUser: UserAccount | null;
  myListings: ListingRecord[];
  notifications: NotificationItem[];
  interestedListings: PublicListingView[];
  onRequireSignIn: () => void;
  onEditListing: (listing: ListingRecord) => void;
  onRefresh: () => Promise<void>;
  onSelectPublicListing: (listing: PublicListingView) => void;
}

export const MyActivityView: React.FC<MyActivityViewProps> = ({
  currentUser,
  myListings,
  notifications,
  interestedListings,
  onRequireSignIn,
  onEditListing,
  onRefresh,
  onSelectPublicListing,
}) => {
  const [unlistTarget, setUnlistTarget] = useState<ListingRecord | null>(null);
  const [unlistReason, setUnlistReason] = useState<UnlistReason>('Sold');
  const [unlistNote, setUnlistNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h2 className="font-display text-xl font-bold text-zinc-900">
          Your Submissions & Enquiries
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Sign in with your 10-digit mobile number (no OTP required) to track property approval
          status, edit or unlist your listings, and view registered interests.
        </p>
        <button
          type="button"
          onClick={onRequireSignIn}
          className="mt-5 rounded-lg bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Sign In with Mobile Number
        </button>
      </div>
    );
  }

  const handleUnlistConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlistTarget) return;
    setError('');
    setBusyId(unlistTarget.id);
    try {
      await api.unlistListing(unlistTarget.id, unlistReason, unlistNote.trim());
      setUnlistTarget(null);
      setUnlistNote('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to unlist');
    } finally {
      setBusyId(null);
    }
  };

  const handleRelist = async (listing: ListingRecord) => {
    setError('');
    setBusyId(listing.id);
    try {
      await api.relistListing(listing.id);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request relisting');
    } finally {
      setBusyId(null);
    }
  };

  const statusText: Record<ListingRecord['status'], string> = {
    draft: 'Private Draft (Not sent to Owner)',
    pending_review: 'Pending Owner Approval (Hidden from Public)',
    live: 'Live on Public Website',
    rejected: 'Rejected / Removed by Owner',
    unlisted: 'Unlisted (Removed from Public)',
  };

  const statusColor: Record<ListingRecord['status'], string> = {
    draft: 'text-zinc-600',
    pending_review: 'text-amber-800',
    live: 'text-emerald-800',
    rejected: 'text-red-700',
    unlisted: 'text-zinc-600',
  };

  return (
    <div className="space-y-8">
      {/* Account Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <div className="text-xs font-medium text-zinc-500">Signed-in Mobile Account</div>
          <h2 className="mt-0.5 font-display text-xl font-bold text-zinc-900">
            {currentUser.name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-600">
            <span className="font-mono">+91 {currentUser.mobile}</span>
            <span aria-hidden="true">·</span>
            {currentUser.callVerified ? (
              <span className="flex items-center gap-1 font-medium text-emerald-800">
                <ShieldCheck className="h-4 w-4" />
                Call Verified by Berasia Property Adda
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-amber-800">
                <Phone className="h-4 w-4" />
                Verification Call Scheduled from {COMPANY_PHONE}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Owner Decision Notifications */}
      {notifications.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-2 font-display text-base font-semibold text-zinc-900">
            <Bell className="h-4 w-4 text-emerald-900" />
            <span>Owner Updates & Notifications</span>
          </div>
          <div className="mt-4 divide-y divide-zinc-100">
            {notifications.map((n) => (
              <div key={n.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-900">{n.title}</span>
                  <span className="font-mono text-xs text-zinc-500">
                    {new Date(n.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">{n.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My Submitted Listings */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h3 className="font-display text-lg font-bold text-zinc-900">
          My Property Submissions ({myListings.length})
        </h3>
        <p className="mt-1 text-xs text-zinc-600">
          Submitted properties remain private until approved by the Berasia Property Adda Owner.
          Editing a live property creates a new review candidate while keeping your approved version
          live, or you can unlist immediately.
        </p>

        {myListings.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600">
            You have not submitted any properties yet.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {myListings.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-200 bg-[#FAF9F6] p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-zinc-900">{item.publicId}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-zinc-600">
                      {item.workflow === 'sale' ? 'Sale' : 'Rent'} ·{' '}
                      {CATEGORY_LABELS[item.data.category]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className={`font-semibold ${statusColor[item.status]}`}>
                      {statusText[item.status]}
                    </span>
                  </div>

                  <div className="font-display text-base font-semibold text-zinc-900">
                    {item.data.title || 'Untitled Draft'}
                  </div>

                  <div className="text-xs text-zinc-600">
                    {item.data.localityName} ·{' '}
                    <span className="font-mono">
                      {item.data.areaValue} {formatAreaUnitLabel(item.data.areaUnit)}
                    </span>{' '}
                    · <span className="font-mono font-semibold">{formatINR(item.data.priceAmount)}</span>
                  </div>

                  {item.pendingEdit && (
                    <div className="text-xs font-medium text-amber-800">
                      Pending edit submitted on{' '}
                      {new Date(item.pendingEdit.submittedAt).toLocaleDateString('en-IN')} —
                      awaiting Owner approval.
                    </div>
                  )}

                  {item.rejectionOrUnlistReason && (
                    <div className="text-xs text-red-700">
                      Reason: {item.rejectionOrUnlistReason}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEditListing(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  {(item.status === 'live' || item.status === 'pending_review') && (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => setUnlistTarget(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Unlist Now</span>
                    </button>
                  )}

                  {(item.status === 'unlisted' || item.status === 'rejected') && (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => handleRelist(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Request Relist</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Registered Buyer Interests */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h3 className="font-display text-lg font-bold text-zinc-900">
          Properties I Marked Interested ({interestedListings.length})
        </h3>
        {interestedListings.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">
            You haven’t registered interest in any live Berasia property yet.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-zinc-100">
            {interestedListings.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="text-xs text-zinc-500">
                    <span className="font-mono font-semibold text-zinc-800">{l.publicId}</span> ·{' '}
                    {l.localityName}
                  </div>
                  <div className="text-sm font-semibold text-zinc-900">{l.title}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectPublicListing(l)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  View Listing
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Immediate Unlist Modal */}
      {unlistTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleUnlistConfirm}
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
          >
            <h3 className="font-display text-lg font-bold text-zinc-900">
              Unlist {unlistTarget.publicId} Immediately?
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              No company approval is needed. This property will be removed from public search
              immediately and the Owner will be notified.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700">Reason</label>
                <select
                  value={unlistReason}
                  onChange={(e) => setUnlistReason(e.target.value as UnlistReason)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  {USER_UNLIST_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {unlistReason === 'Other' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Short Explanation <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={unlistNote}
                    onChange={(e) => setUnlistNote(e.target.value)}
                    placeholder="Please describe why you are unlisting"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnlistTarget(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === unlistTarget.id}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
              >
                Unlist Immediately
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
