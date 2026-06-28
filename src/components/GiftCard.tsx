import { ExternalLink } from 'lucide-react';
import { formatPrice } from '../lib/filter';
import type { GiftItem } from '../lib/types';

type Props = {
  gift: GiftItem;
  onOpenPurchase: (gift: GiftItem) => void;
};

export function GiftCard({ gift, onOpenPurchase }: Props) {
  return (
    <article className="gift-card">
      <div className="gift-image-wrap">
        <img src={gift.imageUrl || '/placeholder.svg'} alt={gift.title} className="gift-image" loading="lazy" />
        <span className={`status-pill status-${gift.status.toLowerCase()}`}>{gift.status}</span>
      </div>
      <div className="gift-body">
        <div className="gift-meta-row">
          <span>{gift.category}</span>
          <span>{gift.priority}</span>
        </div>
        <h3>{gift.title}</h3>
        <p>{gift.description}</p>
        <div className="gift-facts">
          <span>{gift.store}</span>
          <strong>{formatPrice(gift.price)}</strong>
        </div>
        {gift.status !== 'Available' && (
          <p className="claim-note">
            {gift.status === 'Reserved' ? 'Reserved' : 'Purchased'}
            {gift.reservedByName || gift.purchasedByName ? ` by ${gift.reservedByName ?? gift.purchasedByName}` : ''}
          </p>
        )}
        <button className="primary-button full" onClick={() => onOpenPurchase(gift)}>
          <ExternalLink size={18} aria-hidden="true" />
          View purchase options
        </button>
      </div>
    </article>
  );
}
