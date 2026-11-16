import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  BERASIA_LOCALITIES,
  COMPANY_PHONE,
  convertArea,
} from '../shared/constants.ts';
import type {
  BerasiaLocality,
  EnquiryLead,
  FeeRecord,
  ListingRecord,
  MissingLocalitySuggestion,
  NotificationItem,
  PublicListingView,
  UserAccount,
  WorkflowType,
} from '../shared/types.ts';

export interface DatabaseState {
  users: UserAccount[];
  sessions: Record<string, string>; // token -> userId
  listings: ListingRecord[];
  enquiries: EnquiryLead[];
  nonInterested: { userId: string; listingId: string; createdAt: string }[];
  feeRecords: FeeRecord[];
  notifications: NotificationItem[];
  localities: BerasiaLocality[];
  localitySuggestions: MissingLocalitySuggestion[];
  counters: {
    sale: number;
    rent: number;
  };
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'berasia_db.json');

function createSeedState(): DatabaseState {
  const now = new Date().toISOString();
  const earlier = new Date(Date.now() - 86400000 * 3).toISOString();
  const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString();

  const ownerUser: UserAccount = {
    id: 'usr-owner-1',
    name: 'Rajesh Sharma (Owner)',
    mobile: '9826045120',
    email: 'owner@berasiapropertyadda.in',
    termsAccepted: true,
    callVerified: true,
    callRequestedAt: earlier,
    isOwnerAdmin: true,
    createdAt: earlier,
  };

  const seller1: UserAccount = {
    id: 'usr-seller-1',
    name: 'Mahendra Singh Rajput',
    mobile: '9893112233',
    termsAccepted: true,
    callVerified: true,
    callRequestedAt: earlier,
    isOwnerAdmin: false,
    createdAt: earlier,
  };

  const seller2: UserAccount = {
    id: 'usr-seller-2',
    name: 'Kamlesh Patidar',
    mobile: '9425011224',
    termsAccepted: true,
    callVerified: false,
    callRequestedAt: twoDaysAgo,
    isOwnerAdmin: false,
    createdAt: twoDaysAgo,
  };

  const buyer1: UserAccount = {
    id: 'usr-buyer-1',
    name: 'Ankit Vishwakarma',
    mobile: '9755088776',
    termsAccepted: true,
    callVerified: true,
    callRequestedAt: twoDaysAgo,
    isOwnerAdmin: false,
    createdAt: twoDaysAgo,
  };

  const listings: ListingRecord[] = [
    {
      id: 'lst-sale-1001',
      publicId: 'BPA-S-1001',
      workflow: 'sale',
      submitterUserId: seller1.id,
      status: 'live',
      verificationLevel: 'level_2',
      verificationScopeNote: 'B-1, Registry chain & Nagar Palika tax receipts reviewed against Bhopal/Berasia records.',
      verifiedAt: twoDaysAgo,
      expertReference: 'REV-BRS-2026-041 (Adv. S.K. Tiwari)',
      expertConclusion: 'Clear single-owner registry from 2018, municipal taxes paid up to 2026.',
      staffNotes: 'Verified over phone call with Mahendra ji. Corner house well-maintained.',
      verificationAudit: [
        {
          at: twoDaysAgo,
          actorName: 'Rajesh Sharma (Owner)',
          previousLevel: 'none',
          newLevel: 'level_2',
          reason: 'Expert revenue & registry check completed prior to live approval.',
        },
      ],
      createdAt: earlier,
      updatedAt: twoDaysAgo,
      data: {
        workflow: 'sale',
        category: 'house',
        title: '3 BHK Independent Double-Storey House in Sardar Patel Nagar',
        description:
          'Well-built east-facing 3 BHK double-storey residential house on a 30 ft concrete road in Sardar Patel Nagar, Berasia. Modular kitchen, car parking porch, solar water heater, and immediate possession.',
        localityId: 'loc-sardar-patel',
        localityName: 'Sardar Patel Nagar, Berasia',
        areaValue: 1500,
        areaUnit: 'sq_ft',
        ...(() => {
          const c = convertArea(1500, 'sq_ft');
          return { areaSqYd: c.sqYd, areaSqFt: c.sqFt };
        })(),
        priceAmount: 4850000,
        conditionalDetails: {
          bhkRooms: '3 BHK',
          bathrooms: '3 Bathrooms',
          floors: '2 Floors (G+1)',
          constructionAge: '4 Years Old',
          furnishing: 'Semi-Furnished',
          parking: '1 Covered Car + 2 Two-Wheeler',
          powerBackup: 'Inverter + Solar Ready',
          waterSupply: 'Nagar Palika Tap + Borewell',
        },
        photos: [
          {
            id: 'ph-1',
            name: 'Front Elevation',
            dataUrl: '/src/assets/images/listing_house_modern_1794825884611.jpg',
            mimeType: 'image/jpeg',
          },
          {
            id: 'ph-2',
            name: 'Courtyard & Driveway',
            dataUrl: '/src/assets/images/hero_berasia_estate_1794825883496.jpg',
            mimeType: 'image/jpeg',
          },
        ],
        privateData: {
          actualOwnerName: 'Mahendra Singh Rajput',
          submitterName: 'Mahendra Singh Rajput',
          submitterRelation: 'Self',
          authorityDeclarationAccepted: true,
          primaryContactMobile: '9893112233',
          primaryContactRole: 'Owner',
          alternateContactMobile: '9893112299',
          alternateContactRole: 'Spouse',
          exactAddress: 'House No. 42, Lane 3, Sardar Patel Nagar, Ward 9, Berasia',
          plotOrHouseNumber: '42',
          landmark: 'Near Gayatri Mandir',
          postcode: '463106',
          ownershipDocuments: [
            {
              id: 'doc-1001',
              name: 'Registered Sale Deed 2018 (Private).pdf',
              dataUrl: '/src/assets/images/listing_house_modern_1794825884611.jpg',
              mimeType: 'application/pdf',
            },
          ],
        },
      },
    },
    {
      id: 'lst-sale-1002',
      publicId: 'BPA-S-1002',
      workflow: 'sale',
      submitterUserId: seller1.id,
      status: 'live',
      verificationLevel: 'level_1',
      verificationScopeNote: 'Submitted registry, demarcation photo/videos checked and owner spoken to via phone call.',
      verifiedAt: twoDaysAgo,
      staffNotes: 'Call verified. Clean corner plot near Bhopal Naka.',
      verificationAudit: [
        {
          at: twoDaysAgo,
          actorName: 'Rajesh Sharma (Owner)',
          previousLevel: 'none',
          newLevel: 'level_1',
          reason: 'Basic document review and owner phone verification complete.',
        },
      ],
      createdAt: earlier,
      updatedAt: twoDaysAgo,
      data: {
        workflow: 'sale',
        category: 'vacant_plot',
        title: 'Corner Residential Plot with Boundary Wall near Bhopal Naka',
        description:
          'Prime corner vacant residential plot in peaceful developed colony near Bhopal Naka, Berasia-Bhopal Road. Full brick boundary wall with gate, electricity line at plot corner, ready for immediate construction.',
        localityId: 'loc-bhopal-naka',
        localityName: 'Bhopal Naka & Berasia-Bhopal Road',
        areaValue: 200,
        areaUnit: 'sq_yd',
        ...(() => {
          const c = convertArea(200, 'sq_yd');
          return { areaSqYd: c.sqYd, areaSqFt: c.sqFt };
        })(),
        priceAmount: 1950000,
        conditionalDetails: {
          dimensions: '30 ft x 60 ft',
          frontageRoadWidth: '30 ft Concrete Road',
          facing: 'North-East Corner',
          cornerStatus: 'Corner',
          boundaryWall: 'Yes',
          utilities: 'Electricity pole on corner, water line nearby',
          statedApproval: 'Diverted Residential Colony Plot (T&CP Stated)',
        },
        photos: [
          {
            id: 'ph-3',
            name: 'Corner Plot Frontage',
            dataUrl: '/src/assets/images/listing_plot_residential_1794825883754.jpg',
            mimeType: 'image/jpeg',
          },
        ],
        privateData: {
          actualOwnerName: 'Suresh Chandra Verma',
          submitterName: 'Mahendra Singh Rajput',
          submitterRelation: 'Family Member',
          authorityDeclarationAccepted: true,
          primaryContactMobile: '9893112233',
          primaryContactRole: 'Authorised Nephew',
          alternateContactMobile: '9425600112',
          alternateContactRole: 'Actual Owner',
          exactAddress: 'Plot No. 128, Keshav Enclave, Bhopal Naka, Berasia',
          plotOrHouseNumber: '128',
          landmark: 'Behind Petrol Pump, Bhopal Road',
          postcode: '463106',
          ownershipDocuments: [
            {
              id: 'doc-1002',
              name: 'Diversion & Plot Registry (Private).pdf',
              dataUrl: '/src/assets/images/listing_plot_residential_1794825883754.jpg',
              mimeType: 'application/pdf',
            },
          ],
        },
      },
    },
    {
      id: 'lst-sale-1003',
      publicId: 'BPA-S-1003',
      workflow: 'sale',
      submitterUserId: seller2.id,
      status: 'live',
      verificationLevel: 'level_2',
      verificationScopeNote: 'B-1 Kishtbandi Khatauni, Khasra map and irrigation tubewell papers verified with Patwari Halka data.',
      verifiedAt: twoDaysAgo,
      expertReference: 'REV-BRS-2026-047',
      expertConclusion: 'Single contiguous block, clear approach road marked on revenue map.',
      staffNotes: 'Fertile black soil land in Dhamarra, Berasia Tehsil.',
      verificationAudit: [
        {
          at: twoDaysAgo,
          actorName: 'Rajesh Sharma (Owner)',
          previousLevel: 'none',
          newLevel: 'level_2',
          reason: 'Revenue B-1 and Khasra records verified.',
        },
      ],
      createdAt: earlier,
      updatedAt: twoDaysAgo,
      data: {
        workflow: 'sale',
        category: 'agricultural_land',
        title: '4.5 Acre Irrigated Black-Soil Agricultural Land in Dhamarra',
        description:
          'Contiguous 4.5 Acre fertile black-cotton soil farmland in Village Dhamarra, Berasia Tehsil, Bhopal District. Includes active 2-inch borewell, 3-phase agricultural electricity connection, and wide tractor approach road.',
        localityId: 'loc-dhamarra',
        localityName: 'Dhamarra (Berasia Tehsil)',
        areaValue: 4.5,
        areaUnit: 'acre',
        ...(() => {
          const c = convertArea(4.5, 'acre');
          return { areaSqYd: c.sqYd, areaSqFt: c.sqFt };
        })(),
        priceAmount: 6750000,
        conditionalDetails: {
          irrigationSource: 'Active Borewell + Seasonal Canal Nearby',
          tubewellElectricity: '3-Phase Permanent Connection (5 HP)',
          accessWidth: '18 ft Approach Road',
          presentCultivation: 'Wheat & Soybean (Double Crop)',
          parcelContiguity: 'Contiguous',
          saleShareType: 'Whole Property',
        },
        photos: [
          {
            id: 'ph-4',
            name: 'Farm Panorama',
            dataUrl: '/src/assets/images/listing_agri_farmland_1794825883660.jpg',
            mimeType: 'image/jpeg',
          },
        ],
        privateData: {
          actualOwnerName: 'Kamlesh Patidar',
          submitterName: 'Kamlesh Patidar',
          submitterRelation: 'Self',
          authorityDeclarationAccepted: true,
          primaryContactMobile: '9425011224',
          primaryContactRole: 'Owner',
          alternateContactMobile: '9425011225',
          alternateContactRole: 'Brother',
          exactAddress: 'Khasra No. 214/1, 214/2, Gram Dhamarra, Tehsil Berasia, Dist Bhopal',
          khasraOrSurveyNumber: '214/1, 214/2',
          revenueVillageOrHalka: 'Dhamarra / Halka 14',
          landmark: 'Near Dhamarra Talab Road',
          postcode: '463106',
          ownershipDocuments: [
            {
              id: 'doc-1003',
              name: 'Khasra B-1 Copy Dhamarra.pdf',
              dataUrl: '/src/assets/images/listing_agri_farmland_1794825883660.jpg',
              mimeType: 'application/pdf',
            },
          ],
        },
      },
    },
    {
      id: 'lst-rent-2001',
      publicId: 'BPA-R-2001',
      workflow: 'rent',
      submitterUserId: seller1.id,
      status: 'live',
      verificationLevel: 'level_1',
      verificationScopeNote: 'Owner call verified, interior photos & electricity meter proof reviewed.',
      verifiedAt: twoDaysAgo,
      staffNotes: 'Suitable for families or government employees posted in Berasia.',
      verificationAudit: [
        {
          at: twoDaysAgo,
          actorName: 'Rajesh Sharma (Owner)',
          previousLevel: 'none',
          newLevel: 'level_1',
          reason: 'Basic document & owner call check completed.',
        },
      ],
      createdAt: earlier,
      updatedAt: twoDaysAgo,
      data: {
        workflow: 'rent',
        category: 'house_flat_room',
        title: '2 BHK Ground Floor Family Portion in Subhash Colony',
        description:
          'Spacious ground-floor 2 BHK residential portion in Subhash Colony, Berasia. Separate entrance, private electricity sub-meter, covered two-wheeler parking, and 24-hour borewell water supply.',
        localityId: 'loc-subhash-colony',
        localityName: 'Subhash Colony & Shastri Nagar',
        areaValue: 950,
        areaUnit: 'sq_ft',
        ...(() => {
          const c = convertArea(950, 'sq_ft');
          return { areaSqYd: c.sqYd, areaSqFt: c.sqFt };
        })(),
        priceAmount: 8500,
        conditionalDetails: {
          bhkRooms: '2 BHK',
          bathrooms: '2 Bathrooms',
          floors: 'Ground Floor',
          balcony: 'Front Veranda',
          furnishing: 'Unfurnished',
          kitchen: 'Modular Counter & Sink',
          parking: 'Covered Two-Wheeler Parking',
          powerBackup: 'Inverter Wiring Installed',
          waterSupply: '24x7 Borewell + Municipal Supply',
          separateOrShared: 'Completely Separate Entrance & Meter',
        },
        rentalTerms: {
          offeredUnit: 'Specific Floor / Unit',
          availabilityDate: 'Immediate',
          rentPeriod: 'monthly',
          negotiable: true,
          securityDepositStatus: 'Amount Specified',
          securityDepositAmount: 15000,
          depositRefundTerms: 'Refundable upon handover minus pending utility bills',
          advanceRent: '1 Month Advance',
          maintenanceStatus: 'Included in Rent',
          electricityWaterTerms: 'Electricity as per separate sub-meter; water included',
          leaseDuration: '11 Months Agreement',
          noticePeriod: '1 Month Notice',
          useConditions: 'Families or working professionals only',
        },
        photos: [
          {
            id: 'ph-5',
            name: 'Building Front',
            dataUrl: '/src/assets/images/listing_house_modern_1794825884611.jpg',
            mimeType: 'image/jpeg',
          },
        ],
        privateData: {
          actualOwnerName: 'Mahendra Singh Rajput',
          submitterName: 'Mahendra Singh Rajput',
          submitterRelation: 'Self',
          authorityDeclarationAccepted: true,
          primaryContactMobile: '9893112233',
          primaryContactRole: 'Landlord',
          alternateContactMobile: '9893112299',
          alternateContactRole: 'Family Member',
          exactAddress: 'Plot 18, Ground Floor, Subhash Colony, Berasia',
          plotOrHouseNumber: '18',
          landmark: 'Near Saraswati Shishu Mandir',
          postcode: '463106',
          ownershipDocuments: [
            {
              id: 'doc-2001',
              name: 'House Tax & Electricity Bill (Private).pdf',
              dataUrl: '/src/assets/images/listing_house_modern_1794825884611.jpg',
              mimeType: 'application/pdf',
            },
          ],
        },
      },
    },
    {
      id: 'lst-rent-2002',
      publicId: 'BPA-R-2002',
      workflow: 'rent',
      submitterUserId: seller2.id,
      status: 'live',
      verificationLevel: 'level_1',
      verificationScopeNote: 'Commercial shop ownership & frontage access confirmed via phone call and papers.',
      verifiedAt: twoDaysAgo,
      staffNotes: 'High footfall commercial road frontage.',
      verificationAudit: [
        {
          at: twoDaysAgo,
          actorName: 'Rajesh Sharma (Owner)',
          previousLevel: 'none',
          newLevel: 'level_1',
          reason: 'Basic document & owner call check completed.',
        },
      ],
      createdAt: earlier,
      updatedAt: twoDaysAgo,
      data: {
        workflow: 'rent',
        category: 'shop_office_showroom',
        title: 'Ground Floor Main-Road Commercial Showroom in Berasia Market',
        description:
          'Modern glass-frontage commercial showroom space ideal for bank branch, medical agency, electronics showroom, or coaching office on Berasia Main Market Road with front customer parking.',
        localityId: 'loc-berasia-town',
        localityName: 'Berasia Town Main Market & Ward Area',
        areaValue: 1200,
        areaUnit: 'sq_ft',
        ...(() => {
          const c = convertArea(1200, 'sq_ft');
          return { areaSqYd: c.sqYd, areaSqFt: c.sqFt };
        })(),
        priceAmount: 24000,
        conditionalDetails: {
          frontageAccess: '25 ft Glass Frontage on Main 60 ft Road',
          floors: 'Ground Floor',
          fitOut: 'Vitrified Tiles, False Ceiling & AC Wiring Ready',
          washrooms: '1 Private Washroom',
          parking: 'Dedicated 4-Car Customer Parking in Front',
          utilities: '3-Phase Commercial Meter (10 KW)',
          approvedUse: 'Retail Showroom / Office / Clinic / Bank',
        },
        rentalTerms: {
          offeredUnit: 'Specific Floor / Unit',
          availabilityDate: 'Available from 1st of Next Month',
          rentPeriod: 'monthly',
          negotiable: true,
          securityDepositStatus: 'Amount Specified',
          securityDepositAmount: 50000,
          depositRefundTerms: 'Refundable at lease termination',
          maintenanceStatus: 'Separate Charge',
          maintenanceAmount: 1000,
          electricityWaterTerms: 'Actual commercial meter reading',
          leaseDuration: '3 Years Commercial Lease',
          lockInPeriod: '12 Months',
          noticePeriod: '2 Months',
          rentEscalation: '5% Annual Escalation',
        },
        photos: [
          {
            id: 'ph-6',
            name: 'Commercial Frontage',
            dataUrl: '/src/assets/images/listing_commercial_showroom_1794825885478.jpg',
            mimeType: 'image/jpeg',
          },
        ],
        privateData: {
          actualOwnerName: 'Kamlesh Patidar',
          submitterName: 'Kamlesh Patidar',
          submitterRelation: 'Self',
          authorityDeclarationAccepted: true,
          primaryContactMobile: '9425011224',
          primaryContactRole: 'Owner',
          alternateContactMobile: '9425011225',
          alternateContactRole: 'Partner',
          exactAddress: 'Shop G-1 & G-2, Patidar Complex, Main Bus Stand Road, Berasia',
          plotOrHouseNumber: 'G-1/G-2',
          landmark: 'Opposite Berasia Bus Stand',
          postcode: '463106',
          ownershipDocuments: [
            {
              id: 'doc-2002',
              name: 'Commercial Registry & Gumasta (Private).pdf',
              dataUrl: '/src/assets/images/listing_commercial_showroom_1794825885478.jpg',
              mimeType: 'application/pdf',
            },
          ],
        },
      },
    },
    // PENDING REVIEW SUBMISSIONS (Strictly hidden from public, visible ONLY in Owner Backend!)
    {
      id: 'lst-sale-1004',
      publicId: 'BPA-S-1004',
      workflow: 'sale',
      submitterUserId: seller2.id,
      status: 'pending_review',
      verificationLevel: 'none',
      staffNotes: 'New incoming submission awaiting owner verification call & document review.',
      verificationAudit: [],
      createdAt: now,
      updatedAt: now,
      data: {
        workflow: 'sale',
        category: 'industrial_land',
        title: 'Commercial / Warehouse Shed Plot on Nalkheda Road, Berasia',
        description:
          '22,000 sq ft commercial/warehouse land parcel with partial RCC shed and heavy truck loading access on Nalkheda Road, Berasia.',
        localityId: 'loc-nalkheda-road',
        localityName: 'Nalkheda Road & Industrial Belt',
        areaValue: 22000,
        areaUnit: 'sq_ft',
        ...(() => {
          const c = convertArea(22000, 'sq_ft');
          return { areaSqYd: c.sqYd, areaSqFt: c.sqFt };
        })(),
        priceAmount: 9500000,
        conditionalDetails: {
          estateOrStandalone: 'Standalone',
          approvedUse: 'Diverted Commercial / Godown (Supporting diversion copy uploaded)',
          truckAccess: 'Direct 40 ft Highway Truck Access',
          powerCapacity: '25 KVA Transformer Nearby',
          waterSupply: 'Borewell Available',
          drainage: 'Natural Slope + Roadside Drain',
          shedOrVacant: 'Constructed Shed',
          freeholdOrLeasehold: 'Freehold',
        },
        photos: [
          {
            id: 'ph-7',
            name: 'Highway Shed Front',
            dataUrl: '/src/assets/images/listing_commercial_showroom_1794825885478.jpg',
            mimeType: 'image/jpeg',
          },
        ],
        privateData: {
          actualOwnerName: 'Raghavendra Singh Yadav',
          submitterName: 'Kamlesh Patidar',
          submitterRelation: 'Property Dealer',
          authorityDeclarationAccepted: true,
          primaryContactMobile: '9425011224',
          primaryContactRole: 'Authorised Dealer',
          alternateContactMobile: '9981234567',
          alternateContactRole: 'Actual Owner',
          exactAddress: 'Survey 88/3, Nalkheda Road, Near Krishi Upaj Mandi Bypass, Berasia',
          khasraOrSurveyNumber: '88/3',
          landmark: '500m from Nalkheda Tiraha',
          postcode: '463106',
          ownershipDocuments: [
            {
              id: 'doc-1004',
              name: 'Diversion Order 88-3 (Private).pdf',
              dataUrl: '/src/assets/images/listing_commercial_showroom_1794825885478.jpg',
              mimeType: 'application/pdf',
            },
          ],
        },
      },
    },
    {
      id: 'lst-sale-1005',
      publicId: 'BPA-S-1005',
      workflow: 'sale',
      submitterUserId: buyer1.id,
      status: 'pending_review',
      verificationLevel: 'none',
      staffNotes: 'Possible duplicate check: Plot 128 in Bhopal Naka matches BPA-S-1002. Call both parties.',
      duplicateFlaggedWith: ['BPA-S-1002'],
      verificationAudit: [],
      createdAt: now,
      updatedAt: now,
      data: {
        workflow: 'sale',
        category: 'vacant_plot',
        title: '1800 Sq Ft Plot near Bhopal Naka Petrol Pump',
        description: 'Residential plot with boundary wall available for urgent sale near Bhopal Naka.',
        localityId: 'loc-bhopal-naka',
        localityName: 'Bhopal Naka & Berasia-Bhopal Road',
        areaValue: 1800,
        areaUnit: 'sq_ft',
        ...(() => {
          const c = convertArea(1800, 'sq_ft');
          return { areaSqYd: c.sqYd, areaSqFt: c.sqFt };
        })(),
        priceAmount: 1890000,
        conditionalDetails: {
          dimensions: '30 ft x 60 ft',
          frontageRoadWidth: '30 ft Road',
          facing: 'East',
          cornerStatus: 'Corner',
          boundaryWall: 'Yes',
        },
        photos: [
          {
            id: 'ph-8',
            name: 'Plot View',
            dataUrl: '/src/assets/images/listing_plot_residential_1794825883754.jpg',
            mimeType: 'image/jpeg',
          },
        ],
        privateData: {
          actualOwnerName: 'Suresh Chandra Verma',
          submitterName: 'Ankit Vishwakarma',
          submitterRelation: 'Friend and Relative',
          authorityDeclarationAccepted: true,
          primaryContactMobile: '9755088776',
          primaryContactRole: 'Relative',
          alternateContactMobile: '9425600112',
          alternateContactRole: 'Owner',
          exactAddress: 'Plot No. 128, Keshav Enclave, Bhopal Naka, Berasia',
          plotOrHouseNumber: '128',
          landmark: 'Near Bhopal Naka',
          postcode: '463106',
          ownershipDocuments: [
            {
              id: 'doc-1005',
              name: 'Plot Registry Photo.jpg',
              dataUrl: '/src/assets/images/listing_plot_residential_1794825883754.jpg',
              mimeType: 'image/jpeg',
            },
          ],
        },
      },
    },
  ];

  const enquiries: EnquiryLead[] = [
    {
      id: 'enq-1',
      listingId: 'lst-sale-1001',
      publicId: 'BPA-S-1001',
      listingTitle: '3 BHK Independent Double-Storey House in Sardar Patel Nagar',
      workflow: 'sale',
      buyerUserId: buyer1.id,
      buyerName: buyer1.name,
      buyerMobile: buyer1.mobile,
      status: 'not_contacted',
      staffNote: '',
      createdAt: now,
    },
  ];

  const feeRecords: FeeRecord[] = [
    {
      id: 'fee-1',
      listingId: 'lst-rent-2001',
      publicId: 'BPA-R-2001',
      workflow: 'rent',
      finalAgreedAmount: 8500,
      sellerFee: 0,
      buyerFee: 0,
      landlordFee: 4250,
      tenantFee: 4250,
      totalCompanyFee: 8500,
      dueEvent: 'Rent agreement execution',
      status: 'pending',
      notes: 'Example ledger record: 50% Landlord + 50% Tenant = ₹8,500 total.',
      recordedAt: twoDaysAgo,
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      recipientRole: 'owner',
      type: 'new_submission',
      listingId: 'lst-sale-1004',
      publicId: 'BPA-S-1004',
      title: 'New Property Submission Pending Review',
      message: 'Kamlesh Patidar submitted BPA-S-1004 (Commercial/Warehouse Plot on Nalkheda Road). Call & review documents before publishing.',
      read: false,
      createdAt: now,
    },
    {
      id: 'notif-2',
      recipientRole: 'owner',
      type: 'new_submission',
      listingId: 'lst-sale-1005',
      publicId: 'BPA-S-1005',
      title: 'Potential Duplicate Alert: BPA-S-1005 vs BPA-S-1002',
      message: 'Plot No. 128 in Bhopal Naka submitted by Ankit Vishwakarma matches live listing BPA-S-1002. Call both parties to confirm authority.',
      read: false,
      createdAt: now,
    },
    {
      id: 'notif-3',
      recipientRole: 'owner',
      type: 'new_lead',
      listingId: 'lst-sale-1001',
      publicId: 'BPA-S-1001',
      title: 'New Buyer Interest on BPA-S-1001',
      message: 'Ankit Vishwakarma (+91 9755088776) marked Interested in BPA-S-1001.',
      read: false,
      createdAt: now,
    },
  ];

  return {
    users: [ownerUser, seller1, seller2, buyer1],
    sessions: {},
    listings,
    enquiries,
    nonInterested: [],
    feeRecords,
    notifications,
    localities: [...BERASIA_LOCALITIES],
    localitySuggestions: [],
    counters: {
      sale: 1005,
      rent: 2002,
    },
  };
}

class Store {
  private state: DatabaseState;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.state = JSON.parse(raw) as DatabaseState;
      } catch {
        this.state = createSeedState();
        this.save();
      }
    } else {
      this.state = createSeedState();
      this.save();
    }
  }

  save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf8');
  }

  getState(): DatabaseState {
    return this.state;
  }

  createSession(userId: string): string {
    const token = crypto.randomBytes(24).toString('hex');
    this.state.sessions[token] = userId;
    this.save();
    return token;
  }

  getUserByToken(token?: string): UserAccount | null {
    if (!token) return null;
    const userId = this.state.sessions[token];
    if (!userId) return null;
    return this.state.users.find((u) => u.id === userId) ?? null;
  }

  revokeSession(token?: string) {
    if (token && this.state.sessions[token]) {
      delete this.state.sessions[token];
      this.save();
    }
  }

  toPublicView(listing: ListingRecord): PublicListingView {
    return {
      id: listing.id,
      publicId: listing.publicId,
      workflow: listing.workflow,
      category: listing.data.category,
      title: listing.data.title,
      description: listing.data.description,
      localityId: listing.data.localityId,
      localityName: listing.data.localityName,
      areaValue: listing.data.areaValue,
      areaUnit: listing.data.areaUnit,
      areaSqYd: listing.data.areaSqYd,
      areaSqFt: listing.data.areaSqFt,
      priceAmount: listing.data.priceAmount,
      conditionalDetails: listing.data.conditionalDetails,
      rentalTerms: listing.data.rentalTerms,
      photos: listing.data.photos,
      video1: listing.data.video1,
      verificationLevel: listing.verificationLevel,
      verificationScopeNote: listing.verificationScopeNote,
      verifiedAt: listing.verifiedAt,
      companyPhone: COMPANY_PHONE,
      updatedAt: listing.updatedAt,
    };
  }

  nextPublicId(workflow: WorkflowType): string {
    if (workflow === 'sale') {
      this.state.counters.sale += 1;
      return `BPA-S-${this.state.counters.sale}`;
    }
    this.state.counters.rent += 1;
    return `BPA-R-${this.state.counters.rent}`;
  }

  detectDuplicates(
    workflow: WorkflowType,
    localityId: string,
    plotOrHouseNumber?: string,
    khasraOrSurveyNumber?: string,
    excludeListingId?: string
  ): string[] {
    const cleanPlot = (plotOrHouseNumber ?? '').trim().toLowerCase();
    const cleanKhasra = (khasraOrSurveyNumber ?? '').trim().toLowerCase();
    if (!cleanPlot && !cleanKhasra) return [];

    return this.state.listings
      .filter((l) => {
        if (l.id === excludeListingId) return false;
        if (l.workflow !== workflow) return false; // Sale & Rent can coexist
        if (l.status === 'rejected' || l.status === 'draft') return false;
        if (l.data.localityId !== localityId) return false;
        const otherPlot = (l.data.privateData.plotOrHouseNumber ?? '').trim().toLowerCase();
        const otherKhasra = (l.data.privateData.khasraOrSurveyNumber ?? '').trim().toLowerCase();
        const plotMatch = cleanPlot && otherPlot && cleanPlot === otherPlot;
        const khasraMatch = cleanKhasra && otherKhasra && cleanKhasra === otherKhasra;
        return Boolean(plotMatch || khasraMatch);
      })
      .map((l) => l.publicId);
  }
}

export const store = new Store();
