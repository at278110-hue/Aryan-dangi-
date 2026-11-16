import React, { useState } from 'react';
import { Building2, CheckCircle2 } from 'lucide-react';
import {
  CATEGORY_LABELS,
  formatAreaUnitLabel,
  formatINR,
  VERIFICATION_DESCRIPTIONS,
} from '../shared/constants';
import type { PublicListingView } from '../shared/types';

interface PropertyCardProps {
  listing: PublicListingView;
  interestState?: 'interested' | 'non_interested' | null;
  onSelect: (listing: PublicListingView) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  listing,
  interestState,
  onSelect,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const coverPhoto = listing.photos[0];

  const verInfo =
    listing.verificationLevel === 'level_2'
      ? VERIFICATION_DESCRIPTIONS.level_2
      : listing.verificationLevel === 'level_1'
      ? VERIFICATION_DESCRIPTIONS.level_1
      : null;

  const priceSuffix =
    listing.workflow === 'rent' && listing.rentalTerms
      ? ` / ${listing.rentalTerms.rentPeriod === 'monthly' ? 'mo' : listing.rentalTerms.rentPeriod === 'quarterly' ? 'qtr' : 'yr'}`
      : '';

  return (
    <article
      onClick={() => onSelect(listing)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-transform duration-150 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
        {coverPhoto && !imgFailed ? (
          <img
            src={coverPhoto.dataUrl}
            alt={listing.title}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 p-6 text-center text-zinc-500">
            <Building2 className="h-8 w-8 text-zinc-400" />
            <span className="mt-2 text-xs font-medium text-zinc-600">{listing.localityName}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
          <span className="font-mono font-medium text-zinc-700">{listing.publicId}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{CATEGORY_LABELS[listing.category]}</span>
        </div>

        <h3 className="mt-2 line-clamp-2 font-display text-base font-semibold leading-snug text-zinc-900">
          {listing.title}
        </h3>

        <p className="mt-1.5 truncate text-xs text-zinc-600">{listing.localityName}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-700">
          <span className="font-mono tabular-nums font-medium">
            {listing.areaValue.toLocaleString('en-IN')} {formatAreaUnitLabel(listing.areaUnit)}
          </span>
          {listing.areaUnit !== 'sq_yd' && (
            <>
              <span className="text-zinc-400" aria-hidden="true">
                ·
              </span>
              <span className="font-mono tabular-nums text-zinc-500">
                {listing.areaSqYd.toLocaleString('en-IN')} Sq Yd
              </span>
            </>
          )}
          {listing.conditionalDetails.bhkRooms && (
            <>
              <span className="text-zinc-400" aria-hidden="true">
                ·
              </span>
              <span>{listing.conditionalDetails.bhkRooms}</span>
            </>
          )}
        </div>

        <div className="mt-auto border-t border-zinc-100 pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <div className="font-mono text-lg font-semibold tabular-nums text-zinc-900">
              {formatINR(listing.priceAmount)}
              <span className="text-xs font-normal text-zinc-500">{priceSuffix}</span>
            </div>
            {interestState === 'interested' && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Interest registered
              </span>
            )}
          </div>

          {verInfo && (
            <div className="mt-1.5 text-xs font-medium text-emerald-900">
              {verInfo.title}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
