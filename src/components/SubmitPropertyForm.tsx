import React, { useMemo, useState } from 'react';
import { FileText, ImagePlus, Lock, ShieldAlert, Trash2, Upload, Video } from 'lucide-react';
import { api } from '../lib/api';
import {
  AREA_UNITS,
  BOUNDARY_LABEL,
  convertArea,
  RENT_CATEGORIES,
  SALE_CATEGORIES,
} from '../shared/constants';
import type {
  AreaUnit,
  BerasiaLocality,
  ConditionalPropertyDetails,
  ListingRecord,
  ListingRevisionData,
  MediaUpload,
  PropertyCategory,
  RentalTerms,
  RentPeriod,
  SubmitterRelation,
  UserAccount,
  WorkflowType,
} from '../shared/types';

interface SubmitPropertyFormProps {
  currentUser: UserAccount | null;
  localities: BerasiaLocality[];
  editingListing?: ListingRecord | null;
  onRequireSignIn: () => void;
  onSubmitted: (listing: ListingRecord, mode: 'draft' | 'pending_review') => void;
  onCancelEdit?: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const SubmitPropertyForm: React.FC<SubmitPropertyFormProps> = ({
  currentUser,
  localities,
  editingListing,
  onRequireSignIn,
  onSubmitted,
  onCancelEdit,
}) => {
  const initialData = editingListing?.pendingEdit?.data || editingListing?.data;

  const [workflow, setWorkflow] = useState<WorkflowType>(initialData?.workflow || 'sale');
  const [category, setCategory] = useState<PropertyCategory>(
    initialData?.category || 'house'
  );
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [localityId, setLocalityId] = useState(
    initialData?.localityId || localities[0]?.id || 'loc-berasia-town'
  );

  // Suggest missing locality inline
  const [showSuggestLoc, setShowSuggestLoc] = useState(false);
  const [sugLocName, setSugLocName] = useState('');
  const [sugPanchayat, setSugPanchayat] = useState('');
  const [sugFeedback, setSugFeedback] = useState('');

  // Area & Price
  const [areaValue, setAreaValue] = useState<string>(
    initialData?.areaValue ? String(initialData.areaValue) : ''
  );
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(initialData?.areaUnit || 'sq_ft');
  const [priceAmount, setPriceAmount] = useState<string>(
    initialData?.priceAmount ? String(initialData.priceAmount) : ''
  );

  // Owner & Submitter
  const [submitterName, setSubmitterName] = useState(
    initialData?.privateData.submitterName || currentUser?.name || ''
  );
  const [submitterRelation, setSubmitterRelation] = useState<SubmitterRelation>(
    initialData?.privateData.submitterRelation || 'Self'
  );
  const [submitterRelationOther, setSubmitterRelationOther] = useState(
    initialData?.privateData.submitterRelationOther || ''
  );
  const [actualOwnerName, setActualOwnerName] = useState(
    initialData?.privateData.actualOwnerName || currentUser?.name || ''
  );
  const [authorityAccepted, setAuthorityAccepted] = useState(
    initialData?.privateData.authorityDeclarationAccepted ?? true
  );
  const [primaryMobile, setPrimaryMobile] = useState(
    initialData?.privateData.primaryContactMobile || currentUser?.mobile || ''
  );
  const [primaryRole, setPrimaryRole] = useState(
    initialData?.privateData.primaryContactRole || 'Owner'
  );
  const [alternateMobile, setAlternateMobile] = useState(
    initialData?.privateData.alternateContactMobile || ''
  );
  const [alternateRole, setAlternateRole] = useState(
    initialData?.privateData.alternateContactRole || 'Family Member'
  );

  // Private Address
  const [exactAddress, setExactAddress] = useState(
    initialData?.privateData.exactAddress || ''
  );
  const [plotOrHouseNumber, setPlotOrHouseNumber] = useState(
    initialData?.privateData.plotOrHouseNumber || ''
  );
  const [khasraOrSurveyNumber, setKhasraOrSurveyNumber] = useState(
    initialData?.privateData.khasraOrSurveyNumber || ''
  );
  const [revenueVillageOrHalka, setRevenueVillageOrHalka] = useState(
    initialData?.privateData.revenueVillageOrHalka || ''
  );
  const [landmark, setLandmark] = useState(initialData?.privateData.landmark || '');
  const [postcode, setPostcode] = useState(initialData?.privateData.postcode || '463106');

  // Conditional property fields
  const [cond, setCond] = useState<ConditionalPropertyDetails>(
    initialData?.conditionalDetails || {}
  );

  // Rental Terms
  const [rental, setRental] = useState<RentalTerms>(
    initialData?.rentalTerms || {
      offeredUnit: 'Whole Property',
      availabilityDate: 'Immediate',
      rentPeriod: 'monthly',
      negotiable: true,
      securityDepositStatus: 'Not Yet Decided',
      maintenanceStatus: 'Not Yet Decided',
      electricityWaterTerms: '',
      leaseDuration: '',
      lockInPeriod: '',
      noticePeriod: '',
      useConditions: '',
    }
  );

  // Media & Documents
  const [photos, setPhotos] = useState<MediaUpload[]>(initialData?.photos || []);
  const [video1, setVideo1] = useState<MediaUpload | undefined>(initialData?.video1);
  const [video2, setVideo2] = useState<MediaUpload | undefined>(
    initialData?.privateData.video2Surroundings
  );
  const [docs, setDocs] = useState<MediaUpload[]>(
    initialData?.privateData.ownershipDocuments || []
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (currentUser && !editingListing) {
      if (!submitterName) setSubmitterName(currentUser.name);
      if (submitterRelation === 'Self' && !actualOwnerName) setActualOwnerName(currentUser.name);
      if (!primaryMobile) setPrimaryMobile(currentUser.mobile);
    }
  }, [currentUser]);

  const handleWorkflowSwitch = (next: WorkflowType) => {
    if (editingListing) return;
    setWorkflow(next);
    setCategory(next === 'sale' ? 'house' : 'house_flat_room');
    setCond({});
  };

  const handleRelationChange = (rel: SubmitterRelation) => {
    setSubmitterRelation(rel);
    if (rel === 'Self') {
      setActualOwnerName(submitterName || currentUser?.name || '');
      setPrimaryRole('Owner');
    } else if (rel === 'Property Dealer') {
      setPrimaryRole('Property Dealer');
    } else {
      setPrimaryRole('Authorised Representative');
    }
  };

  const areaPreview = useMemo(() => {
    const val = Number(areaValue);
    if (!val || val <= 0) return null;
    return convertArea(val, areaUnit);
  }, [areaValue, areaUnit]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const uploaded: MediaUpload[] = [];
    for (const file of files) {
      if (file.size > 6 * 1024 * 1024) {
        setError('Each photo must be under 6 MB.');
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      uploaded.push({
        id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        dataUrl,
        mimeType: file.type,
      });
    }
    setPhotos((prev) => [...prev, ...uploaded]);
    e.target.value = '';
  };

  const handleVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    slot: 'video1' | 'video2'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('Video file must be under 20 MB.');
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const media: MediaUpload = {
      id: `${slot}-${Date.now()}`,
      name: file.name,
      dataUrl,
      mimeType: file.type,
    };
    if (slot === 'video1') setVideo1(media);
    else setVideo2(media);
    e.target.value = '';
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const uploaded: MediaUpload[] = [];
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        setError('Each document must be under 8 MB.');
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      uploaded.push({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        dataUrl,
        mimeType: file.type,
      });
    }
    setDocs((prev) => [...prev, ...uploaded]);
    e.target.value = '';
  };

  const handleSuggestLocality = async () => {
    if (!currentUser) {
      onRequireSignIn();
      return;
    }
    if (!sugLocName.trim()) return;
    try {
      await api.suggestLocality(sugLocName.trim(), sugPanchayat.trim());
      setSugFeedback('Sent to Owner for addition to Berasia locality list.');
      setSugLocName('');
      setSugPanchayat('');
    } catch (err) {
      setSugFeedback(err instanceof Error ? err.message : 'Unable to submit suggestion');
    }
  };

  const submitForm = async (mode: 'draft' | 'pending_review') => {
    if (!currentUser) {
      onRequireSignIn();
      return;
    }
    setError('');
    setSubmitting(true);

    const loc = localities.find((l) => l.id === localityId);
    const conv = convertArea(Number(areaValue) || 0, areaUnit);

    const payload: ListingRevisionData = {
      workflow,
      category,
      title: title.trim(),
      description: description.trim(),
      localityId,
      localityName: loc?.nameEn || 'Berasia, Bhopal',
      areaValue: Number(areaValue) || 0,
      areaUnit,
      areaSqYd: conv.sqYd,
      areaSqFt: conv.sqFt,
      priceAmount: Number(priceAmount) || 0,
      conditionalDetails: cond,
      rentalTerms: workflow === 'rent' ? rental : undefined,
      photos,
      video1,
      privateData: {
        actualOwnerName: actualOwnerName.trim(),
        submitterName: submitterName.trim(),
        submitterRelation,
        submitterRelationOther:
          submitterRelation === 'Other' ? submitterRelationOther.trim() : undefined,
        authorityDeclarationAccepted: authorityAccepted,
        primaryContactMobile: primaryMobile.trim(),
        primaryContactRole: primaryRole.trim() || 'Submitter',
        alternateContactMobile: alternateMobile.trim(),
        alternateContactRole: alternateRole.trim() || 'Alternate',
        exactAddress: exactAddress.trim(),
        plotOrHouseNumber: plotOrHouseNumber.trim() || undefined,
        khasraOrSurveyNumber: khasraOrSurveyNumber.trim() || undefined,
        revenueVillageOrHalka: revenueVillageOrHalka.trim() || undefined,
        landmark: landmark.trim() || undefined,
        postcode: postcode.trim() || undefined,
        video2Surroundings: video2,
        ownershipDocuments: docs,
      },
    };

    try {
      const res = editingListing
        ? await api.updateListing(editingListing.id, mode, payload)
        : await api.createListing(mode, payload);
      onSubmitted(res.listing, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save listing');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = workflow === 'sale' ? SALE_CATEGORIES : RENT_CATEGORIES;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-zinc-900">
              {editingListing
                ? `Edit Property ${editingListing.publicId}`
                : 'Submit Property in Berasia, Bhopal'}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Boundary locked to <span className="font-medium text-zinc-800">{BOUNDARY_LABEL}</span>.
              Sale and rental properties use separate listings.
            </p>
          </div>
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border border-zinc-300 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* Explicit Approval Rule Banner */}
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
            <div>
              <div className="font-semibold">Owner Review & Approval Rule</div>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                Any property submitted here goes directly to the{' '}
                <strong>Berasia Property Adda Owner Backend</strong>. It will{' '}
                <strong>NOT</strong> appear publicly on the website until the Owner verifies your
                documents, calls your mobile number, and approves publication. If rejected or
                removed, it will not stay on the website.
              </p>
            </div>
          </div>
        </div>

        {!currentUser && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-sm text-zinc-700">
              Sign in with your 10-digit mobile number (no OTP needed) to save drafts or submit for
              Owner approval.
            </div>
            <button
              type="button"
              onClick={onRequireSignIn}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Sign In with Mobile
            </button>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* 1. Separate Sale vs Rental Workflow */}
        <section className="mt-7 space-y-4">
          <h3 className="font-display text-base font-semibold text-zinc-900">
            01. Listing Type & Property Category
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={Boolean(editingListing)}
              onClick={() => handleWorkflowSwitch('sale')}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                workflow === 'sale'
                  ? 'border-emerald-900 bg-emerald-50/70 text-emerald-950'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              } disabled:opacity-70`}
            >
              <div className="text-sm font-semibold">For Sale (बेचना है)</div>
              <div className="mt-0.5 text-xs text-zinc-600">
                House, Plot, Agricultural or Commercial Land
              </div>
            </button>

            <button
              type="button"
              disabled={Boolean(editingListing)}
              onClick={() => handleWorkflowSwitch('rent')}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                workflow === 'rent'
                  ? 'border-emerald-900 bg-emerald-50/70 text-emerald-950'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              } disabled:opacity-70`}
            >
              <div className="text-sm font-semibold">For Rent (किराए पर देना है)</div>
              <div className="mt-0.5 text-xs text-zinc-600">
                Home, Flat, Shop, Office, or Warehouse
              </div>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Property Category <span className="text-red-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as PropertyCategory);
                  setCond({});
                }}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.labelHi})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Headline Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 2 BHK Corner House in Sardar Patel Nagar"
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700">
              Availability & Public Description <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the property features, road width, surroundings, and availability without putting phone numbers or exact house/khasra number here."
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
            />
          </div>
        </section>

        {/* 2. Location (Berasia, Bhopal) & Size/Price */}
        <section className="mt-8 space-y-4 border-t border-zinc-200 pt-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-zinc-900">
              02. Berasia Locality, Area & Total Price
            </h3>
            <button
              type="button"
              onClick={() => setShowSuggestLoc((v) => !v)}
              className="text-xs font-semibold text-emerald-900 underline underline-offset-2"
            >
              Village/Colony missing? Suggest to Owner
            </button>
          </div>

          {showSuggestLoc && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-semibold text-zinc-900">
                Suggest a Missing Locality in Berasia Tehsil
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={sugLocName}
                  onChange={(e) => setSugLocName(e.target.value)}
                  placeholder="Village / Colony name"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={sugPanchayat}
                  onChange={(e) => setSugPanchayat(e.target.value)}
                  placeholder="Gram Panchayat or Ward No."
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleSuggestLocality}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                >
                  Send Suggestion
                </button>
              </div>
              {sugFeedback && <p className="mt-2 text-xs text-emerald-800">{sugFeedback}</p>}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                District & State (Fixed)
              </label>
              <input
                type="text"
                readOnly
                value="Berasia, Bhopal, MP"
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2.5 text-sm text-zinc-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700">
                Public Locality (Village / Town / Colony) <span className="text-red-600">*</span>
              </label>
              <select
                value={localityId}
                onChange={(e) => setLocalityId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
              >
                {localities.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.nameEn} — {loc.nameHi}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Area Value <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={areaValue}
                onChange={(e) => setAreaValue(e.target.value)}
                placeholder="e.g. 1500"
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-mono text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Area Unit <span className="text-red-600">*</span>
              </label>
              <select
                value={areaUnit}
                onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
              >
                {AREA_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700">
                {workflow === 'sale' ? 'Total Asking Price (INR ₹)' : 'Total Rent Amount (INR ₹)'}{' '}
                <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                placeholder={workflow === 'sale' ? 'e.g. 2500000' : 'e.g. 8500'}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-mono text-sm text-zinc-900 focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          {areaPreview && (
            <div className="text-xs font-mono text-zinc-600">
              Normalised equivalent: {areaPreview.sqYd.toLocaleString('en-IN')} Sq Yard (Gaj) ·{' '}
              {areaPreview.sqFt.toLocaleString('en-IN')} Sq Ft
            </div>
          )}
        </section>

        {/* 3. Conditional Details */}
        <section className="mt-8 space-y-4 border-t border-zinc-200 pt-7">
          <h3 className="font-display text-base font-semibold text-zinc-900">
            03. Property-Specific Details
          </h3>

          {(category === 'house' || category === 'house_flat_room') && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700">Rooms / BHK</label>
                <input
                  type="text"
                  value={cond.bhkRooms || ''}
                  onChange={(e) => setCond({ ...cond, bhkRooms: e.target.value })}
                  placeholder="e.g. 3 BHK"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Bathrooms</label>
                <input
                  type="text"
                  value={cond.bathrooms || ''}
                  onChange={(e) => setCond({ ...cond, bathrooms: e.target.value })}
                  placeholder="e.g. 2 Bathrooms"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Floors</label>
                <input
                  type="text"
                  value={cond.floors || ''}
                  onChange={(e) => setCond({ ...cond, floors: e.target.value })}
                  placeholder="e.g. Ground + 1"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Furnishing</label>
                <select
                  value={cond.furnishing || ''}
                  onChange={(e) =>
                    setCond({
                      ...cond,
                      furnishing: (e.target.value || undefined) as ConditionalPropertyDetails['furnishing'],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select furnishing</option>
                  <option value="Unfurnished">Unfurnished</option>
                  <option value="Semi-Furnished">Semi-Furnished</option>
                  <option value="Furnished">Furnished</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Parking</label>
                <input
                  type="text"
                  value={cond.parking || ''}
                  onChange={(e) => setCond({ ...cond, parking: e.target.value })}
                  placeholder="e.g. 1 Car Porch"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Water & Power</label>
                <input
                  type="text"
                  value={cond.waterSupply || ''}
                  onChange={(e) => setCond({ ...cond, waterSupply: e.target.value })}
                  placeholder="e.g. Borewell + Municipal"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {category === 'vacant_plot' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700">Plot Dimensions</label>
                <input
                  type="text"
                  value={cond.dimensions || ''}
                  onChange={(e) => setCond({ ...cond, dimensions: e.target.value })}
                  placeholder="e.g. 30 ft x 50 ft"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Frontage Road Width</label>
                <input
                  type="text"
                  value={cond.frontageRoadWidth || ''}
                  onChange={(e) => setCond({ ...cond, frontageRoadWidth: e.target.value })}
                  placeholder="e.g. 30 ft Concrete Road"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Facing</label>
                <input
                  type="text"
                  value={cond.facing || ''}
                  onChange={(e) => setCond({ ...cond, facing: e.target.value })}
                  placeholder="e.g. East / North"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Corner Status</label>
                <select
                  value={cond.cornerStatus || ''}
                  onChange={(e) =>
                    setCond({
                      ...cond,
                      cornerStatus: (e.target.value || undefined) as ConditionalPropertyDetails['cornerStatus'],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select</option>
                  <option value="Corner">Corner Plot</option>
                  <option value="Non-Corner">Non-Corner Plot</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Boundary Wall</label>
                <select
                  value={cond.boundaryWall || ''}
                  onChange={(e) =>
                    setCond({
                      ...cond,
                      boundaryWall: (e.target.value || undefined) as ConditionalPropertyDetails['boundaryWall'],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="Partial">Partial</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Stated Approval</label>
                <input
                  type="text"
                  value={cond.statedApproval || ''}
                  onChange={(e) => setCond({ ...cond, statedApproval: e.target.value })}
                  placeholder="e.g. Diverted Colony"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {category === 'agricultural_land' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700">Irrigation Source</label>
                <input
                  type="text"
                  value={cond.irrigationSource || ''}
                  onChange={(e) => setCond({ ...cond, irrigationSource: e.target.value })}
                  placeholder="e.g. Borewell / Well / Canal"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Tubewell / Electricity</label>
                <input
                  type="text"
                  value={cond.tubewellElectricity || ''}
                  onChange={(e) => setCond({ ...cond, tubewellElectricity: e.target.value })}
                  placeholder="e.g. 3-Phase 5 HP"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Approach Road Width</label>
                <input
                  type="text"
                  value={cond.accessWidth || ''}
                  onChange={(e) => setCond({ ...cond, accessWidth: e.target.value })}
                  placeholder="e.g. 18 ft Kachha / Pakka Road"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Present Cultivation</label>
                <input
                  type="text"
                  value={cond.presentCultivation || ''}
                  onChange={(e) => setCond({ ...cond, presentCultivation: e.target.value })}
                  placeholder="e.g. Wheat / Soybean"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Parcel Contiguity</label>
                <select
                  value={cond.parcelContiguity || ''}
                  onChange={(e) =>
                    setCond({
                      ...cond,
                      parcelContiguity: (e.target.value || undefined) as ConditionalPropertyDetails['parcelContiguity'],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select</option>
                  <option value="Contiguous">Contiguous Block</option>
                  <option value="Separate Parcels">Separate Parcels</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Whole vs Share Sale</label>
                <select
                  value={cond.saleShareType || ''}
                  onChange={(e) =>
                    setCond({
                      ...cond,
                      saleShareType: (e.target.value || undefined) as ConditionalPropertyDetails['saleShareType'],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select</option>
                  <option value="Whole Property">Whole Property</option>
                  <option value="Partial Share">Partial Share</option>
                </select>
              </div>
            </div>
          )}

          {(category === 'industrial_land' ||
            category === 'shop_office_showroom' ||
            category === 'warehouse_shed_industrial') && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700">Frontage / Truck Access</label>
                <input
                  type="text"
                  value={cond.truckAccess || cond.frontageAccess || ''}
                  onChange={(e) =>
                    setCond({ ...cond, truckAccess: e.target.value, frontageAccess: e.target.value })
                  }
                  placeholder="e.g. 40 ft Highway Frontage"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Stated Approved Use</label>
                <input
                  type="text"
                  value={cond.approvedUse || ''}
                  onChange={(e) => setCond({ ...cond, approvedUse: e.target.value })}
                  placeholder="e.g. Showroom / Godown"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Power Capacity</label>
                <input
                  type="text"
                  value={cond.powerCapacity || ''}
                  onChange={(e) => setCond({ ...cond, powerCapacity: e.target.value })}
                  placeholder="e.g. 3-Phase 10 KW"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Rental Specific Terms */}
          {workflow === 'rent' && (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-4">
              <div className="text-sm font-semibold text-zinc-900">Rental & Tenancy Terms</div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700">Rent Period</label>
                  <select
                    value={rental.rentPeriod}
                    onChange={(e) =>
                      setRental({ ...rental, rentPeriod: e.target.value as RentPeriod })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700">Offered Unit</label>
                  <select
                    value={rental.offeredUnit}
                    onChange={(e) =>
                      setRental({
                        ...rental,
                        offeredUnit: e.target.value as RentalTerms['offeredUnit'],
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="Whole Property">Whole Property</option>
                    <option value="Specific Floor / Unit">Specific Floor / Unit</option>
                    <option value="Portion">Portion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700">Availability Date</label>
                  <input
                    type="text"
                    value={rental.availabilityDate}
                    onChange={(e) => setRental({ ...rental, availabilityDate: e.target.value })}
                    placeholder="e.g. Immediate or 1 Dec 2026"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700">Security Deposit</label>
                  <select
                    value={rental.securityDepositStatus}
                    onChange={(e) =>
                      setRental({
                        ...rental,
                        securityDepositStatus: e.target.value as RentalTerms['securityDepositStatus'],
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="Not Yet Decided">Not Yet Decided</option>
                    <option value="Zero Deposit">Zero Deposit</option>
                    <option value="Amount Specified">Amount Specified</option>
                  </select>
                </div>
                {rental.securityDepositStatus === 'Amount Specified' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-700">Deposit Amount (₹)</label>
                    <input
                      type="number"
                      value={rental.securityDepositAmount || ''}
                      onChange={(e) =>
                        setRental({ ...rental, securityDepositAmount: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-zinc-700">Maintenance</label>
                  <select
                    value={rental.maintenanceStatus}
                    onChange={(e) =>
                      setRental({
                        ...rental,
                        maintenanceStatus: e.target.value as RentalTerms['maintenanceStatus'],
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="Not Yet Decided">Not Yet Decided</option>
                    <option value="Included in Rent">Included in Rent</option>
                    <option value="Zero">Zero</option>
                    <option value="Separate Charge">Separate Charge</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 4. Owner, Submitter & Private Address (Strictly Private to Owner Backend) */}
        <section className="mt-8 space-y-4 border-t border-zinc-200 pt-7">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-zinc-700" />
            <h3 className="font-display text-base font-semibold text-zinc-900">
              04. Private Owner, Contact & Exact Address (Hidden from Public)
            </h3>
          </div>
          <p className="text-xs text-zinc-600">
            These fields go strictly to the Berasia Property Adda Owner Dashboard and are NEVER
            shown on the public website.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Your Name (Submitter) <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Relationship to Owner <span className="text-red-600">*</span>
              </label>
              <select
                value={submitterRelation}
                onChange={(e) => handleRelationChange(e.target.value as SubmitterRelation)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="Self">Self (Actual Owner)</option>
                <option value="Family Member">Family Member</option>
                <option value="Friend and Relative">Friend and Relative</option>
                <option value="Property Dealer">Property Dealer</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Actual Owner Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={actualOwnerName}
                onChange={(e) => setActualOwnerName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {submitterRelation === 'Other' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Explain Relationship to Owner
              </label>
              <input
                type="text"
                value={submitterRelationOther}
                onChange={(e) => setSubmitterRelationOther(e.target.value)}
                placeholder="e.g. Power of attorney holder"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 p-3.5 space-y-2.5">
              <div className="text-xs font-semibold text-zinc-800">Primary Private Contact</div>
              <div className="flex overflow-hidden rounded-lg border border-zinc-300">
                <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-2.5 font-mono text-xs text-zinc-700">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={primaryMobile}
                  onChange={(e) => setPrimaryMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-2 font-mono text-sm focus:outline-none"
                />
              </div>
              <input
                type="text"
                value={primaryRole}
                onChange={(e) => setPrimaryRole(e.target.value)}
                placeholder="Contact Person Role (e.g. Owner / Dealer)"
                className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs"
              />
            </div>

            <div className="rounded-lg border border-zinc-200 p-3.5 space-y-2.5">
              <div className="text-xs font-semibold text-zinc-800">
                Alternate Private Contact (Must Differ)
              </div>
              <div className="flex overflow-hidden rounded-lg border border-zinc-300">
                <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-2.5 font-mono text-xs text-zinc-700">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={alternateMobile}
                  onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Different 10-digit mobile"
                  className="w-full px-3 py-2 font-mono text-sm focus:outline-none"
                />
              </div>
              <input
                type="text"
                value={alternateRole}
                onChange={(e) => setAlternateRole(e.target.value)}
                placeholder="Contact Person Role (e.g. Spouse / Actual Owner)"
                className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700">
                Exact Private Address <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={exactAddress}
                onChange={(e) => setExactAddress(e.target.value)}
                placeholder="House No, Street, Colony / Gram, Tehsil Berasia, Dist Bhopal"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Plot / House No. (For Duplicate Check)
              </label>
              <input
                type="text"
                value={plotOrHouseNumber}
                onChange={(e) => setPlotOrHouseNumber(e.target.value)}
                placeholder="e.g. 128 or G-1"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Khasra / Survey Number (For Land)
              </label>
              <input
                type="text"
                value={khasraOrSurveyNumber}
                onChange={(e) => setKhasraOrSurveyNumber(e.target.value)}
                placeholder="e.g. 214/1"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">
                Revenue Village / Halka
              </label>
              <input
                type="text"
                value={revenueVillageOrHalka}
                onChange={(e) => setRevenueVillageOrHalka(e.target.value)}
                placeholder="e.g. Dhamarra Halka 14"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Landmark & Postcode</label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Near Bus Stand · 463106"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={authorityAccepted}
              onChange={(e) => setAuthorityAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-900"
            />
            <span>
              I declare that I am the owner or have the owner’s explicit permission to submit this
              property to Berasia Property Adda, and all submitted details are accurate.
            </span>
          </label>
        </section>

        {/* 5. Photos, Video 1 (Public), Video 2 (Private), Documents (Private) */}
        <section className="mt-8 space-y-5 border-t border-zinc-200 pt-7">
          <h3 className="font-display text-base font-semibold text-zinc-900">
            05. Photos, Videos & Ownership Documents
          </h3>

          {/* Property Photos */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-800">
                Property Photos (Public after Owner Approval)
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50">
                <ImagePlus className="h-3.5 w-3.5" />
                <span>Add Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {photos.map((ph) => (
                  <div key={ph.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-zinc-200">
                    <img
                      src={ph.dataUrl}
                      alt={ph.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((x) => x.id !== ph.id))}
                      className="absolute right-1 top-1 rounded bg-zinc-950/75 p-1 text-white hover:bg-red-600"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video 1 & Video 2 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-900">
                    Video 1 — Property & Interior Only
                  </div>
                  <div className="text-[11px] text-zinc-500">Shown publicly after approval</div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-zinc-50">
                  <Video className="h-3.5 w-3.5" />
                  <span>{video1 ? 'Replace' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleVideoUpload(e, 'video1')}
                    className="hidden"
                  />
                </label>
              </div>
              {video1 && (
                <div className="mt-2 flex items-center justify-between text-xs text-emerald-800">
                  <span className="truncate">{video1.name}</span>
                  <button
                    type="button"
                    onClick={() => setVideo1(undefined)}
                    className="text-red-600 underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                    <Lock className="h-3.5 w-3.5 text-zinc-600" />
                    <span>Video 2 — Property + Surroundings</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Strictly PRIVATE — Owner Backend only
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-zinc-50">
                  <Video className="h-3.5 w-3.5" />
                  <span>{video2 ? 'Replace' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleVideoUpload(e, 'video2')}
                    className="hidden"
                  />
                </label>
              </div>
              {video2 && (
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-700">
                  <span className="truncate">{video2.name}</span>
                  <button
                    type="button"
                    onClick={() => setVideo2(undefined)}
                    className="text-red-600 underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Private Ownership Documents */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                  <Lock className="h-3.5 w-3.5 text-zinc-600" />
                  <span>Ownership Documents (Registry / B-1 / Khasra / Diversion / Tax Receipt)</span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Strictly PRIVATE — only the Berasia Property Adda Owner can view these for verification.
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Documents</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleDocUpload}
                  className="hidden"
                />
              </label>
            </div>
            {docs.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {docs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2 truncate text-zinc-800">
                      <FileText className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDocs((prev) => prev.filter((x) => x.id !== d.id))}
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Submit Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 pt-6">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitForm('draft')}
            className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            Save Private Draft
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitForm('pending_review')}
            className="rounded-lg bg-emerald-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {submitting
              ? 'Submitting...'
              : editingListing?.status === 'live'
              ? 'Submit Edits for Owner Re-Approval'
              : 'Submit to Owner for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
};
