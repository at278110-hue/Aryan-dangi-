import type { AreaUnit, BerasiaLocality, PropertyCategory, RentCategory, SaleCategory, UnlistReason } from './types.ts';

export const BRAND_NAME = 'Berasia Property Adda';
export const BRAND_NAME_HI = 'बेरसिया प्रॉपर्टी अड्डा';
export const COMPANY_PHONE = '+91 98260 45120';
export const COMPANY_PHONE_RAW = '9826045120';
export const BOUNDARY_LABEL = 'Berasia Tehsil, Bhopal District, Madhya Pradesh';

export const BERASIA_LOCALITIES: BerasiaLocality[] = [
  {
    id: 'loc-berasia-town',
    nameEn: 'Berasia Town Main Market & Ward Area',
    nameHi: 'बेरसिया नगर मुख्य बाजार',
    type: 'Town / Nagar Palika',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Nagar Palika Berasia (Wards 1–18)',
  },
  {
    id: 'loc-bhopal-naka',
    nameEn: 'Bhopal Naka & Berasia-Bhopal Road',
    nameHi: 'भोपाल नाका व भोपाल रोड',
    type: 'Highway / Commercial',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Ward 4 / Berasia Highway Corridor',
  },
  {
    id: 'loc-sardar-patel',
    nameEn: 'Sardar Patel Nagar, Berasia',
    nameHi: 'सरदार पटेल नगर, बेरसिया',
    type: 'Colony / Ward',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Nagar Palika Berasia',
  },
  {
    id: 'loc-subhash-colony',
    nameEn: 'Subhash Colony & Shastri Nagar',
    nameHi: 'सुभाष कॉलोनी व शास्त्री नगर',
    type: 'Colony / Ward',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Nagar Palika Berasia',
  },
  {
    id: 'loc-tikankhedi-road',
    nameEn: 'Tikankhedi Road & Galla Mandi Area',
    nameHi: 'टीकनखेड़ी रोड व गल्ला मंडी क्षेत्र',
    type: 'Highway / Commercial',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Berasia Mandi Zone',
  },
  {
    id: 'loc-dhamarra',
    nameEn: 'Dhamarra (Berasia Tehsil)',
    nameHi: 'धमर्रा (बेरसिया)',
    type: 'Gram Panchayat / Village',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Gram Panchayat Dhamarra',
  },
  {
    id: 'loc-runaha',
    nameEn: 'Runaha (Berasia Tehsil)',
    nameHi: 'रूनहा (बेरसिया)',
    type: 'Gram Panchayat / Village',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Gram Panchayat Runaha',
  },
  {
    id: 'loc-nazirabad',
    nameEn: 'Nazirabad (Berasia Tehsil)',
    nameHi: 'नज़ीराबाद (बेरसिया)',
    type: 'Gram Panchayat / Village',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Gram Panchayat Nazirabad',
  },
  {
    id: 'loc-gunga',
    nameEn: 'Gunga (Berasia Tehsil)',
    nameHi: 'गुंगा (बेरसिया)',
    type: 'Gram Panchayat / Village',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Gram Panchayat Gunga',
  },
  {
    id: 'loc-lalkhedi',
    nameEn: 'Lalkhedi & Harrakheda Belt',
    nameHi: 'लालखेड़ी व हर्राखेड़ा क्षेत्र',
    type: 'Gram Panchayat / Village',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Gram Panchayat Lalkhedi / Harrakheda',
  },
  {
    id: 'loc-garha-kalan',
    nameEn: 'Garha Kalan & Tarawali Kalan',
    nameHi: 'गरहा कलां व तरावली कलां',
    type: 'Gram Panchayat / Village',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Gram Panchayat Garha Kalan',
  },
  {
    id: 'loc-nalkheda-road',
    nameEn: 'Nalkheda Road & Industrial Belt',
    nameHi: 'नलखेड़ा रोड क्षेत्र',
    type: 'Highway / Commercial',
    tehsil: 'Berasia',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    panchayatOrWard: 'Berasia Industrial & Road Corridor',
  },
];

export const SALE_CATEGORIES: { id: SaleCategory; label: string; labelHi: string }[] = [
  { id: 'house', label: 'Constructed House', labelHi: 'बना हुआ मकान' },
  { id: 'vacant_plot', label: 'Vacant Residential Plot', labelHi: 'खाली आवासीय प्लॉट' },
  { id: 'agricultural_land', label: 'Agricultural Land', labelHi: 'कृषि भूमि' },
  { id: 'industrial_land', label: 'Industrial / Commercial Land', labelHi: 'व्यावसायिक / औद्योगिक भूमि' },
];

export const RENT_CATEGORIES: { id: RentCategory; label: string; labelHi: string }[] = [
  { id: 'house_flat_room', label: 'Home / Flat / Floor / Room', labelHi: 'मकान / फ्लैट / कमरा' },
  { id: 'shop_office_showroom', label: 'Shop / Office / Showroom', labelHi: 'दुकान / ऑफिस / शोरूम' },
  { id: 'warehouse_shed_industrial', label: 'Warehouse / Shed / Godown', labelHi: 'गोदाम / वेयरहाउस / शेड' },
];

export const CATEGORY_LABELS: Record<PropertyCategory, string> = {
  house: 'Constructed House',
  vacant_plot: 'Vacant Residential Plot',
  agricultural_land: 'Agricultural Land',
  industrial_land: 'Industrial / Commercial Land',
  house_flat_room: 'Home / Flat / Room',
  shop_office_showroom: 'Shop / Office / Showroom',
  warehouse_shed_industrial: 'Warehouse / Shed / Godown',
};

export const AREA_UNITS: { id: AreaUnit; label: string; toSqYd: number }[] = [
  { id: 'sq_ft', label: 'Sq Ft', toSqYd: 1 / 9 },
  { id: 'sq_yd', label: 'Sq Yard (Gaj)', toSqYd: 1 },
  { id: 'sq_m', label: 'Sq Metre', toSqYd: 1.19599 },
  { id: 'acre', label: 'Acre', toSqYd: 4840 },
  { id: 'hectare', label: 'Hectare', toSqYd: 11959.9 },
];

export function convertArea(value: number, unit: AreaUnit): { sqYd: number; sqFt: number } {
  const found = AREA_UNITS.find((u) => u.id === unit) ?? AREA_UNITS[0];
  const sqYd = Math.round(value * found.toSqYd * 100) / 100;
  const sqFt = Math.round(sqYd * 9 * 100) / 100;
  return { sqYd, sqFt };
}

export function formatAreaUnitLabel(unit: AreaUnit): string {
  return AREA_UNITS.find((u) => u.id === unit)?.label ?? unit;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const USER_UNLIST_REASONS: UnlistReason[] = [
  'Sold',
  'Rented out',
  'Temporarily withdrawn',
  'Own use',
  'Repairs',
  'Incorrect details',
  'Duplicate listing',
  'Website/service problem',
  'Other',
];

export const OWNER_REJECT_REASONS: string[] = [
  'Incomplete or unclear ownership documents',
  'Unable to reach owner / submitter via verification call',
  'Duplicate listing — stronger authority listing retained',
  'Property falls outside Berasia Tehsil (Bhopal District) boundary',
  'Exposed phone number or exact address inside public photos/video',
  'Incorrect area, price, or property details',
  'Owner requested withdrawal or property unavailable',
];

export const VERIFICATION_DESCRIPTIONS = {
  level_1: {
    title: 'Level 1 · Basic Document Review',
    shortLabel: 'Basic Document Review',
    meaning:
      'Berasia Property Adda reviewed submitted ownership papers, listing details, photos/videos, and verified via phone call with the owner or authorised submitter. This does not include an independent comprehensive revenue-record, title, or court-dispute investigation.',
  },
  level_2: {
    title: 'Level 2 · Detailed Expert Review',
    shortLabel: 'Detailed Expert Review',
    meaning:
      'A relevant property/revenue expert reviewed submitted documents against available Bhopal/Berasia revenue records (B-1 / Khasra), ownership chain, and available dispute/claim records. Neither review level is a blanket legal guarantee.',
  },
} as const;
