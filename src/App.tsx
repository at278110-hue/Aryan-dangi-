import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  LogOut,
  Phone,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { MyActivityView } from './components/MyActivityView';
import { OwnerDashboard } from './components/OwnerDashboard';
import { PropertyCard } from './components/PropertyCard';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { SubmitPropertyForm } from './components/SubmitPropertyForm';
import { api, getStoredToken, setStoredToken } from './lib/api';
import {
  BERASIA_LOCALITIES,
  BOUNDARY_LABEL,
  BRAND_NAME,
  BRAND_NAME_HI,
  COMPANY_PHONE,
  COMPANY_PHONE_RAW,
  RENT_CATEGORIES,
  SALE_CATEGORIES,
} from './shared/constants';
import type {
  BerasiaLocality,
  ListingRecord,
  NotificationItem,
  PublicListingView,
  UserAccount,
  WorkflowType,
} from './shared/types';

type AppPage = 'buy' | 'rent' | 'submit' | 'activity' | 'owner';

export default function App() {
  const [page, setPage] = useState<AppPage>('buy');
  const [localities, setLocalities] = useState<BerasiaLocality[]>(BERASIA_LOCALITIES);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Public listings & filters
  const [listings, setListings] = useState<PublicListingView[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [localityFilter, setLocalityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [minSqYdFilter, setMinSqYdFilter] = useState('');
  const [furnishingFilter, setFurnishingFilter] = useState('all');

  // User Activity
  const [myListings, setMyListings] = useState<ListingRecord[]>([]);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);
  const [nonInterestedIds, setNonInterestedIds] = useState<string[]>([]);
  const [myNotifications, setMyNotifications] = useState<NotificationItem[]>([]);

  // Modals & Toast Feedback
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'user' | 'owner'>('user');
  const [selectedListing, setSelectedListing] = useState<PublicListingView | null>(null);
  const [editingListing, setEditingListing] = useState<ListingRecord | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string>('');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const workflow: WorkflowType = page === 'rent' ? 'rent' : 'sale';

  const loadMeta = async () => {
    try {
      const meta = await api.getMeta();
      setLocalities(meta.localities);
    } catch {
      // fallback to local constant list
    }
  };

  const loadListings = async (activeWorkflow: WorkflowType = workflow) => {
    setLoadingListings(true);
    try {
      const res = await api.getPublicListings({
        workflow: activeWorkflow,
        localityId: localityFilter,
        category: categoryFilter,
        maxPrice: maxPriceFilter,
        minSqYd: minSqYdFilter,
        furnishing: activeWorkflow === 'rent' ? furnishingFilter : undefined,
        q: searchQuery,
      });
      setListings(res.listings);
    } catch {
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  };

  const loadMyActivity = async (user: UserAccount | null = currentUser) => {
    if (!user) {
      setMyListings([]);
      setInterestedIds([]);
      setNonInterestedIds([]);
      setMyNotifications([]);
      return;
    }
    try {
      const act = await api.getMyActivity();
      setMyListings(act.myListings);
      setInterestedIds(act.interestedListingIds);
      setNonInterestedIds(act.nonInterestedListingIds);
      setMyNotifications(act.notifications);
    } catch {
      // ignore if session expired
    }
  };

  useEffect(() => {
    loadMeta();
    const token = getStoredToken();
    if (token) {
      api
        .getMe()
        .then((res) => {
          setCurrentUser(res.user);
          loadMyActivity(res.user);
        })
        .catch(() => {
          setStoredToken(null);
        });
    }
  }, []);

  useEffect(() => {
    if (page === 'buy' || page === 'rent') {
      loadListings(page === 'rent' ? 'rent' : 'sale');
    }
  }, [page, localityFilter, categoryFilter, maxPriceFilter, minSqYdFilter, furnishingFilter, searchQuery]);

  const switchPage = (next: AppPage) => {
    if (next === 'buy' || next === 'rent') {
      setCategoryFilter('all');
      setFurnishingFilter('all');
    }
    if (next !== 'submit') {
      setEditingListing(null);
    }
    setPage(next);
  };

  const handleSignOut = async () => {
    await api.logout().catch(() => {});
    setStoredToken(null);
    setCurrentUser(null);
    setMyListings([]);
    setInterestedIds([]);
    setNonInterestedIds([]);
    setMyNotifications([]);
    if (page === 'owner') {
      setPage('buy');
    }
  };

  const handleInterestAction = async (
    listingId: string,
    action: 'interested' | 'non_interested'
  ) => {
    const res = await api.markInterest(listingId, action);
    if (res.state === 'interested') {
      setInterestedIds((prev) => (prev.includes(listingId) ? prev : [...prev, listingId]));
      setNonInterestedIds((prev) => prev.filter((id) => id !== listingId));
      setBannerNotice(
        'Your interest has been registered with Berasia Property Adda. Our team will call you shortly.'
      );
    } else {
      setNonInterestedIds((prev) => (prev.includes(listingId) ? prev : [...prev, listingId]));
    }
  };

  const handleListingSubmitted = async (
    listing: ListingRecord,
    mode: 'draft' | 'pending_review'
  ) => {
    setEditingListing(null);
    await loadMyActivity();
    if (mode === 'pending_review') {
      setBannerNotice(
        `Property ${listing.publicId} submitted to the Owner Backend Board. It stays hidden from the public website until Owner approval.`
      );
    } else {
      setBannerNotice(`Private draft ${listing.publicId} saved.`);
    }
    setPage('activity');
  };

  const openSignIn = (tab: 'user' | 'owner' = 'user') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const interestedPublicListings = listings.filter((l) => interestedIds.includes(l.id));
  const activeCategories = workflow === 'sale' ? SALE_CATEGORIES : RENT_CATEGORIES;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F6] text-zinc-900">
      {/* Strict 3-Zone Single-Row Top Bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          {/* Zone 1: Single Text Brand Wordmark */}
          <button
            type="button"
            onClick={() => switchPage('buy')}
            className="font-display text-lg font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
          >
            {BRAND_NAME}
          </button>

          {/* Zone 2: Concise Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
            <button
              type="button"
              onClick={() => switchPage('buy')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-900 ${
                page === 'buy' ? 'font-semibold text-emerald-900 underline underline-offset-4' : ''
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => switchPage('rent')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-900 ${
                page === 'rent' ? 'font-semibold text-emerald-900 underline underline-offset-4' : ''
              }`}
            >
              Rent
            </button>
            <button
              type="button"
              onClick={() => switchPage('submit')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-900 ${
                page === 'submit'
                  ? 'font-semibold text-emerald-900 underline underline-offset-4'
                  : ''
              }`}
            >
              Submit Property
            </button>
            <button
              type="button"
              onClick={() => switchPage('activity')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-900 ${
                page === 'activity'
                  ? 'font-semibold text-emerald-900 underline underline-offset-4'
                  : ''
              }`}
            >
              My Activity
            </button>
            <button
              type="button"
              onClick={() => switchPage('owner')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-900 ${
                page === 'owner'
                  ? 'font-semibold text-emerald-900 underline underline-offset-4'
                  : ''
              }`}
            >
              Owner Board
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => switchPage(currentUser.isOwnerAdmin ? 'owner' : 'activity')}
                  className="max-w-[150px] truncate rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 whitespace-nowrap"
                >
                  {currentUser.name}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openSignIn('user')}
                className="rounded-lg bg-emerald-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
              >
                Mobile Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Quick Navigation Row */}
        <div className="flex items-center gap-4 overflow-x-auto border-t border-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 md:hidden">
          {[
            { id: 'buy', label: 'Buy' },
            { id: 'rent', label: 'Rent' },
            { id: 'submit', label: 'Submit Property' },
            { id: 'activity', label: 'My Activity' },
            { id: 'owner', label: 'Owner Board' },
          ].map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => switchPage(nav.id as AppPage)}
              className={`whitespace-nowrap shrink-0 ${
                page === nav.id ? 'font-semibold text-emerald-900' : ''
              }`}
            >
              {nav.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {bannerNotice && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-800" />
              <span>{bannerNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerNotice('')}
              className="text-xs font-semibold text-emerald-900 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {(page === 'buy' || page === 'rent') && (
          <div className="space-y-10">
            {/* Hero Section (Split-column with equal stretch) */}
            <section className="grid items-stretch gap-8 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 lg:grid-cols-12">
              <div className="flex flex-col justify-between space-y-6 lg:col-span-6">
                <div>
                  <div className="text-xs font-semibold text-emerald-900">
                    {BOUNDARY_LABEL} · {BRAND_NAME_HI}
                  </div>
                  <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl text-balance">
                    {page === 'buy'
                      ? 'Owner-Reviewed Homes, Plots & Agricultural Land in Berasia'
                      : 'Verified Rental Homes, Shops & Warehouses in Berasia'}
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600">
                    Every listing on {BRAND_NAME} is reviewed by our Owner team with document checks
                    and direct verification calls before going live. Exact addresses, Khasra
                    numbers, and owner phone numbers stay protected.
                  </p>
                </div>

                {/* Role / Workflow Switcher inside Hero Workspace Toolbar */}
                <div className="space-y-3">
                  <div className="inline-flex rounded-lg bg-zinc-100 p-1">
                    <button
                      type="button"
                      onClick={() => switchPage('buy')}
                      className={`rounded-md px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                        page === 'buy'
                          ? 'bg-white text-zinc-900 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Buy Properties
                    </button>
                    <button
                      type="button"
                      onClick={() => switchPage('rent')}
                      className={`rounded-md px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                        page === 'rent'
                          ? 'bg-white text-zinc-900 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Rent Properties
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => switchPage('submit')}
                      className="rounded-lg bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
                    >
                      Add Your Property (Goes to Owner Review)
                    </button>
                    <a
                      href={`tel:+91${COMPANY_PHONE_RAW}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
                    >
                      <Phone className="h-4 w-4 text-emerald-900" />
                      <span>{COMPANY_PHONE}</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-64 w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 lg:h-full lg:min-h-[300px]">
                  {!heroImgFailed ? (
                    <img
                      src="/src/assets/images/hero_berasia_estate_1794825883496.jpg"
                      alt="Residential property in Berasia, Bhopal District"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-100 text-zinc-500">
                      <Building2 className="h-10 w-10 text-zinc-400" />
                      <span className="mt-2 text-xs font-medium">{BRAND_NAME}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Search & Filter Toolbar */}
            <section className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div className="relative lg:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ID (e.g. BPA-S-1001) or keyword"
                    className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
                  />
                </div>

                <select
                  value={localityFilter}
                  onChange={(e) => setLocalityFilter(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
                >
                  <option value="all">All Berasia Localities</option>
                  {localities.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.nameEn}
                    </option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {activeCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(e.target.value)}
                  placeholder={page === 'buy' ? 'Max Budget (₹)' : 'Max Rent (₹)'}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
                />

                {page === 'rent' ? (
                  <select
                    value={furnishingFilter}
                    onChange={(e) => setFurnishingFilter(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
                  >
                    <option value="all">Any Furnishing</option>
                    <option value="Unfurnished">Unfurnished</option>
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Furnished">Furnished</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={minSqYdFilter}
                    onChange={(e) => setMinSqYdFilter(e.target.value)}
                    placeholder="Min Area (Sq Yd)"
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
                  />
                )}
              </div>
            </section>

            {/* Live Approved Listings Grid */}
            <section className="space-y-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold text-zinc-900">
                    {page === 'buy'
                      ? 'Approved Properties for Sale'
                      : 'Approved Properties for Rent'}
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    Showing {listings.length} Owner-approved{' '}
                    {page === 'buy' ? 'sale' : 'rental'} listings in Berasia, Bhopal
                  </p>
                </div>

                {(localityFilter !== 'all' ||
                  categoryFilter !== 'all' ||
                  maxPriceFilter ||
                  minSqYdFilter ||
                  furnishingFilter !== 'all' ||
                  searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setLocalityFilter('all');
                      setCategoryFilter('all');
                      setMaxPriceFilter('');
                      setMinSqYdFilter('');
                      setFurnishingFilter('all');
                    }}
                    className="text-xs font-semibold text-emerald-900 underline"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {loadingListings ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-80 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100"
                    />
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
                  <p className="text-sm font-medium text-zinc-800">
                    No approved properties matched your filters in Berasia.
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    New user submissions stay in the Owner Backend until approved.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {listings.map((item) => (
                    <PropertyCard
                      key={item.id}
                      listing={item}
                      interestState={
                        interestedIds.includes(item.id)
                          ? 'interested'
                          : nonInterestedIds.includes(item.id)
                          ? 'non_interested'
                          : null
                      }
                      onSelect={(l) => setSelectedListing(l)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Transparent Mediation & Commission Rules */}
            <section className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 lg:grid-cols-3">
              <div>
                <div className="flex items-center gap-2 font-display text-base font-bold text-zinc-900">
                  <ShieldCheck className="h-5 w-5 text-emerald-900" />
                  <span>Two-Level Verification</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  Every approved property carries either <strong>Level 1 (Basic Document Review)</strong>{' '}
                  or <strong>Level 2 (Detailed Expert Review)</strong> assigned by the Owner. Neither
                  level is a blanket legal promise.
                </p>
              </div>
              <div>
                <div className="font-display text-base font-bold text-zinc-900">
                  Sale Mediation Fee
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  <strong>Seller Fee: ₹0 (0%).</strong> Buyer pays <strong>1%</strong> of the final
                  agreed net transaction amount only on the day of final documentation.
                </p>
              </div>
              <div>
                <div className="font-display text-base font-bold text-zinc-900">
                  Rental Mediation Fee
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  Landlord pays <strong>50%</strong> and Tenant pays <strong>50%</strong> of one
                  month’s final agreed rent, collected once when the rent agreement is executed.
                </p>
              </div>
            </section>
          </div>
        )}

        {page === 'submit' && (
          <SubmitPropertyForm
            currentUser={currentUser}
            localities={localities}
            editingListing={editingListing}
            onRequireSignIn={() => openSignIn('user')}
            onSubmitted={handleListingSubmitted}
            onCancelEdit={
              editingListing
                ? () => {
                    setEditingListing(null);
                    setPage('activity');
                  }
                : undefined
            }
          />
        )}

        {page === 'activity' && (
          <MyActivityView
            currentUser={currentUser}
            myListings={myListings}
            notifications={myNotifications}
            interestedListings={interestedPublicListings}
            onRequireSignIn={() => openSignIn('user')}
            onEditListing={(listing) => {
              setEditingListing(listing);
              setPage('submit');
            }}
            onRefresh={async () => {
              await loadMyActivity();
              await loadListings(workflow);
            }}
            onSelectPublicListing={(l) => setSelectedListing(l)}
          />
        )}

        {page === 'owner' && (
          <OwnerDashboard
            currentUser={currentUser}
            onRequireOwnerSignIn={() => openSignIn('owner')}
            onDataChanged={async () => {
              await loadMeta();
              await loadListings(workflow);
              await loadMyActivity();
            }}
          />
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 py-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:px-6">
          <div>
            <span className="font-display font-semibold text-zinc-900">{BRAND_NAME}</span> ·{' '}
            {BOUNDARY_LABEL}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`tel:+91${COMPANY_PHONE_RAW}`}
              className="font-mono font-semibold text-zinc-800 hover:underline"
            >
              Helpline: {COMPANY_PHONE}
            </a>
            <button
              type="button"
              onClick={() => openSignIn('owner')}
              className="font-semibold text-zinc-700 hover:text-zinc-900 hover:underline"
            >
              Owner Portal Login
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={async (user) => {
          setCurrentUser(user);
          await loadMyActivity(user);
          if (user.isOwnerAdmin) {
            setPage('owner');
          }
        }}
      />

      <PropertyDetailModal
        listing={selectedListing}
        currentUser={currentUser}
        interestState={
          selectedListing
            ? interestedIds.includes(selectedListing.id)
              ? 'interested'
              : nonInterestedIds.includes(selectedListing.id)
              ? 'non_interested'
              : null
            : null
        }
        onClose={() => setSelectedListing(null)}
        onInterestAction={handleInterestAction}
        onRequireSignIn={() => {
          setSelectedListing(null);
          openSignIn('user');
        }}
      />
    </div>
  );
}
