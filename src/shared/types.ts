export type WorkflowType = 'sale' | 'rent';

export type SaleCategory = 'house' | 'vacant_plot' | 'agricultural_land' | 'industrial_land';
export type RentCategory = 'house_flat_room' | 'shop_office_showroom' | 'warehouse_shed_industrial';
export type PropertyCategory = SaleCategory | RentCategory;

export type AreaUnit = 'sq_ft' | 'sq_yd' | 'sq_m' | 'acre' | 'hectare';
export type RentPeriod = 'monthly' | 'quarterly' | 'yearly';

export type VerificationLevel = 'none' | 'level_1' | 'level_2';
export type ListingStatus = 'draft' | 'pending_review' | 'live' | 'rejected' | 'unlisted';

export type SubmitterRelation =
  | 'Self'
  | 'Family Member'
  | 'Friend and Relative'
  | 'Property Dealer'
  | 'Other';

export type UnlistReason =
  | 'Sold'
  | 'Rented out'
  | 'Temporarily withdrawn'
  | 'Own use'
  | 'Repairs'
  | 'Incorrect details'
  | 'Duplicate listing'
  | 'Website/service problem'
  | 'Other';

export interface BerasiaLocality {
  id: string;
  nameEn: string;
  nameHi: string;
  type: 'Town / Nagar Palika' | 'Colony / Ward' | 'Gram Panchayat / Village' | 'Highway / Commercial';
  tehsil: 'Berasia';
  district: 'Bhopal';
  state: 'Madhya Pradesh';
  panchayatOrWard: string;
}

export interface UserAccount {
  id: string;
  name: string;
  mobile: string; // 10-digit normalised Indian mobile
  email?: string;
  termsAccepted: boolean;
  callVerified: boolean;
  callRequestedAt: string;
  isOwnerAdmin: boolean;
  createdAt: string;
}

export interface MediaUpload {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
}

export interface ConditionalPropertyDetails {
  // House / Flat / Room
  bhkRooms?: string;
  bathrooms?: string;
  floors?: string;
  constructionAge?: string;
  furnishing?: 'Unfurnished' | 'Semi-Furnished' | 'Furnished';
  parking?: string;
  powerBackup?: string;
  waterSupply?: string;
  balcony?: string;
  kitchen?: string;
  separateOrShared?: string;

  // Vacant Residential Plot
  dimensions?: string;
  frontageRoadWidth?: string;
  facing?: string;
  cornerStatus?: 'Corner' | 'Non-Corner';
  boundaryWall?: 'Yes' | 'No' | 'Partial';
  utilities?: string;
  statedApproval?: string;

  // Agricultural Land
  irrigationSource?: string;
  tubewellElectricity?: string;
  accessWidth?: string;
  presentCultivation?: string;
  parcelContiguity?: 'Contiguous' | 'Separate Parcels';
  saleShareType?: 'Whole Property' | 'Partial Share';

  // Industrial / Warehouse / Commercial Shop/Office
  estateOrStandalone?: 'Industrial Estate' | 'Standalone';
  approvedUse?: string;
  supportingRecords?: string;
  truckAccess?: string;
  powerCapacity?: string;
  drainage?: string;
  shedOrVacant?: 'Vacant Land' | 'Constructed Shed' | 'Showroom / Office';
  freeholdOrLeasehold?: 'Freehold' | 'Leasehold';
  clearHeight?: string;
  loadingSpace?: string;
  frontageAccess?: string;
  washrooms?: string;
  fitOut?: string;
}

export interface RentalTerms {
  offeredUnit: 'Whole Property' | 'Specific Floor / Unit' | 'Portion';
  availabilityDate: string;
  rentPeriod: RentPeriod;
  negotiable: boolean;
  securityDepositStatus: 'Amount Specified' | 'Zero Deposit' | 'Not Yet Decided';
  securityDepositAmount?: number;
  depositRefundTerms?: string;
  advanceRent?: string;
  maintenanceStatus: 'Included in Rent' | 'Separate Charge' | 'Zero' | 'Not Yet Decided';
  maintenanceAmount?: number;
  electricityWaterTerms?: string;
  leaseDuration?: string;
  lockInPeriod?: string;
  noticePeriod?: string;
  renewalTerms?: string;
  rentEscalation?: string;
  repairResponsibilities?: string;
  includedInventory?: string;
  useConditions?: string;
}

export interface ListingRevisionData {
  workflow: WorkflowType;
  category: PropertyCategory;
  title: string;
  description: string;
  localityId: string;
  localityName: string;
  suggestedLocalityName?: string;
  areaValue: number;
  areaUnit: AreaUnit;
  areaSqYd: number;
  areaSqFt: number;
  // Price (Sale total demand OR Rent total per period)
  priceAmount: number;
  conditionalDetails: ConditionalPropertyDetails;
  rentalTerms?: RentalTerms;

  // Public Media
  photos: MediaUpload[];
  video1?: MediaUpload; // Property & interior only (public after approval)

  // Strictly Private Data (visible ONLY to Owner/Admin & Submitter)
  privateData: {
    actualOwnerName: string;
    submitterName: string;
    submitterRelation: SubmitterRelation;
    submitterRelationOther?: string;
    authorityDeclarationAccepted: boolean;
    primaryContactMobile: string;
    primaryContactRole: string;
    alternateContactMobile: string;
    alternateContactRole: string;
    exactAddress: string;
    plotOrHouseNumber?: string;
    khasraOrSurveyNumber?: string;
    revenueVillageOrHalka?: string;
    landmark?: string;
    postcode?: string;
    video2Surroundings?: MediaUpload; // Strictly Private
    ownershipDocuments: MediaUpload[]; // Strictly Private
  };
}

export interface VerificationAuditEntry {
  at: string;
  actorName: string;
  previousLevel: VerificationLevel;
  newLevel: VerificationLevel;
  reason: string;
}

export interface ListingRecord {
  id: string;
  publicId: string; // e.g., BPA-S-1001 or BPA-R-2001
  workflow: WorkflowType;
  submitterUserId: string;
  status: ListingStatus;
  verificationLevel: VerificationLevel;
  verificationScopeNote?: string;
  verifiedAt?: string;
  expertReference?: string; // Private to owner/admin
  expertConclusion?: string; // Private to owner/admin

  // Active data (if live, this is the approved version; if pending_review/draft/rejected, latest submitted)
  data: ListingRevisionData;
  // When a live listing is edited, new changes sit here awaiting Owner re-approval while `data` remains public
  pendingEdit?: {
    submittedAt: string;
    data: ListingRevisionData;
  };

  staffNotes: string;
  rejectionOrUnlistReason?: string;
  unlistedBy?: 'user' | 'owner';
  duplicateFlaggedWith?: string[]; // matching publicIds
  verificationAudit: VerificationAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicListingView {
  id: string;
  publicId: string;
  workflow: WorkflowType;
  category: PropertyCategory;
  title: string;
  description: string;
  localityId: string;
  localityName: string;
  areaValue: number;
  areaUnit: AreaUnit;
  areaSqYd: number;
  areaSqFt: number;
  priceAmount: number;
  conditionalDetails: ConditionalPropertyDetails;
  rentalTerms?: RentalTerms;
  photos: MediaUpload[];
  video1?: MediaUpload;
  verificationLevel: VerificationLevel;
  verificationScopeNote?: string;
  verifiedAt?: string;
  companyPhone: string;
  updatedAt: string;
}

export interface EnquiryLead {
  id: string;
  listingId: string;
  publicId: string;
  listingTitle: string;
  workflow: WorkflowType;
  buyerUserId: string;
  buyerName: string;
  buyerMobile: string;
  status: 'not_contacted' | 'contacted';
  staffNote: string;
  createdAt: string;
}

export interface FeeRecord {
  id: string;
  listingId: string;
  publicId: string;
  workflow: WorkflowType;
  finalAgreedAmount: number;
  sellerFee: number;
  buyerFee: number;
  landlordFee: number;
  tenantFee: number;
  totalCompanyFee: number;
  dueEvent: string;
  status: 'pending' | 'collected';
  notes: string;
  recordedAt: string;
}

export interface NotificationItem {
  id: string;
  recipientRole: 'owner' | 'user';
  recipientUserId?: string;
  type: 'new_submission' | 'edit_submission' | 'user_unlist' | 'owner_decision' | 'new_lead' | 'missing_locality';
  listingId?: string;
  publicId?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface MissingLocalitySuggestion {
  id: string;
  suggestedName: string;
  panchayatOrWard: string;
  submittedByName: string;
  submittedByMobile: string;
  status: 'pending' | 'added' | 'dismissed';
  createdAt: string;
}
