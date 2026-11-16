import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  Phone,
  ShieldCheck,
  Trash2,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  CATEGORY_LABELS,
  formatAreaUnitLabel,
  formatINR,
  OWNER_REJECT_REASONS,
} from '../shared/constants';
import type {
  EnquiryLead,
  FeeRecord,
  ListingRecord,
  MediaUpload,
  MissingLocalitySuggestion,
  NotificationItem,
  UserAccount,
  VerificationLevel,
} from '../shared/types';

interface OwnerDashboardProps {
  currentUser: UserAccount | null;
  onRequireOwnerSignIn: () => void;
  onDataChanged: () => Promise<void>;
}

type AdminTab = 'approvals' | 'all_listings' | 'leads' | 'users' | 'fees';

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  currentUser,
  onRequireOwnerSignIn,
  onDataChanged,
}) => {
  const [tab, setTab] = useState<AdminTab>('approvals');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryLead[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [suggestions, setSuggestions] = useState<MissingLocalitySuggestion[]>([]);

  // Review state per listing
  const [selectedListing, setSelectedListing] = useState<ListingRecord | null>(null);
  const [verLevel, setVerLevel] = useState<VerificationLevel>('level_1');
  const [scopeNote, setScopeNote] = useState('');
  const [expertRef, setExpertRef] = useState('');
  const [expertConc, setExpertConc] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [rejectReason, setRejectReason] = useState(OWNER_REJECT_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  // Filter for all_listings
  const [statusFilter, setStatusFilter] = useState<'all' | ListingRecord['status']>('all');

  // Preview private doc/video
  const [previewDoc, setPreviewDoc] = useState<MediaUpload | null>(null);

  // Fee Ledger form
  const [feeListingId, setFeeListingId] = useState('');
  const [feeFinalAmount, setFeeFinalAmount] = useState('');
  const [feeNotes, setFeeNotes] = useState('');

  const loadOverview = async () => {
    if (!currentUser?.isOwnerAdmin) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminOverview();
      setListings(data.listings);
      setEnquiries(data.enquiries);
      setUsers(data.users);
      setFeeRecords(data.feeRecords);
      setNotifications(data.notifications);
      setSuggestions(data.localitySuggestions);
      if (!feeListingId && data.listings.length > 0) {
        setFeeListingId(data.listings[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Owner Dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.isOwnerAdmin) {
      loadOverview();
    }
  }, [currentUser?.id, currentUser?.isOwnerAdmin]);

  if (!currentUser?.isOwnerAdmin) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-emerald-900" />
        <h2 className="mt-3 font-display text-xl font-bold text-zinc-900">
          Owner Backend Board (Private)
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Only the Berasia Property Adda Owner can access incoming submissions, private ownership
          documents, Video 2 surroundings, verification calls, and Approve / Reject controls.
        </p>
        <button
          type="button"
          onClick={onRequireOwnerSignIn}
          className="mt-5 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Sign In as Owner
        </button>
      </div>
    );
  }

  const pendingQueue = listings.filter(
    (l) => l.status === 'pending_review' || Boolean(l.pendingEdit)
  );
  const liveCount = listings.filter((l) => l.status === 'live').length;
  const uncontactedLeads = enquiries.filter((e) => e.status === 'not_contacted').length;
  const pendingCallUsers = users.filter((u) => !u.callVerified).length;
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const openInspector = (listing: ListingRecord) => {
    setSelectedListing(listing);
    setVerLevel(listing.verificationLevel === 'none' ? 'level_1' : listing.verificationLevel);
    setScopeNote(listing.verificationScopeNote || '');
    setExpertRef(listing.expertReference || '');
    setExpertConc(listing.expertConclusion || '');
    setStaffNotes(listing.staffNotes || '');
    setCustomRejectReason('');
  };

  const handleDecision = async (
    decision: 'approve' | 'reject' | 'unlist' | 'approve_edit' | 'reject_edit'
  ) => {
    if (!selectedListing) return;
    setReviewBusy(true);
    setError('');
    const finalReason =
      rejectReason === 'CUSTOM' ? customRejectReason.trim() : rejectReason;
    try {
      await api.reviewListing(selectedListing.id, {
        decision,
        verificationLevel: verLevel,
        verificationScopeNote: scopeNote.trim() || undefined,
        expertReference: expertRef.trim() || undefined,
        expertConclusion: expertConc.trim() || undefined,
        staffNotes: staffNotes.trim(),
        reason: finalReason || 'Rejected by Owner during review',
      });
      setSelectedListing(null);
      await loadOverview();
      await onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setReviewBusy(false);
    }
  };

  const handleToggleCallVerified = async (u: UserAccount) => {
    try {
      await api.verifyUserByCall(u.id, !u.callVerified);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update call verification');
    }
  };

  const handleEnquiryUpdate = async (
    lead: EnquiryLead,
    status: 'contacted' | 'not_contacted',
    staffNote: string
  ) => {
    try {
      await api.updateEnquiry(lead.id, { status, staffNote });
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead');
    }
  };

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFeeRecord({
        listingId: feeListingId,
        finalAgreedAmount: Number(feeFinalAmount),
        notes: feeNotes.trim(),
      });
      setFeeFinalAmount('');
      setFeeNotes('');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record fee');
    }
  };

  const handleFeeStatusToggle = async (f: FeeRecord) => {
    try {
      await api.updateFeeStatus(f.id, f.status === 'collected' ? 'pending' : 'collected');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update fee status');
    }
  };

  const handleResolveSuggestion = async (id: string, action: 'add' | 'dismiss') => {
    try {
      await api.resolveLocalitySuggestion(id, action);
      await loadOverview();
      await onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve locality');
    }
  };

  const filteredAllListings =
    statusFilter === 'all' ? listings : listings.filter((l) => l.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="text-xs font-medium text-zinc-500">Pending Approval Queue</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-800">
            {pendingQueue.length}
          </div>
          <div className="mt-1 text-xs text-zinc-600">Hidden until you approve</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="text-xs font-medium text-zinc-500">Live Public Listings</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-900">
            {liveCount}
          </div>
          <div className="mt-1 text-xs text-zinc-600">Visible in Berasia search</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="text-xs font-medium text-zinc-500">Uncontacted Buyer Leads</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-zinc-900">
            {uncontactedLeads}
          </div>
          <div className="mt-1 text-xs text-zinc-600">Total leads: {enquiries.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="text-xs font-medium text-zinc-500">Pending Call Verifications</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-zinc-900">
            {pendingCallUsers}
          </div>
          <div className="mt-1 text-xs text-zinc-600">No-OTP phone-call accounts</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1">
          {[
            { id: 'approvals', label: `Approval Queue (${pendingQueue.length})` },
            { id: 'all_listings', label: `All Properties (${listings.length})` },
            { id: 'leads', label: `Buyer Leads (${enquiries.length})` },
            { id: 'users', label: `Call Verification (${users.length})` },
            { id: 'fees', label: `Fees & Localities` },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as AdminTab)}
              className={`rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === item.id
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {unreadNotifs > 0 && (
          <button
            type="button"
            onClick={async () => {
              await api.markAdminNotificationsRead();
              await loadOverview();
            }}
            className="text-xs font-semibold text-emerald-900 hover:underline"
          >
            Mark {unreadNotifs} notifications read
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Owner Notifications Strip */}
      {notifications.filter((n) => !n.read).length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="text-xs font-semibold text-amber-950">Recent Backend Alerts</div>
          <div className="mt-2 space-y-1.5">
            {notifications
              .filter((n) => !n.read)
              .slice(0, 4)
              .map((n) => (
                <div key={n.id} className="text-xs text-amber-900">
                  <span className="font-semibold">{n.title}:</span> {n.message}
                </div>
              ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          Loading Owner Backend data...
        </div>
      ) : (
        <>
          {/* TAB 1: APPROVAL QUEUE */}
          {tab === 'approvals' && (
            <div className="space-y-4">
              {pendingQueue.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-800" />
                  <h3 className="mt-2 font-display text-base font-semibold text-zinc-900">
                    Approval Queue Clear
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    All incoming property submissions and edits have been reviewed.
                  </p>
                </div>
              ) : (
                pendingQueue.map((item) => {
                  const isEdit = item.status === 'live' && Boolean(item.pendingEdit);
                  const activeData = item.pendingEdit?.data || item.data;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-200 bg-white p-6"
                    >
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-zinc-900">
                              {item.publicId}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-800">
                              {isEdit
                                ? 'Live Listing Edit Pending Re-Approval'
                                : 'New Submission — Hidden from Public'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-zinc-600">
                              {activeData.workflow.toUpperCase()} ·{' '}
                              {CATEGORY_LABELS[activeData.category]}
                            </span>
                          </div>

                          <h3 className="font-display text-lg font-bold text-zinc-900">
                            {activeData.title}
                          </h3>

                          <div className="text-sm text-zinc-700">
                            {activeData.localityName} ·{' '}
                            <span className="font-mono font-semibold">
                              {activeData.areaValue} {formatAreaUnitLabel(activeData.areaUnit)}
                            </span>{' '}
                            ·{' '}
                            <span className="font-mono font-bold text-zinc-900">
                              {formatINR(activeData.priceAmount)}
                            </span>
                          </div>

                          {item.duplicateFlaggedWith && item.duplicateFlaggedWith.length > 0 && (
                            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span>
                                Potential Duplicate Match with:{' '}
                                <strong className="font-mono">
                                  {item.duplicateFlaggedWith.join(', ')}
                                </strong>{' '}
                                — Call both submitters to confirm authority before approving.
                              </span>
                            </div>
                          )}

                          {/* Private Owner & Address Summary */}
                          <div className="mt-3 grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 text-xs sm:grid-cols-2">
                            <div>
                              <span className="text-zinc-500">Actual Owner:</span>{' '}
                              <strong className="text-zinc-900">
                                {activeData.privateData.actualOwnerName}
                              </strong>
                            </div>
                            <div>
                              <span className="text-zinc-500">Submitted By:</span>{' '}
                              <strong className="text-zinc-900">
                                {activeData.privateData.submitterName} (
                                {activeData.privateData.submitterRelation})
                              </strong>
                            </div>
                            <div>
                              <span className="text-zinc-500">Primary Contact:</span>{' '}
                              <a
                                href={`tel:+91${activeData.privateData.primaryContactMobile}`}
                                className="font-mono font-semibold text-emerald-900 underline"
                              >
                                +91 {activeData.privateData.primaryContactMobile}
                              </a>{' '}
                              ({activeData.privateData.primaryContactRole})
                            </div>
                            <div>
                              <span className="text-zinc-500">Alternate Contact:</span>{' '}
                              <a
                                href={`tel:+91${activeData.privateData.alternateContactMobile}`}
                                className="font-mono font-semibold text-emerald-900 underline"
                              >
                                +91 {activeData.privateData.alternateContactMobile}
                              </a>{' '}
                              ({activeData.privateData.alternateContactRole})
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-zinc-500">Exact Private Address:</span>{' '}
                              <strong className="text-zinc-900">
                                {activeData.privateData.exactAddress}
                              </strong>
                              {activeData.privateData.plotOrHouseNumber &&
                                ` · Plot/House: ${activeData.privateData.plotOrHouseNumber}`}
                              {activeData.privateData.khasraOrSurveyNumber &&
                                ` · Khasra: ${activeData.privateData.khasraOrSurveyNumber}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                          <button
                            type="button"
                            onClick={() => openInspector(item)}
                            className="rounded-lg bg-emerald-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
                          >
                            Review Documents & Approve / Reject
                          </button>
                          <a
                            href={`tel:+91${activeData.privateData.primaryContactMobile}`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>Call Submitter</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: ALL PROPERTIES */}
          {tab === 'all_listings' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['all', 'live', 'pending_review', 'unlisted', 'rejected', 'draft'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${
                        statusFilter === st
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">ID</th>
                      <th className="px-4 py-3 font-semibold">Property & Locality</th>
                      <th className="px-4 py-3 font-semibold">Owner / Contact</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Verification</th>
                      <th className="px-4 py-3 text-right font-semibold">Price</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredAllListings.map((l) => (
                      <tr key={l.id} className="hover:bg-zinc-50/70">
                        <td className="px-4 py-3 font-mono font-semibold text-zinc-900">
                          {l.publicId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-900">{l.data.title}</div>
                          <div className="text-zinc-500">{l.data.localityName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-zinc-900">{l.data.privateData.actualOwnerName}</div>
                          <div className="font-mono text-zinc-500">
                            +91 {l.data.privateData.primaryContactMobile}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold capitalize text-zinc-800">
                          {l.status.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          {l.verificationLevel === 'level_2'
                            ? 'Level 2 (Expert)'
                            : l.verificationLevel === 'level_1'
                            ? 'Level 1 (Basic)'
                            : 'Not Reviewed'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-zinc-900">
                          {formatINR(l.data.priceAmount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openInspector(l)}
                            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 font-semibold text-zinc-800 hover:bg-zinc-100"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: BUYER LEADS */}
          {tab === 'leads' && (
            <div className="space-y-4">
              {enquiries.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
                  No buyer enquiries yet.
                </div>
              ) : (
                enquiries.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    onSave={handleEnquiryUpdate}
                  />
                ))
              )}
            </div>
          )}

          {/* TAB 4: USERS & CALL VERIFICATION */}
          {tab === 'users' && (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Mobile Number</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                    <th className="px-4 py-3 font-semibold">Call Verification</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-semibold text-zinc-900">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-zinc-800">+91 {u.mobile}</td>
                      <td className="px-4 py-3 font-mono text-zinc-500">
                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        {u.callVerified ? (
                          <span className="font-semibold text-emerald-800">Call Verified</span>
                        ) : (
                          <span className="font-semibold text-amber-800">Pending Call</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={`tel:+91${u.mobile}`}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2.5 py-1.5 font-semibold text-zinc-800 hover:bg-zinc-50"
                          >
                            <Phone className="h-3 w-3" />
                            <span>Call</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleToggleCallVerified(u)}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold ${
                              u.callVerified
                                ? 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                                : 'bg-emerald-900 text-white hover:bg-emerald-800'
                            }`}
                          >
                            <UserCheck className="h-3 w-3" />
                            <span>{u.callVerified ? 'Unverify' : 'Mark Call Verified'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: FEE LEDGER & LOCALITY SUGGESTIONS */}
          {tab === 'fees' && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <h3 className="font-display text-base font-bold text-zinc-900">
                    Record Completed Deal Fee
                  </h3>
                  <p className="mt-1 text-xs text-zinc-600">
                    Sale: Seller ₹0, Buyer 1% of final net deal. Rental: Landlord 50% + Tenant 50%
                    of 1 month’s agreed rent.
                  </p>

                  <form onSubmit={handleCreateFee} className="mt-4 grid gap-3 sm:grid-cols-3">
                    <select
                      value={feeListingId}
                      onChange={(e) => setFeeListingId(e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs sm:col-span-2"
                    >
                      {listings.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.publicId} ({l.workflow.toUpperCase()}) — {l.data.title}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      required
                      min="1"
                      value={feeFinalAmount}
                      onChange={(e) => setFeeFinalAmount(e.target.value)}
                      placeholder="Final Agreed ₹"
                      className="rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
                    />
                    <input
                      type="text"
                      value={feeNotes}
                      onChange={(e) => setFeeNotes(e.target.value)}
                      placeholder="Documentation / Agreement note"
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs sm:col-span-2"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-900 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Calculate & Save Fee
                    </button>
                  </form>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Property</th>
                        <th className="px-4 py-3 text-right font-semibold">Final Deal</th>
                        <th className="px-4 py-3 text-right font-semibold">Company Fee</th>
                        <th className="px-4 py-3 font-semibold">Breakdown</th>
                        <th className="px-4 py-3 text-right font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {feeRecords.map((f) => (
                        <tr key={f.id}>
                          <td className="px-4 py-3 font-mono font-semibold text-zinc-900">
                            {f.publicId}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            {formatINR(f.finalAgreedAmount)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-emerald-900">
                            {formatINR(f.totalCompanyFee)}
                          </td>
                          <td className="px-4 py-3 text-zinc-600">
                            {f.workflow === 'sale'
                              ? `Seller ₹0 · Buyer ${formatINR(f.buyerFee)}`
                              : `Landlord ${formatINR(f.landlordFee)} · Tenant ${formatINR(
                                  f.tenantFee
                                )}`}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleFeeStatusToggle(f)}
                              className={`rounded-md px-2.5 py-1 font-semibold ${
                                f.status === 'collected'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              {f.status === 'collected' ? 'Collected' : 'Mark Collected'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-5">
                <h3 className="font-display text-base font-bold text-zinc-900">
                  Suggested Berasia Localities ({suggestions.length})
                </h3>
                {suggestions.length === 0 ? (
                  <p className="mt-3 text-xs text-zinc-600">
                    No missing village or colony suggestions pending.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {suggestions.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs"
                      >
                        <div className="font-semibold text-zinc-900">{s.suggestedName}</div>
                        <div className="text-zinc-600">{s.panchayatOrWard}</div>
                        <div className="mt-1 text-zinc-500">
                          By {s.submittedByName} (+91 {s.submittedByMobile}) · Status: {s.status}
                        </div>
                        {s.status === 'pending' && (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleResolveSuggestion(s.id, 'add')}
                              className="rounded bg-emerald-900 px-2.5 py-1 font-semibold text-white"
                            >
                              Add to Master List
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResolveSuggestion(s.id, 'dismiss')}
                              className="rounded border border-zinc-300 bg-white px-2.5 py-1 font-semibold text-zinc-700"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* OWNER REVIEW & APPROVAL INSPECTOR MODAL */}
      {selectedListing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/65 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <div>
                <div className="font-mono text-xs font-semibold text-zinc-500">
                  {selectedListing.publicId} · Status: {selectedListing.status.toUpperCase()}
                </div>
                <h3 className="font-display text-lg font-bold text-zinc-900">
                  Owner Review & Private Evidence Inspector
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(() => {
                const d = selectedListing.pendingEdit?.data || selectedListing.data;
                return (
                  <>
                    <div className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs sm:grid-cols-2">
                      <div>
                        <span className="text-zinc-500">Actual Owner:</span>{' '}
                        <strong className="text-zinc-900">{d.privateData.actualOwnerName}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500">Submitter:</span>{' '}
                        <strong className="text-zinc-900">
                          {d.privateData.submitterName} ({d.privateData.submitterRelation})
                        </strong>
                      </div>
                      <div>
                        <span className="text-zinc-500">Primary Contact:</span>{' '}
                        <a
                          href={`tel:+91${d.privateData.primaryContactMobile}`}
                          className="font-mono font-semibold text-emerald-900 underline"
                        >
                          +91 {d.privateData.primaryContactMobile}
                        </a>{' '}
                        ({d.privateData.primaryContactRole})
                      </div>
                      <div>
                        <span className="text-zinc-500">Alternate Contact:</span>{' '}
                        <a
                          href={`tel:+91${d.privateData.alternateContactMobile}`}
                          className="font-mono font-semibold text-emerald-900 underline"
                        >
                          +91 {d.privateData.alternateContactMobile}
                        </a>{' '}
                        ({d.privateData.alternateContactRole})
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-zinc-500">Exact Private Address:</span>{' '}
                        <strong className="text-zinc-900">{d.privateData.exactAddress}</strong>
                      </div>
                    </div>

                    {/* Private Media & Docs */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-zinc-200 p-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Private Ownership Documents ({d.privateData.ownershipDocuments.length})</span>
                        </div>
                        {d.privateData.ownershipDocuments.length === 0 ? (
                          <p className="mt-2 text-xs text-amber-800">
                            No ownership document uploaded yet.
                          </p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {d.privateData.ownershipDocuments.map((doc) => (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => setPreviewDoc(doc)}
                                className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-xs hover:bg-zinc-50"
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <FileText className="h-3.5 w-3.5 text-zinc-500" />
                                  <span className="truncate font-medium">{doc.name}</span>
                                </span>
                                <span className="font-semibold text-emerald-900">Inspect</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-zinc-200 p-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                          <Video className="h-3.5 w-3.5" />
                          <span>Uploaded Videos</span>
                        </div>
                        <div className="mt-2 space-y-2 text-xs">
                          <div>
                            <span className="text-zinc-500">Video 1 (Public):</span>{' '}
                            {d.video1 ? (
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(d.video1!)}
                                className="font-semibold text-emerald-900 underline"
                              >
                                Play {d.video1.name}
                              </button>
                            ) : (
                              'Not uploaded'
                            )}
                          </div>
                          <div>
                            <span className="text-zinc-500">Video 2 (Private Surroundings):</span>{' '}
                            {d.privateData.video2Surroundings ? (
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(d.privateData.video2Surroundings!)}
                                className="font-semibold text-emerald-900 underline"
                              >
                                Play {d.privateData.video2Surroundings.name}
                              </button>
                            ) : (
                              'Not uploaded'
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Verification Level & Staff Notes */}
                    <div className="space-y-4 rounded-xl border border-zinc-200 bg-[#FAF9F6] p-4">
                      <div className="text-sm font-semibold text-zinc-900">
                        Verification Decision & Notes
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label
                          className={`cursor-pointer rounded-lg border p-3 text-xs ${
                            verLevel === 'level_1'
                              ? 'border-emerald-900 bg-emerald-50/70'
                              : 'border-zinc-200 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="verLevel"
                            checked={verLevel === 'level_1'}
                            onChange={() => setVerLevel('level_1')}
                            className="mr-2"
                          />
                          <strong>Level 1 · Basic Document Review</strong>
                          <p className="mt-1 text-zinc-600">
                            Papers, photos/videos checked + spoke to owner/submitter by phone.
                          </p>
                        </label>

                        <label
                          className={`cursor-pointer rounded-lg border p-3 text-xs ${
                            verLevel === 'level_2'
                              ? 'border-emerald-900 bg-emerald-50/70'
                              : 'border-zinc-200 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="verLevel"
                            checked={verLevel === 'level_2'}
                            onChange={() => setVerLevel('level_2')}
                            className="mr-2"
                          />
                          <strong>Level 2 · Detailed Expert Review</strong>
                          <p className="mt-1 text-zinc-600">
                            Expert checked B-1/Khasra revenue records & dispute history.
                          </p>
                        </label>
                      </div>

                      {verLevel === 'level_2' && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            type="text"
                            value={expertRef}
                            onChange={(e) => setExpertRef(e.target.value)}
                            placeholder="Private Expert / Report Reference (Required for L2)"
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs"
                          />
                          <input
                            type="text"
                            value={expertConc}
                            onChange={(e) => setExpertConc(e.target.value)}
                            placeholder="Private Expert Findings & Limitations"
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs"
                          />
                        </div>
                      )}

                      <input
                        type="text"
                        value={scopeNote}
                        onChange={(e) => setScopeNote(e.target.value)}
                        placeholder="Public scope note (e.g. B-1, Khasra & tax receipt checked)"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs"
                      />

                      <textarea
                        rows={2}
                        value={staffNotes}
                        onChange={(e) => setStaffNotes(e.target.value)}
                        placeholder="Private internal Owner/Staff notes (never public)"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs"
                      />
                    </div>

                    {/* Reject / Remove Reason */}
                    <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-2">
                      <div className="text-xs font-semibold text-red-900">
                        Reject / Remove Reason (Used if rejecting or unlisting)
                      </div>
                      <select
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs"
                      >
                        {OWNER_REJECT_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                        <option value="CUSTOM">Other custom reason...</option>
                      </select>
                      {rejectReason === 'CUSTOM' && (
                        <input
                          type="text"
                          value={customRejectReason}
                          onChange={(e) => setCustomRejectReason(e.target.value)}
                          placeholder="Enter exact reason shown to submitter"
                          className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs"
                        />
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {selectedListing.status === 'live' && selectedListing.pendingEdit ? (
                  <>
                    <button
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => handleDecision('reject_edit')}
                      className="rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Decline Edit
                    </button>
                    <button
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => handleDecision('approve_edit')}
                      className="rounded-lg bg-emerald-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Approve Edited Version Live
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={reviewBusy}
                      onClick={() =>
                        handleDecision(selectedListing.status === 'live' ? 'unlist' : 'reject')
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>
                        {selectedListing.status === 'live'
                          ? 'Unlist & Remove from Website'
                          : 'Reject & Keep Off Website'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => handleDecision('approve')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>
                        {selectedListing.status === 'live'
                          ? 'Update Verification'
                          : 'Approve & Publish Live'}
                      </span>
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private Media/Doc Lightbox */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/80 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <span className="truncate text-sm font-semibold text-zinc-900">{previewDoc.name}</span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[75vh] items-center justify-center bg-zinc-900 p-4">
              {previewDoc.mimeType.startsWith('video/') ? (
                <video src={previewDoc.dataUrl} controls className="max-h-[70vh] w-full" />
              ) : previewDoc.mimeType === 'application/pdf' &&
                previewDoc.dataUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDoc.dataUrl}
                  title={previewDoc.name}
                  className="h-[68vh] w-full rounded bg-white"
                />
              ) : (
                <img
                  src={previewDoc.dataUrl}
                  alt={previewDoc.name}
                  referrerPolicy="no-referrer"
                  className="max-h-[70vh] object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LeadRow: React.FC<{
  lead: EnquiryLead;
  onSave: (lead: EnquiryLead, status: 'contacted' | 'not_contacted', note: string) => Promise<void>;
}> = ({ lead, onSave }) => {
  const [note, setNote] = useState(lead.staffNote);
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="font-mono font-semibold text-zinc-900">{lead.publicId}</span>
            <span aria-hidden="true">·</span>
            <span>{lead.workflow.toUpperCase()}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{new Date(lead.createdAt).toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-1 font-display text-base font-bold text-zinc-900">
            {lead.buyerName}{' '}
            <a
              href={`tel:+91${lead.buyerMobile}`}
              className="ml-2 font-mono text-sm font-semibold text-emerald-900 underline"
            >
              +91 {lead.buyerMobile}
            </a>
          </div>
          <div className="text-xs text-zinc-600">{lead.listingTitle}</div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`tel:+91${lead.buyerMobile}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Call Buyer</span>
          </a>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave(
                lead,
                lead.status === 'contacted' ? 'not_contacted' : 'contacted',
                note
              );
              setSaving(false);
            }}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${
              lead.status === 'contacted'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            {lead.status === 'contacted' ? 'Contacted' : 'Mark Contacted'}
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Private staff conversation note (e.g., Visit scheduled for Sunday 11 AM)"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs"
        />
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(lead, lead.status, note);
            setSaving(false);
          }}
          className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100"
        >
          Save Note
        </button>
      </div>
    </div>
  );
};
