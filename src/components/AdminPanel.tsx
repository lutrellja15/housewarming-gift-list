import { useEffect, useMemo, useState } from 'react';
import { Edit, Gift, Link, LogOut, Plus, Search, Trash2 } from 'lucide-react';
import { fetchProductMetadata } from '../lib/productMetadata';
import { buildStoreSearchUrl } from '../lib/urlParser';
import {
  deleteGift,
  getCurrentUser,
  hasSupabaseConfig,
  listActivity,
  loginAdmin,
  logoutAdmin,
  setThankYouSent,
  updateGiftStatus,
  upsertGift
} from '../lib/store';
import { categories, priorities, statuses, type ActivityEvent, type GiftInput, type GiftItem } from '../lib/types';
import { formatPrice } from '../lib/filter';

type Props = {
  gifts: GiftItem[];
  onChanged: () => void;
};

const emptyInput: GiftInput = {
  title: '',
  imageUrl: '',
  store: '',
  storeUrl: '',
  price: null,
  description: '',
  priority: 'Nice to Have',
  category: 'Misc',
  status: 'Available',
  notes: ''
};

export function AdminPanel({ gifts, onChanged }: Props) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState<GiftInput>(emptyInput);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [pendingDelete, setPendingDelete] = useState<GiftItem | null>(null);
  const [urlToParse, setUrlToParse] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const isDemoAdmin = !hasSupabaseConfig && userEmail === 'demo';
  const isLoggedIn = Boolean(userEmail);
  const claimedGifts = useMemo(() => gifts.filter((gift) => gift.status !== 'Available'), [gifts]);

  useEffect(() => {
    getCurrentUser().then((user) => setUserEmail(user?.email ?? null));
    refreshActivity();
  }, []);

  async function refreshActivity() {
    try {
      setActivity(await listActivity());
    } catch {
      setActivity([]);
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (!hasSupabaseConfig && email === 'demo@example.com' && password === 'demo-admin') {
        setUserEmail('demo');
        setMessage('Demo admin mode is active. Configure Supabase before publishing.');
        return;
      }
      await loginAdmin(email, password);
      const user = await getCurrentUser();
      setUserEmail(user?.email ?? email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await logoutAdmin();
    setUserEmail(null);
    setEmail('');
    setPassword('');
  }

  function editGift(gift: GiftItem) {
    setEditingId(gift.id);
    setForm({
      title: gift.title,
      imageUrl: gift.imageUrl,
      store: gift.store,
      storeUrl: gift.storeUrl,
      price: gift.price,
      description: gift.description,
      priority: gift.priority,
      category: gift.category,
      status: gift.status,
      notes: gift.notes
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveGift(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!form.title.trim() || !form.storeUrl.trim()) {
      setError('Title and purchase link are required.');
      return;
    }
    setBusy(true);
    try {
      await upsertGift(
        {
          ...form,
          title: form.title.trim(),
          store: form.store.trim() || 'Custom',
          storeUrl: form.storeUrl.trim(),
          imageUrl: form.imageUrl.trim(),
          description: form.description.trim(),
          notes: form.notes.trim()
        },
        editingId ?? undefined
      );
      setForm(emptyInput);
      setEditingId(null);
      setMessage(editingId ? 'Gift updated.' : 'Gift added.');
      await onChanged();
      await refreshActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save gift.');
    } finally {
      setBusy(false);
    }
  }

  async function removeGift(gift: GiftItem) {
    await deleteGift(gift);
    setPendingDelete(null);
    await onChanged();
    await refreshActivity();
  }

  async function changeStatus(gift: GiftItem, status: GiftItem['status']) {
    await updateGiftStatus(gift, status, userEmail ?? 'Admin', userEmail);
    await onChanged();
    await refreshActivity();
  }

  async function parseUrl() {
    setError('');
    setMessage('');
    setCapturing(true);
    try {
      const parsed = await fetchProductMetadata(urlToParse);
      setForm((current) => ({
        ...current,
        title: current.title || parsed.title,
        store: parsed.store,
        storeUrl: parsed.storeUrl,
        imageUrl: current.imageUrl || parsed.imageUrl,
        price: current.price ?? parsed.price,
        description: current.description || parsed.description || current.description
      }));
      setMessage(
        parsed.source === 'metadata' && (parsed.imageUrl || parsed.price)
          ? 'Product details added. Review and edit before saving.'
          : 'Product link added. I could not auto-find a product photo or price for this store, so you can still fill those in if needed.'
      );
    } catch {
      setError('Enter a valid Amazon, Walmart, Wayfair, or custom product URL.');
    } finally {
      setCapturing(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <section className="admin-login" aria-label="Admin login">
        <div>
          <p className="eyebrow">Private admin</p>
          <h2>Manage Josh & Triniti's list</h2>
          <p>Sign in with the Supabase admin account. No passwords are stored in this repository.</p>
          {!hasSupabaseConfig && (
            <p className="demo-note">Local demo login: demo@example.com / demo-admin</p>
          )}
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </section>
    );
  }

  return (
    <section className="admin-panel" aria-label="Gift admin">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h2>Gift management</h2>
          <p>{isDemoAdmin ? 'Demo mode' : userEmail} can update items, purchase status, and thank-you tracking.</p>
        </div>
        <button className="secondary-button" onClick={handleLogout}>
          <LogOut size={18} /> Sign out
        </button>
      </div>

      <div className="admin-grid">
        <form className="gift-form" onSubmit={saveGift}>
          <h3>{editingId ? 'Edit gift' : 'Add gift'}</h3>
          <div className="link-helper">
            <label>
              Paste product URL
              <input value={urlToParse} onChange={(event) => setUrlToParse(event.target.value)} placeholder="https://..." />
            </label>
            <button type="button" className="secondary-button" onClick={parseUrl} disabled={capturing}>
              <Link size={18} /> {capturing ? 'Fetching...' : 'Capture'}
            </button>
          </div>
          <div className="store-search">
            <label>
              Search products
              <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="counter stools, towels..." />
            </label>
            <div>
              {(['Amazon', 'Walmart', 'Wayfair'] as const).map((store) => (
                <a key={store} className="small-link-button" href={buildStoreSearchUrl(store, productSearch)} target="_blank" rel="noreferrer">
                  <Search size={15} /> {store}
                </a>
              ))}
            </div>
          </div>
          <label>
            Title
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
          <label>
            Image URL <span>auto-filled when available</span>
            <input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://..." />
          </label>
          <label>
            Purchase link
            <input value={form.storeUrl} onChange={(event) => setForm({ ...form, storeUrl: event.target.value })} placeholder="https://..." required />
          </label>
          <div className="two-column">
            <label>
              Store
              <input value={form.store} onChange={(event) => setForm({ ...form, store: event.target.value })} />
            </label>
            <label>
              Estimated price
              <input
                value={form.price ?? ''}
                onChange={(event) => setForm({ ...form, price: event.target.value ? Number(event.target.value) : null })}
                type="number"
                min="0"
                step="0.01"
              />
            </label>
          </div>
          <div className="two-column">
            <label>
              Category
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as GiftInput['category'] })}>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as GiftInput['priority'] })}>
                {priorities.map((priority) => <option key={priority}>{priority}</option>)}
              </select>
            </label>
          </div>
          <label>
            Status
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as GiftInput['status'] })}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label>
            Description
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
          </label>
          <label>
            Notes
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} />
          </label>
          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
          <div className="form-actions">
            <button className="primary-button" disabled={busy}>
              <Plus size={18} /> {busy ? 'Saving...' : editingId ? 'Save changes' : 'Add gift'}
            </button>
            {editingId && (
              <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setForm(emptyInput); }}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="admin-side">
          <div className="summary-strip">
            <span><Gift size={18} /> {gifts.length} gifts</span>
            <span>{claimedGifts.length} claimed</span>
          </div>
          <div className="activity-list">
            <h3>Recent activity</h3>
            {activity.length === 0 ? <p className="empty-text">No activity yet.</p> : activity.map((event) => (
              <p key={event.id}>
                <strong>{event.action}</strong> {event.giftTitle}
                {event.actorName ? ` by ${event.actorName}` : ''}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Gift</th>
              <th>Status</th>
              <th>Price</th>
              <th>Thank-you</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {gifts.map((gift) => (
              <tr key={gift.id}>
                <td>
                  <strong>{gift.title}</strong>
                  <span>{gift.store} · {gift.category}</span>
                </td>
                <td>
                  <select value={gift.status} onChange={(event) => changeStatus(gift, event.target.value as GiftItem['status'])}>
                    {statuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </td>
                <td>{formatPrice(gift.price)}</td>
                <td>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={gift.thankYouSent}
                      onChange={async (event) => {
                        await setThankYouSent(gift.id, event.target.checked);
                        await onChanged();
                      }}
                    />
                    Sent
                  </label>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="icon-button" onClick={() => editGift(gift)} aria-label={`Edit ${gift.title}`}>
                      <Edit size={18} />
                    </button>
                    <button className="icon-button danger" onClick={() => setPendingDelete(gift)} aria-label={`Delete ${gift.title}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pendingDelete && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <h2 id="delete-title">Delete this gift?</h2>
            <p className="modal-subtitle">{pendingDelete.title}</p>
            <p>This removes the item from the public list and admin dashboard.</p>
            <div className="form-actions">
              <button className="primary-button danger-button" onClick={() => removeGift(pendingDelete)}>
                Delete gift
              </button>
              <button className="secondary-button" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
