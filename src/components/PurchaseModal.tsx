import { useState } from 'react';
import { X } from 'lucide-react';
import { updateGiftStatus } from '../lib/store';
import type { GiftItem, VisitorAction } from '../lib/types';

type Props = {
  gift: GiftItem | null;
  onClose: () => void;
  onChanged: () => void;
};

export function PurchaseModal({ gift, onClose, onChanged }: Props) {
  const [action, setAction] = useState<VisitorAction>('reserve');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!gift) return null;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (action === 'reserve') {
        await updateGiftStatus(gift, 'Reserved', name.trim() || null, email.trim() || null);
        onChanged();
      }
      if (action === 'purchase') {
        await updateGiftStatus(gift, 'Purchased', name.trim() || null, email.trim() || null);
        onChanged();
      }
      window.open(gift.storeUrl, '_blank', 'noopener,noreferrer');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update this gift. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close purchase dialog">
          <X size={20} />
        </button>
        <h2 id="purchase-title">Are you planning to purchase this item?</h2>
        <p className="modal-subtitle">{gift.title}</p>
        <div className="choice-list">
          <label onClick={() => setAction('reserve')}>
            <input type="radio" checked={action === 'reserve'} onChange={() => setAction('reserve')} />
            <span>Yes, reserve this item</span>
          </label>
          <label onClick={() => setAction('purchase')}>
            <input type="radio" checked={action === 'purchase'} onChange={() => setAction('purchase')} />
            <span>I already purchased this item</span>
          </label>
          <label onClick={() => setAction('store')}>
            <input type="radio" checked={action === 'store'} onChange={() => setAction('store')} />
            <span>Just take me to the store</span>
          </label>
        </div>
        {action !== 'store' && (
          <div className="two-column">
            <label>
              Name <span>optional</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
            </label>
            <label>
              Email <span>optional</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" maxLength={120} />
            </label>
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
        <button className="primary-button full" disabled={busy} onClick={submit}>
          {busy ? 'Saving...' : 'Continue to store'}
        </button>
      </div>
    </div>
  );
}
