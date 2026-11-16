import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { store } from './src/server/store.ts';
import {
  BOUNDARY_LABEL,
  COMPANY_PHONE,
  convertArea,
  VERIFICATION_DESCRIPTIONS,
} from './src/shared/constants.ts';
import type {
  EnquiryLead,
  FeeRecord,
  ListingRecord,
  ListingRevisionData,
  MissingLocalitySuggestion,
  UserAccount,
  VerificationLevel,
} from './src/shared/types.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const OWNER_PASSCODE = process.env.OWNER_PASSCODE || 'BERASIA2026';

function extractToken(req: express.Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return undefined;
}

function getCurrentUser(req: express.Request): UserAccount | null {
  return store.getUserByToken(extractToken(req));
}

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const user = getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: 'Please sign in with your mobile number first.' });
    return;
  }
  (req as express.Request & { user: UserAccount }).user = user;
  next();
}

function requireOwner(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const user = getCurrentUser(req);
  if (!user || !user.isOwnerAdmin) {
    res.status(403).json({ error: 'Owner / Admin authorization required.' });
    return;
  }
  (req as express.Request & { user: UserAccount }).user = user;
  next();
}

function normalizeMobile(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

function isValidIndianMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Public metadata
  app.get('/api/meta', (_req, res) => {
    const state = store.getState();
    res.json({
      companyPhone: COMPANY_PHONE,
      boundary: BOUNDARY_LABEL,
      localities: state.localities,
    });
  });

  // Mobile Login WITHOUT OTP (Call + Mobile Number verification model)
  app.post('/api/auth/mobile-login', (req, res) => {
    const { name, mobile, email, termsAccepted } = req.body ?? {};
    const cleanMobile = normalizeMobile(mobile);

    if (!isValidIndianMobile(cleanMobile)) {
      res.status(400).json({
        error: 'Please enter a valid 10-digit Indian mobile number starting with 6–9.',
      });
      return;
    }

    const state = store.getState();
    let user = state.users.find((u) => u.mobile === cleanMobile);

    if (!user) {
      const cleanName = String(name || '').trim();
      if (cleanName.length < 2) {
        res.status(400).json({
          error: 'Please enter your full name (Hindi or English) to register this mobile number.',
        });
        return;
      }
      if (!termsAccepted) {
        res.status(400).json({
          error: 'Please accept the service & privacy terms to continue.',
        });
        return;
      }

      if (email) {
        const cleanEmail = String(email).trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          res.status(400).json({ error: 'Please enter a valid email address.' });
          return;
        }
        const emailTaken = state.users.some(
          (u) => u.email && u.email.toLowerCase() === cleanEmail.toLowerCase()
        );
        if (emailTaken) {
          res.status(400).json({ error: 'This email is already linked to another account.' });
          return;
        }
      }

      const now = new Date().toISOString();
      user = {
        id: `usr-${crypto.randomBytes(6).toString('hex')}`,
        name: cleanName,
        mobile: cleanMobile,
        email: email ? String(email).trim() : undefined,
        termsAccepted: true,
        callVerified: false, // Verified via company phone call (No OTP needed!)
        callRequestedAt: now,
        isOwnerAdmin: false,
        createdAt: now,
      };
      state.users.push(user);
    } else if (name && String(name).trim().length >= 2 && !user.isOwnerAdmin) {
      user.name = String(name).trim();
    }

    const token = store.createSession(user.id);
    res.json({ token, user });
  });

  // Owner / Admin Backend Login
  app.post('/api/auth/owner-login', (req, res) => {
    const { mobile, passcode } = req.body ?? {};
    const cleanMobile = normalizeMobile(mobile);

    if (String(passcode || '').trim() !== OWNER_PASSCODE) {
      res.status(401).json({ error: 'Invalid Owner passcode.' });
      return;
    }

    const state = store.getState();
    let owner = state.users.find((u) => u.isOwnerAdmin);
    if (!owner) {
      const now = new Date().toISOString();
      owner = {
        id: 'usr-owner-1',
        name: 'Rajesh Sharma (Owner)',
        mobile: isValidIndianMobile(cleanMobile) ? cleanMobile : '9826045120',
        termsAccepted: true,
        callVerified: true,
        callRequestedAt: now,
        isOwnerAdmin: true,
        createdAt: now,
      };
      state.users.push(owner);
      store.save();
    }

    const token = store.createSession(owner.id);
    res.json({ token, user: owner });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }
    res.json({ user });
  });

  app.post('/api/auth/logout', (req, res) => {
    store.revokeSession(extractToken(req));
    res.json({ ok: true });
  });

  // Public Search & Approved Live Listings ONLY
  app.get('/api/listings', (req, res) => {
    const {
      workflow,
      localityId,
      category,
      minPrice,
      maxPrice,
      minSqYd,
      maxSqYd,
      furnishing,
      bhk,
      q,
    } = req.query;

    const state = store.getState();
    let results = state.listings.filter((l) => l.status === 'live');

    if (workflow === 'sale' || workflow === 'rent') {
      results = results.filter((l) => l.workflow === workflow);
    }
    if (localityId && localityId !== 'all') {
      results = results.filter((l) => l.data.localityId === localityId);
    }
    if (category && category !== 'all') {
      results = results.filter((l) => l.data.category === category);
    }
    if (minPrice) {
      const minP = Number(minPrice);
      if (!Number.isNaN(minP)) results = results.filter((l) => l.data.priceAmount >= minP);
    }
    if (maxPrice) {
      const maxP = Number(maxPrice);
      if (!Number.isNaN(maxP)) results = results.filter((l) => l.data.priceAmount <= maxP);
    }
    if (minSqYd) {
      const minA = Number(minSqYd);
      if (!Number.isNaN(minA)) results = results.filter((l) => l.data.areaSqYd >= minA);
    }
    if (maxSqYd) {
      const maxA = Number(maxSqYd);
      if (!Number.isNaN(maxA)) results = results.filter((l) => l.data.areaSqYd <= maxA);
    }
    if (furnishing && furnishing !== 'all') {
      results = results.filter(
        (l) => l.data.conditionalDetails.furnishing === furnishing
      );
    }
    if (bhk && bhk !== 'all') {
      const bhkQuery = String(bhk).toLowerCase();
      results = results.filter((l) =>
        (l.data.conditionalDetails.bhkRooms || '').toLowerCase().includes(bhkQuery)
      );
    }
    if (q && String(q).trim()) {
      const term = String(q).trim().toLowerCase();
      results = results.filter(
        (l) =>
          l.publicId.toLowerCase().includes(term) ||
          l.data.title.toLowerCase().includes(term) ||
          l.data.description.toLowerCase().includes(term) ||
          l.data.localityName.toLowerCase().includes(term)
      );
    }

    results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json({ listings: results.map((l) => store.toPublicView(l)) });
  });

  // Public Listing Detail (strictly live only, strips all private data)
  app.get('/api/listings/:id', (req, res) => {
    const state = store.getState();
    const listing = state.listings.find(
      (l) => (l.id === req.params.id || l.publicId === req.params.id) && l.status === 'live'
    );
    if (!listing) {
      res.status(404).json({ error: 'Listing is not publicly available.' });
      return;
    }
    res.json({ listing: store.toPublicView(listing) });
  });

  // Buyer / Rental Seeker Interest Action
  app.post('/api/listings/:id/interest', requireAuth, (req, res) => {
    const user = (req as express.Request & { user: UserAccount }).user;
    const { action } = req.body ?? {};
    if (action !== 'interested' && action !== 'non_interested') {
      res.status(400).json({ error: 'Invalid interest action.' });
      return;
    }

    const state = store.getState();
    const listing = state.listings.find(
      (l) => l.id === req.params.id && l.status === 'live'
    );
    if (!listing) {
      res.status(404).json({ error: 'This property is not currently live.' });
      return;
    }

    const existingLead = state.enquiries.find(
      (e) => e.listingId === listing.id && e.buyerUserId === user.id
    );

    if (action === 'non_interested') {
      // Cannot reverse Interested -> Non-interested
      if (existingLead) {
        res.status(400).json({
          error: 'Interest is already registered for this property and cannot be reversed here.',
        });
        return;
      }
      const alreadyNon = state.nonInterested.some(
        (n) => n.listingId === listing.id && n.userId === user.id
      );
      if (!alreadyNon) {
        state.nonInterested.push({
          userId: user.id,
          listingId: listing.id,
          createdAt: new Date().toISOString(),
        });
        store.save();
      }
      // Silent: no notification, does not hide listing from anyone
      res.json({ state: 'non_interested' });
      return;
    }

    // Interested: idempotent (never creates duplicate leads/notifications)
    if (existingLead) {
      res.json({ state: 'interested', lead: existingLead });
      return;
    }

    // Remove prior non_interested if switching Non-interested -> Interested
    state.nonInterested = state.nonInterested.filter(
      (n) => !(n.listingId === listing.id && n.userId === user.id)
    );

    const now = new Date().toISOString();
    const lead: EnquiryLead = {
      id: `enq-${crypto.randomBytes(6).toString('hex')}`,
      listingId: listing.id,
      publicId: listing.publicId,
      listingTitle: listing.data.title,
      workflow: listing.workflow,
      buyerUserId: user.id,
      buyerName: user.name,
      buyerMobile: user.mobile,
      status: 'not_contacted',
      staffNote: '',
      createdAt: now,
    };
    state.enquiries.unshift(lead);

    state.notifications.unshift({
      id: `notif-${crypto.randomBytes(6).toString('hex')}`,
      recipientRole: 'owner',
      type: 'new_lead',
      listingId: listing.id,
      publicId: listing.publicId,
      title: `New Interest on ${listing.publicId}`,
      message: `${user.name} (+91 ${user.mobile}) marked Interested in "${listing.data.title}".`,
      read: false,
      createdAt: now,
    });

    store.save();
    res.json({ state: 'interested', lead });
  });

  // Signed-in User's Own Activity (Submissions, Interest States, Notifications)
  app.get('/api/my/activity', requireAuth, (req, res) => {
    const user = (req as express.Request & { user: UserAccount }).user;
    const state = store.getState();

    const myListings = state.listings
      .filter((l) => l.submitterUserId === user.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const interestedListingIds = state.enquiries
      .filter((e) => e.buyerUserId === user.id)
      .map((e) => e.listingId);

    const nonInterestedListingIds = state.nonInterested
      .filter((n) => n.userId === user.id)
      .map((n) => n.listingId);

    const notifications = state.notifications.filter(
      (n) => n.recipientRole === 'user' && n.recipientUserId === user.id
    );

    res.json({
      myListings,
      interestedListingIds,
      nonInterestedListingIds,
      notifications,
    });
  });

  // Submit a New Property (NEVER goes live automatically — always Draft or Pending Owner Review!)
  app.post('/api/listings', requireAuth, (req, res) => {
    const user = (req as express.Request & { user: UserAccount }).user;
    const { submitMode, data } = req.body as {
      submitMode: 'draft' | 'pending_review';
      data: ListingRevisionData;
    };

    if (!data || (data.workflow !== 'sale' && data.workflow !== 'rent')) {
      res.status(400).json({ error: 'Invalid workflow type.' });
      return;
    }

    const mode = submitMode === 'draft' ? 'draft' : 'pending_review';

    // Validate mandatory submission fields when submitting for Owner review
    if (mode === 'pending_review') {
      if (!data.title?.trim() || !data.description?.trim()) {
        res.status(400).json({ error: 'Property title and availability description are required.' });
        return;
      }
      if (!data.localityId) {
        res.status(400).json({ error: 'Please select a valid Berasia locality.' });
        return;
      }
      if (!data.areaValue || data.areaValue <= 0 || !data.priceAmount || data.priceAmount <= 0) {
        res.status(400).json({ error: 'Area and price/rent must be positive numbers.' });
        return;
      }
      const pd = data.privateData;
      if (!pd?.actualOwnerName?.trim() || !pd?.submitterName?.trim()) {
        res.status(400).json({ error: 'Actual owner name and submitter name are required.' });
        return;
      }
      if (!pd.authorityDeclarationAccepted) {
        res.status(400).json({ error: 'Please confirm the submitter authority and accuracy declaration.' });
        return;
      }
      const pMob = normalizeMobile(pd.primaryContactMobile);
      const aMob = normalizeMobile(pd.alternateContactMobile);
      if (!isValidIndianMobile(pMob) || !isValidIndianMobile(aMob)) {
        res.status(400).json({
          error: 'Two valid 10-digit Indian mobile numbers (Primary and Alternate) are required.',
        });
        return;
      }
      if (pMob === aMob) {
        res.status(400).json({
          error: 'Primary and Alternate contact numbers must be different.',
        });
        return;
      }
      if (!pd.exactAddress?.trim()) {
        res.status(400).json({ error: 'Exact private address / Khasra or Plot identity is required.' });
        return;
      }
      pd.primaryContactMobile = pMob;
      pd.alternateContactMobile = aMob;
    }

    const conv = convertArea(Number(data.areaValue) || 0, data.areaUnit || 'sq_ft');
    const state = store.getState();
    const locality = state.localities.find((loc) => loc.id === data.localityId);

    const normalizedData: ListingRevisionData = {
      ...data,
      localityName: locality ? locality.nameEn : data.localityName || 'Berasia, Bhopal',
      areaSqYd: conv.sqYd,
      areaSqFt: conv.sqFt,
      photos: data.photos || [],
      privateData: {
        ...data.privateData,
        ownershipDocuments: data.privateData?.ownershipDocuments || [],
      },
    };

    const now = new Date().toISOString();
    const publicId = store.nextPublicId(data.workflow);
    const id = `lst-${data.workflow}-${crypto.randomBytes(5).toString('hex')}`;

    const duplicates =
      mode === 'pending_review'
        ? store.detectDuplicates(
            data.workflow,
            normalizedData.localityId,
            normalizedData.privateData.plotOrHouseNumber,
            normalizedData.privateData.khasraOrSurveyNumber
          )
        : [];

    const record: ListingRecord = {
      id,
      publicId,
      workflow: data.workflow,
      submitterUserId: user.id,
      status: mode,
      verificationLevel: 'none',
      staffNotes: '',
      duplicateFlaggedWith: duplicates.length > 0 ? duplicates : undefined,
      verificationAudit: [],
      createdAt: now,
      updatedAt: now,
      data: normalizedData,
    };

    state.listings.unshift(record);

    if (mode === 'pending_review') {
      state.notifications.unshift({
        id: `notif-${crypto.randomBytes(6).toString('hex')}`,
        recipientRole: 'owner',
        type: 'new_submission',
        listingId: record.id,
        publicId: record.publicId,
        title: `New Property Awaiting Approval: ${record.publicId}`,
        message: `${user.name} (+91 ${user.mobile}) submitted "${normalizedData.title}" in ${normalizedData.localityName}. It will remain hidden until you approve it.${
          duplicates.length > 0 ? ` Potential duplicate of: ${duplicates.join(', ')}.` : ''
        }`,
        read: false,
        createdAt: now,
      });
    }

    store.save();
    res.status(201).json({ listing: record });
  });

  // Edit Own Listing (Live listings enter pendingEdit while approved version stays public!)
  app.put('/api/listings/:id', requireAuth, (req, res) => {
    const user = (req as express.Request & { user: UserAccount }).user;
    const { submitMode, data } = req.body as {
      submitMode?: 'draft' | 'pending_review';
      data: ListingRevisionData;
    };

    const state = store.getState();
    const listing = state.listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }
    if (listing.submitterUserId !== user.id && !user.isOwnerAdmin) {
      res.status(403).json({ error: 'You cannot edit another user’s property.' });
      return;
    }

    const conv = convertArea(Number(data.areaValue) || 0, data.areaUnit || 'sq_ft');
    const locality = state.localities.find((loc) => loc.id === data.localityId);
    const updatedData: ListingRevisionData = {
      ...data,
      localityName: locality ? locality.nameEn : data.localityName,
      areaSqYd: conv.sqYd,
      areaSqFt: conv.sqFt,
    };

    const now = new Date().toISOString();

    if (listing.status === 'live') {
      // Keep last approved version live; put edits into pendingEdit for Owner approval
      listing.pendingEdit = {
        submittedAt: now,
        data: updatedData,
      };
      listing.updatedAt = now;
      state.notifications.unshift({
        id: `notif-${crypto.randomBytes(6).toString('hex')}`,
        recipientRole: 'owner',
        type: 'edit_submission',
        listingId: listing.id,
        publicId: listing.publicId,
        title: `Edited Live Listing Needs Re-Approval: ${listing.publicId}`,
        message: `${user.name} edited live listing ${listing.publicId}. Previous version stays public until you approve or reject the changes.`,
        read: false,
        createdAt: now,
      });
    } else {
      listing.data = updatedData;
      if (submitMode === 'pending_review') {
        listing.status = 'pending_review';
        listing.rejectionOrUnlistReason = undefined;
        state.notifications.unshift({
          id: `notif-${crypto.randomBytes(6).toString('hex')}`,
          recipientRole: 'owner',
          type: 'new_submission',
          listingId: listing.id,
          publicId: listing.publicId,
          title: `Listing Submitted for Approval: ${listing.publicId}`,
          message: `${user.name} submitted ${listing.publicId} ("${updatedData.title}") for Owner approval.`,
          read: false,
          createdAt: now,
        });
      }
      listing.updatedAt = now;
    }

    store.save();
    res.json({ listing });
  });

  // Immediate Unlisting by Authorised User (no company approval needed!)
  app.post('/api/listings/:id/unlist', requireAuth, (req, res) => {
    const user = (req as express.Request & { user: UserAccount }).user;
    const { reason, note } = req.body ?? {};
    if (!reason || (reason === 'Other' && !String(note || '').trim())) {
      res.status(400).json({ error: 'Please provide an unlist reason.' });
      return;
    }

    const state = store.getState();
    const listing = state.listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }
    if (listing.submitterUserId !== user.id && !user.isOwnerAdmin) {
      res.status(403).json({ error: 'Not authorised to unlist this property.' });
      return;
    }

    const now = new Date().toISOString();
    listing.status = 'unlisted';
    listing.unlistedBy = 'user';
    listing.pendingEdit = undefined; // Prevent stale edit from reviving unlisted listing
    listing.rejectionOrUnlistReason =
      reason === 'Other' ? `Other: ${String(note).trim()}` : String(reason);
    listing.updatedAt = now;

    state.notifications.unshift({
      id: `notif-${crypto.randomBytes(6).toString('hex')}`,
      recipientRole: 'owner',
      type: 'user_unlist',
      listingId: listing.id,
      publicId: listing.publicId,
      title: `User Unlisted Property: ${listing.publicId}`,
      message: `${user.name} (+91 ${user.mobile}) unlisted ${listing.publicId}. Reason: ${listing.rejectionOrUnlistReason}. Removed from public search immediately.`,
      read: false,
      createdAt: now,
    });

    store.save();
    res.json({ listing });
  });

  // Relist Request (always requires fresh Owner approval)
  app.post('/api/listings/:id/relist', requireAuth, (req, res) => {
    const user = (req as express.Request & { user: UserAccount }).user;
    const state = store.getState();
    const listing = state.listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }
    if (listing.submitterUserId !== user.id) {
      res.status(403).json({ error: 'Not authorised.' });
      return;
    }

    const now = new Date().toISOString();
    listing.status = 'pending_review';
    listing.verificationLevel = 'none';
    listing.rejectionOrUnlistReason = undefined;
    listing.unlistedBy = undefined;
    listing.updatedAt = now;

    state.notifications.unshift({
      id: `notif-${crypto.randomBytes(6).toString('hex')}`,
      recipientRole: 'owner',
      type: 'new_submission',
      listingId: listing.id,
      publicId: listing.publicId,
      title: `Relist Approval Requested: ${listing.publicId}`,
      message: `${user.name} requested relisting for ${listing.publicId}. Needs fresh Owner approval before going live.`,
      read: false,
      createdAt: now,
    });

    store.save();
    res.json({ listing });
  });

  // Suggest Missing Berasia Locality
  app.post('/api/localities/suggest', requireAuth, (req, res) => {
    const user = (req as express.Request & { user: UserAccount }).user;
    const { suggestedName, panchayatOrWard } = req.body ?? {};
    if (!suggestedName?.trim()) {
      res.status(400).json({ error: 'Please enter the locality / village name in Berasia.' });
      return;
    }
    const state = store.getState();
    const now = new Date().toISOString();
    const item: MissingLocalitySuggestion = {
      id: `loc-sug-${crypto.randomBytes(4).toString('hex')}`,
      suggestedName: String(suggestedName).trim(),
      panchayatOrWard: String(panchayatOrWard || 'Berasia Tehsil, Bhopal').trim(),
      submittedByName: user.name,
      submittedByMobile: user.mobile,
      status: 'pending',
      createdAt: now,
    };
    state.localitySuggestions.unshift(item);
    state.notifications.unshift({
      id: `notif-${crypto.randomBytes(6).toString('hex')}`,
      recipientRole: 'owner',
      type: 'missing_locality',
      title: `Missing Berasia Locality Suggested: ${item.suggestedName}`,
      message: `${user.name} suggested adding "${item.suggestedName}" (${item.panchayatOrWard}) to the Berasia locality master list.`,
      read: false,
      createdAt: now,
    });
    store.save();
    res.status(201).json({ suggestion: item });
  });

  // ==========================================
  // OWNER / ADMIN BACKEND ROUTES (PRIVATE)
  // ==========================================
  app.get('/api/admin/overview', requireOwner, (_req, res) => {
    const state = store.getState();
    res.json({
      listings: state.listings,
      enquiries: state.enquiries,
      users: state.users.filter((u) => !u.isOwnerAdmin),
      feeRecords: state.feeRecords,
      notifications: state.notifications.filter((n) => n.recipientRole === 'owner'),
      localitySuggestions: state.localitySuggestions,
    });
  });

  app.post('/api/admin/users/:id/call-verify', requireOwner, (req, res) => {
    const state = store.getState();
    const user = state.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    user.callVerified = Boolean(req.body?.callVerified);
    store.save();
    res.json({ user });
  });

  app.post('/api/admin/listings/:id/review', requireOwner, (req, res) => {
    const owner = (req as express.Request & { user: UserAccount }).user;
    const {
      decision, // 'approve' | 'reject' | 'unlist' | 'approve_edit' | 'reject_edit' | 'update_verification'
      verificationLevel,
      verificationScopeNote,
      expertReference,
      expertConclusion,
      staffNotes,
      reason,
    } = req.body as {
      decision: 'approve' | 'reject' | 'unlist' | 'approve_edit' | 'reject_edit' | 'update_verification';
      verificationLevel?: VerificationLevel;
      verificationScopeNote?: string;
      expertReference?: string;
      expertConclusion?: string;
      staffNotes?: string;
      reason?: string;
    };

    const state = store.getState();
    const listing = state.listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    const now = new Date().toISOString();

    if (staffNotes !== undefined) {
      listing.staffNotes = String(staffNotes);
    }

    if (decision === 'approve' || decision === 'update_verification') {
      const level: VerificationLevel =
        verificationLevel === 'level_2'
          ? 'level_2'
          : verificationLevel === 'level_1'
          ? 'level_1'
          : listing.verificationLevel === 'none'
          ? 'level_1'
          : listing.verificationLevel;

      if (level === 'level_2' && !String(expertReference || listing.expertReference || '').trim()) {
        res.status(400).json({
          error: 'Detailed Expert Review (Level 2) requires an expert/report reference.',
        });
        return;
      }

      if (level !== listing.verificationLevel) {
        listing.verificationAudit.unshift({
          at: now,
          actorName: owner.name,
          previousLevel: listing.verificationLevel,
          newLevel: level,
          reason:
            String(verificationScopeNote || '').trim() ||
            VERIFICATION_DESCRIPTIONS[level].shortLabel,
        });
      }

      listing.verificationLevel = level;
      listing.verificationScopeNote =
        String(verificationScopeNote || '').trim() ||
        listing.verificationScopeNote ||
        VERIFICATION_DESCRIPTIONS[level].meaning;
      listing.verifiedAt = now;
      if (expertReference !== undefined) listing.expertReference = String(expertReference);
      if (expertConclusion !== undefined) listing.expertConclusion = String(expertConclusion);

      if (decision === 'approve') {
        listing.status = 'live';
        listing.rejectionOrUnlistReason = undefined;
        listing.unlistedBy = undefined;

        state.notifications.unshift({
          id: `notif-${crypto.randomBytes(6).toString('hex')}`,
          recipientRole: 'user',
          recipientUserId: listing.submitterUserId,
          type: 'owner_decision',
          listingId: listing.id,
          publicId: listing.publicId,
          title: `Property Approved & Live: ${listing.publicId}`,
          message: `Your property "${listing.data.title}" (${listing.publicId}) has been approved by Berasia Property Adda and is now live on the website.`,
          read: false,
          createdAt: now,
        });
      }
    } else if (decision === 'reject' || decision === 'unlist') {
      const cleanReason = String(reason || '').trim();
      if (!cleanReason) {
        res.status(400).json({ error: 'Please specify a reason for rejecting/removing this listing.' });
        return;
      }
      listing.status = decision === 'reject' ? 'rejected' : 'unlisted';
      listing.unlistedBy = 'owner';
      listing.pendingEdit = undefined; // Reject any pending edit too
      listing.rejectionOrUnlistReason = cleanReason;

      state.notifications.unshift({
        id: `notif-${crypto.randomBytes(6).toString('hex')}`,
        recipientRole: 'user',
        recipientUserId: listing.submitterUserId,
        type: 'owner_decision',
        listingId: listing.id,
        publicId: listing.publicId,
        title: `Property Removed / Rejected: ${listing.publicId}`,
        message: `${listing.publicId} ("${listing.data.title}") was removed from public listing. Reason: ${cleanReason}`,
        read: false,
        createdAt: now,
      });
    } else if (decision === 'approve_edit') {
      if (listing.status !== 'live' || !listing.pendingEdit) {
        res.status(400).json({
          error: 'Stale edit rejected: only live listings with pending edits can apply an edit.',
        });
        return;
      }
      listing.data = listing.pendingEdit.data;
      listing.pendingEdit = undefined;
      state.notifications.unshift({
        id: `notif-${crypto.randomBytes(6).toString('hex')}`,
        recipientRole: 'user',
        recipientUserId: listing.submitterUserId,
        type: 'owner_decision',
        listingId: listing.id,
        publicId: listing.publicId,
        title: `Updated Details Approved: ${listing.publicId}`,
        message: `Your edited details for ${listing.publicId} have been approved and updated live.`,
        read: false,
        createdAt: now,
      });
    } else if (decision === 'reject_edit') {
      listing.pendingEdit = undefined;
      state.notifications.unshift({
        id: `notif-${crypto.randomBytes(6).toString('hex')}`,
        recipientRole: 'user',
        recipientUserId: listing.submitterUserId,
        type: 'owner_decision',
        listingId: listing.id,
        publicId: listing.publicId,
        title: `Edited Version Declined: ${listing.publicId}`,
        message: `Requested changes to ${listing.publicId} were not approved. Reason: ${
          reason || 'Verification mismatch'
        }.`,
        read: false,
        createdAt: now,
      });
    }

    listing.updatedAt = now;
    store.save();
    res.json({ listing });
  });

  app.patch('/api/admin/enquiries/:id', requireOwner, (req, res) => {
    const state = store.getState();
    const enquiry = state.enquiries.find((e) => e.id === req.params.id);
    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }
    if (req.body.status === 'contacted' || req.body.status === 'not_contacted') {
      enquiry.status = req.body.status;
    }
    if (req.body.staffNote !== undefined) {
      enquiry.staffNote = String(req.body.staffNote);
    }
    store.save();
    res.json({ enquiry });
  });

  app.post('/api/admin/fees', requireOwner, (req, res) => {
    const { listingId, finalAgreedAmount, notes } = req.body ?? {};
    const amount = Number(finalAgreedAmount);
    if (!listingId || !amount || amount <= 0) {
      res.status(400).json({ error: 'Select a listing and enter a valid final agreed amount.' });
      return;
    }
    const state = store.getState();
    const listing = state.listings.find((l) => l.id === listingId);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    const now = new Date().toISOString();
    let feeRecord: FeeRecord;
    if (listing.workflow === 'sale') {
      const buyerFee = Math.round(amount * 0.01);
      feeRecord = {
        id: `fee-${crypto.randomBytes(5).toString('hex')}`,
        listingId: listing.id,
        publicId: listing.publicId,
        workflow: 'sale',
        finalAgreedAmount: amount,
        sellerFee: 0,
        buyerFee,
        landlordFee: 0,
        tenantFee: 0,
        totalCompanyFee: buyerFee,
        dueEvent: 'Day of final documentation',
        status: 'pending',
        notes: String(notes || '').trim(),
        recordedAt: now,
      };
    } else {
      const halfRent = Math.round(amount * 0.5);
      feeRecord = {
        id: `fee-${crypto.randomBytes(5).toString('hex')}`,
        listingId: listing.id,
        publicId: listing.publicId,
        workflow: 'rent',
        finalAgreedAmount: amount,
        sellerFee: 0,
        buyerFee: 0,
        landlordFee: halfRent,
        tenantFee: halfRent,
        totalCompanyFee: halfRent * 2,
        dueEvent: 'Rent agreement execution',
        status: 'pending',
        notes: String(notes || '').trim(),
        recordedAt: now,
      };
    }

    state.feeRecords.unshift(feeRecord);
    store.save();
    res.status(201).json({ feeRecord });
  });

  app.patch('/api/admin/fees/:id', requireOwner, (req, res) => {
    const state = store.getState();
    const record = state.feeRecords.find((f) => f.id === req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Fee record not found.' });
      return;
    }
    if (req.body.status === 'collected' || req.body.status === 'pending') {
      record.status = req.body.status;
    }
    store.save();
    res.json({ feeRecord: record });
  });

  app.post('/api/admin/localities/:id/resolve', requireOwner, (req, res) => {
    const { action } = req.body ?? {};
    const state = store.getState();
    const sug = state.localitySuggestions.find((s) => s.id === req.params.id);
    if (!sug) {
      res.status(404).json({ error: 'Suggestion not found.' });
      return;
    }
    if (action === 'add') {
      sug.status = 'added';
      state.localities.push({
        id: `loc-${crypto.randomBytes(4).toString('hex')}`,
        nameEn: sug.suggestedName,
        nameHi: sug.suggestedName,
        type: 'Gram Panchayat / Village',
        tehsil: 'Berasia',
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        panchayatOrWard: sug.panchayatOrWard,
      });
    } else {
      sug.status = 'dismissed';
    }
    store.save();
    res.json({ suggestion: sug, localities: state.localities });
  });

  app.post('/api/admin/notifications/read', requireOwner, (_req, res) => {
    const state = store.getState();
    state.notifications
      .filter((n) => n.recipientRole === 'owner')
      .forEach((n) => {
        n.read = true;
      });
    store.save();
    res.json({ ok: true });
  });

  // Vite dev middleware or static dist serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Berasia Property Adda running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
