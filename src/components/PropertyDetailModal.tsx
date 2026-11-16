import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Phone,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Video,
  X,
} from 'lucide-react';
import {
  BOUNDARY_LABEL,
  BRAND_NAME,
  CATEGORY_LABELS,
  COMPANY_PHONE_RAW,
  formatAreaUnitLabel,
  formatINR,
  VERIFICATION_DESCRIPTIONS,
} from '../shared/constants';
import type { PublicListingView, UserAccount } from '../shared/types';

interface PropertyDetailModalProps {
  listing: PublicListingView | null;
  currentUser: UserAccount | null;
  interestState?: 'interested' | 'non_interested' | null;
  onClose: () => void;
  onInterestAction: (listingId: string, action: 'interested' | 'non_interested') => Promise<void>;
  onRequireSignIn: () => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  listing,
  currentUser,
  interestState,
  onClose,
  onInterestAction,
  onRequireSignIn,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showVideo1, setShowVideo1] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  React.useEffect(() => {
    setActivePhotoIndex(0);
    setShowVideo1(false);
    setActionError('');
  }, [listing?.id]);

  if (!listing) return null;

  const verInfo =
    listing.verificationLevel === 'level_2'
      ? VERIFICATION_DESCRIPTIONS.level_2
      : listing.verificationLevel === 'level_1'
      ? VERIFICATION_DESCRIPTIONS.level_1
      : null;

  const handleInterest = async (action: 'interested' | 'non_interested') => {
    if (!currentUser) {
      onRequireSignIn();
      return;
    }
    setActionError('');
    setSubmitting(true);
    try {
      await onInterestAction(listing.id, action);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to register response');
    } finally {
      setSubmitting(false);
    }
  };

  const detailsEntries = Object.entries(listing.conditionalDetails || {}).filter(
    ([, v]) => v !== undefined && v !== ''
  );

  const labelMap: Record<string, string> = {
    bhkRooms: 'Rooms / BHK',
    bathrooms: 'Bathrooms',
    floors: 'Floors',
    constructionAge: 'Construction Condition / Age',
    furnishing: 'Furnishing',
    parking: 'Parking',
    powerBackup: 'Power / Backup',
    waterSupply: 'Water Supply',
    balcony: 'Balcony / Veranda',
    kitchen: 'Kitchen',
    separateOrShared: 'Access / Facilities',
    dimensions: 'Dimensions',
    frontageRoadWidth: 'Frontage Road Width',
    facing: 'Facing',
    cornerStatus: 'Corner Status',
    boundaryWall: 'Boundary Wall',
    utilities: 'Utilities',
    statedApproval: 'Stated Use / Approval',
    irrigationSource: 'Irrigation / Water Source',
    tubewellElectricity: 'Tubewell / Electricity',
    accessWidth: 'Approach Road Width',
    presentCultivation: 'Present Cultivation / Use',
    parcelContiguity: 'Parcel Layout',
    saleShareType: 'Sale Share',
    estateOrStandalone: 'Estate / Standalone',
    approvedUse: 'Current / Stated Approved Use',
    supportingRecords: 'Supporting Records',
    truckAccess: 'Truck Access',
    powerCapacity: 'Power Capacity',
    drainage: 'Drainage',
    shedOrVacant: 'Structure Type',
    freeholdOrLeasehold: 'Ownership Tenure',
    clearHeight: 'Clear Height',
    loadingSpace: 'Loading Space',
    frontageAccess: 'Frontage / Road Access',
    washrooms: 'Washrooms',
    fitOut: 'Fit-out',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/65 p-3 sm:p-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="font-mono font-semibold text-zinc-900">{listing.publicId}</span>
              <span aria-hidden="true">·</span>
              <span>{listing.workflow === 'sale' ? 'For Sale' : 'For Rent'}</span>
              <span aria-hidden="true">·</span>
              <span>{CATEGORY_LABELS[listing.category]}</span>
            </div>
            <h2 className="mt-0.5 truncate font-display text-lg font-bold text-zinc-900 sm:text-xl">
              {listing.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close property details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Media & Specs Column */}
            <div className="space-y-6 lg:col-span-7">
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                <div className="aspect-[16/10] w-full bg-zinc-900">
                  {showVideo1 && listing.video1 ? (
                    <video
                      src={listing.video1.dataUrl}
                      controls
                      className="h-full w-full object-contain"
                    />
                  ) : listing.photos[activePhotoIndex] ? (
                    <img
                      src={listing.photos[activePhotoIndex].dataUrl}
                      alt={listing.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-100 text-zinc-500">
                      <Building2 className="h-10 w-10 text-zinc-400" />
                      <span className="mt-2 text-xs">No public photo uploaded</span>
                    </div>
                  )}
                </div>

                {(listing.photos.length > 1 || listing.video1) && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 bg-white p-3">
                    {listing.photos.map((ph, idx) => (
                      <button
                        key={ph.id}
                        type="button"
                        onClick={() => {
                          setShowVideo1(false);
                          setActivePhotoIndex(idx);
                        }}
                        className={`h-14 w-20 overflow-hidden rounded-md border transition-all ${
                          !showVideo1 && activePhotoIndex === idx
                            ? 'border-emerald-900 ring-2 ring-emerald-900/20'
                            : 'border-zinc-200 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={ph.dataUrl}
                          alt={ph.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                    {listing.video1 && (
                      <button
                        type="button"
                        onClick={() => setShowVideo1(true)}
                        className={`flex h-14 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold ${
                          showVideo1
                            ? 'border-emerald-900 bg-emerald-50 text-emerald-900'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <Video className="h-4 w-4" />
                        <span>Video 1 (Property)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-display text-sm font-semibold text-zinc-900">
                  Property Overview & Availability
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{listing.description}</p>
              </div>

              {/* Conditional Specifications */}
              {detailsEntries.length > 0 && (
                <div className="border-t border-zinc-200 pt-5">
                  <h3 className="font-display text-sm font-semibold text-zinc-900">
                    Property Specifications
                  </h3>
                  <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {detailsEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5"
                      >
                        <dt className="text-xs text-zinc-500">{labelMap[key] || key}</dt>
                        <dd className="mt-0.5 text-sm font-medium text-zinc-900">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Rental Specific Terms */}
              {listing.workflow === 'rent' && listing.rentalTerms && (
                <div className="border-t border-zinc-200 pt-5">
                  <h3 className="font-display text-sm font-semibold text-zinc-900">
                    Rental & Tenancy Terms
                  </h3>
                  <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5">
                      <dt className="text-xs text-zinc-500">Offered Unit</dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                        {listing.rentalTerms.offeredUnit}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5">
                      <dt className="text-xs text-zinc-500">Availability Date</dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                        {listing.rentalTerms.availabilityDate}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5">
                      <dt className="text-xs text-zinc-500">Security Deposit</dt>
                      <dd className="mt-0.5 font-mono text-sm font-medium text-zinc-900">
                        {listing.rentalTerms.securityDepositStatus === 'Amount Specified' &&
                        listing.rentalTerms.securityDepositAmount
                          ? formatINR(listing.rentalTerms.securityDepositAmount)
                          : listing.rentalTerms.securityDepositStatus}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5">
                      <dt className="text-xs text-zinc-500">Maintenance</dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                        {listing.rentalTerms.maintenanceStatus}
                        {listing.rentalTerms.maintenanceAmount
                          ? ` (${formatINR(listing.rentalTerms.maintenanceAmount)})`
                          : ''}
                      </dd>
                    </div>
                    {listing.rentalTerms.electricityWaterTerms && (
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 sm:col-span-2">
                        <dt className="text-xs text-zinc-500">Electricity & Water Responsibility</dt>
                        <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                          {listing.rentalTerms.electricityWaterTerms}
                        </dd>
                      </div>
                    )}
                    {listing.rentalTerms.leaseDuration && (
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5">
                        <dt className="text-xs text-zinc-500">Lease Duration</dt>
                        <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                          {listing.rentalTerms.leaseDuration}
                        </dd>
                      </div>
                    )}
                    {listing.rentalTerms.noticePeriod && (
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5">
                        <dt className="text-xs text-zinc-500">Notice Period / Lock-in</dt>
                        <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                          {listing.rentalTerms.noticePeriod}
                          {listing.rentalTerms.lockInPeriod
                            ? ` · Lock-in: ${listing.rentalTerms.lockInPeriod}`
                            : ''}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>

            {/* Right Sticky Mediation & Interest Module */}
            <div className="space-y-5 lg:col-span-5">
              <div className="rounded-xl border border-zinc-200 bg-[#FAF9F6] p-5">
                <div className="text-xs font-medium text-zinc-500">
                  {listing.workflow === 'sale' ? 'Total Asking Price' : 'Total Rent'}
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-zinc-900">
                  {formatINR(listing.priceAmount)}
                  {listing.workflow === 'rent' && listing.rentalTerms && (
                    <span className="text-sm font-normal text-zinc-600">
                      {' '}
                      / {listing.rentalTerms.rentPeriod}
                      {listing.rentalTerms.negotiable ? ' (Negotiable)' : ''}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-4 text-sm">
                  <div>
                    <div className="text-xs text-zinc-500">Entered Area</div>
                    <div className="mt-0.5 font-mono font-semibold text-zinc-900">
                      {listing.areaValue.toLocaleString('en-IN')}{' '}
                      {formatAreaUnitLabel(listing.areaUnit)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Normalised Size</div>
                    <div className="mt-0.5 font-mono font-semibold text-zinc-900">
                      {listing.areaSqYd.toLocaleString('en-IN')} Sq Yd
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-zinc-500">Broad Locality ({BOUNDARY_LABEL})</div>
                    <div className="mt-0.5 font-medium text-zinc-900">{listing.localityName}</div>
                  </div>
                </div>

                {/* Interest Registration Buttons */}
                <div className="mt-5 border-t border-zinc-200 pt-5">
                  {actionError && (
                    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                      {actionError}
                    </div>
                  )}

                  {interestState === 'interested' ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-950">
                      <div className="flex items-center gap-2 font-semibold text-emerald-900">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Interest Registered</span>
                      </div>
                      <p className="mt-1 text-xs text-emerald-900/90">
                        Your enquiry with Property ID <span className="font-mono">{listing.publicId}</span>{' '}
                        has been sent to {BRAND_NAME} using your signed-in mobile account. Our team
                        will call you shortly to coordinate a site visit.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleInterest('interested')}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>
                          {currentUser
                            ? 'Interested — Request Call & Visit'
                            : 'Sign In to Mark Interested'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleInterest('non_interested')}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                        <span>
                          {interestState === 'non_interested'
                            ? 'Marked Non-Interested (You can still mark Interested above)'
                            : 'Non-Interested'}
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3.5">
                    <div className="text-xs font-medium text-zinc-500">
                      Company-Mediated Contact (Quote ID {listing.publicId})
                    </div>
                    <a
                      href={`tel:+91${COMPANY_PHONE_RAW}`}
                      className="mt-1.5 flex items-center justify-between rounded-md bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>Call {BRAND_NAME}</span>
                      </span>
                      <span className="font-mono text-xs">{listing.companyPhone}</span>
                    </a>
                    <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                      Exact house/plot/khasra numbers, ownership papers, surroundings video (Video
                      2), and owner phone numbers are kept strictly private for safety.
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Depth Disclosure */}
              {verInfo && (
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>{verInfo.title}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-700">
                    {listing.verificationScopeNote || verInfo.meaning}
                  </p>
                  {listing.verifiedAt && (
                    <div className="mt-2 text-[11px] text-zinc-500">
                      Reviewed on {new Date(listing.verifiedAt).toLocaleDateString('en-IN')} ·
                      Neither review level is a blanket legal guarantee.
                    </div>
                  )}
                </div>
              )}

              {/* Company Fee Transparency */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-600">
                <div className="font-semibold text-zinc-900">
                  Transparent Mediation Fee ({listing.workflow === 'sale' ? 'Sale' : 'Rental'})
                </div>
                {listing.workflow === 'sale' ? (
                  <p className="mt-1 leading-relaxed">
                    Seller fee: ₹0 (0%). Buyer fee: 1% of the final agreed net transaction amount,
                    payable only on final documentation day.
                  </p>
                ) : (
                  <p className="mt-1 leading-relaxed">
                    Landlord fee: 50% of 1 month’s final agreed rent. Tenant fee: 50% of 1 month’s
                    final agreed rent, collected once when rent agreement is executed.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
