import type {
  BerasiaLocality,
  EnquiryLead,
  FeeRecord,
  ListingRecord,
  ListingRevisionData,
  MissingLocalitySuggestion,
  NotificationItem,
  PublicListingView,
  UserAccount,
  VerificationLevel,
  WorkflowType,
} from '../shared/types';

const TOKEN_KEY = 'berasia_property_adda_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getMeta() {
    return request<{
      companyPhone: string;
      boundary: string;
      localities: BerasiaLocality[];
    }>('/api/meta');
  },

  mobileLogin(payload: {
    name: string;
    mobile: string;
    email?: string;
    termsAccepted: boolean;
  }) {
    return request<{ token: string; user: UserAccount }>('/api/auth/mobile-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  ownerLogin(payload: { mobile: string; passcode: string }) {
    return request<{ token: string; user: UserAccount }>('/api/auth/owner-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe() {
    return request<{ user: UserAccount }>('/api/auth/me');
  },

  logout() {
    return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  },

  getPublicListings(params: {
    workflow?: WorkflowType;
    localityId?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    minSqYd?: string;
    maxSqYd?: string;
    furnishing?: string;
    bhk?: string;
    q?: string;
  }) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'all') {
        qs.set(k, v);
      }
    });
    return request<{ listings: PublicListingView[] }>(`/api/listings?${qs.toString()}`);
  },

  markInterest(listingId: string, action: 'interested' | 'non_interested') {
    return request<{ state: 'interested' | 'non_interested'; lead?: EnquiryLead }>(
      `/api/listings/${listingId}/interest`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      }
    );
  },

  getMyActivity() {
    return request<{
      myListings: ListingRecord[];
      interestedListingIds: string[];
      nonInterestedListingIds: string[];
      notifications: NotificationItem[];
    }>('/api/my/activity');
  },

  createListing(submitMode: 'draft' | 'pending_review', data: ListingRevisionData) {
    return request<{ listing: ListingRecord }>('/api/listings', {
      method: 'POST',
      body: JSON.stringify({ submitMode, data }),
    });
  },

  updateListing(
    listingId: string,
    submitMode: 'draft' | 'pending_review',
    data: ListingRevisionData
  ) {
    return request<{ listing: ListingRecord }>(`/api/listings/${listingId}`, {
      method: 'PUT',
      body: JSON.stringify({ submitMode, data }),
    });
  },

  unlistListing(listingId: string, reason: string, note?: string) {
    return request<{ listing: ListingRecord }>(`/api/listings/${listingId}/unlist`, {
      method: 'POST',
      body: JSON.stringify({ reason, note }),
    });
  },

  relistListing(listingId: string) {
    return request<{ listing: ListingRecord }>(`/api/listings/${listingId}/relist`, {
      method: 'POST',
    });
  },

  suggestLocality(suggestedName: string, panchayatOrWard: string) {
    return request<{ suggestion: MissingLocalitySuggestion }>('/api/localities/suggest', {
      method: 'POST',
      body: JSON.stringify({ suggestedName, panchayatOrWard }),
    });
  },

  // Owner Admin Endpoints
  getAdminOverview() {
    return request<{
      listings: ListingRecord[];
      enquiries: EnquiryLead[];
      users: UserAccount[];
      feeRecords: FeeRecord[];
      notifications: NotificationItem[];
      localitySuggestions: MissingLocalitySuggestion[];
    }>('/api/admin/overview');
  },

  verifyUserByCall(userId: string, callVerified: boolean) {
    return request<{ user: UserAccount }>(`/api/admin/users/${userId}/call-verify`, {
      method: 'POST',
      body: JSON.stringify({ callVerified }),
    });
  },

  reviewListing(
    listingId: string,
    payload: {
      decision:
        | 'approve'
        | 'reject'
        | 'unlist'
        | 'approve_edit'
        | 'reject_edit'
        | 'update_verification';
      verificationLevel?: VerificationLevel;
      verificationScopeNote?: string;
      expertReference?: string;
      expertConclusion?: string;
      staffNotes?: string;
      reason?: string;
    }
  ) {
    return request<{ listing: ListingRecord }>(`/api/admin/listings/${listingId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateEnquiry(enquiryId: string, payload: { status?: 'contacted' | 'not_contacted'; staffNote?: string }) {
    return request<{ enquiry: EnquiryLead }>(`/api/admin/enquiries/${enquiryId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  createFeeRecord(payload: { listingId: string; finalAgreedAmount: number; notes?: string }) {
    return request<{ feeRecord: FeeRecord }>('/api/admin/fees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateFeeStatus(feeId: string, status: 'pending' | 'collected') {
    return request<{ feeRecord: FeeRecord }>(`/api/admin/fees/${feeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  resolveLocalitySuggestion(id: string, action: 'add' | 'dismiss') {
    return request<{ suggestion: MissingLocalitySuggestion; localities: BerasiaLocality[] }>(
      `/api/admin/localities/${id}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      }
    );
  },

  markAdminNotificationsRead() {
    return request<{ ok: boolean }>('/api/admin/notifications/read', { method: 'POST' });
  },
};
