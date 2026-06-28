import { useEffect, useMemo, useState } from 'react';
import { Copy, Heart, ShieldCheck } from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { Filters } from './components/Filters';
import { GiftCard } from './components/GiftCard';
import { PurchaseModal } from './components/PurchaseModal';
import { filterGifts, uniqueStores } from './lib/filter';
import { hasSupabaseConfig, listGifts } from './lib/store';
import type { Filters as FilterState, GiftItem } from './lib/types';
import './styles/app.css';

const initialFilters: FilterState = {
  query: '',
  category: 'All',
  store: 'All',
  status: 'All',
  minPrice: '',
  maxPrice: ''
};

export default function App() {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'public' | 'admin'>('public');
  const [copied, setCopied] = useState(false);

  const filteredGifts = useMemo(() => filterGifts(gifts, filters), [gifts, filters]);
  const stores = useMemo(() => uniqueStores(gifts), [gifts]);
  const availableCount = gifts.filter((gift) => gift.status === 'Available').length;

  async function refreshGifts() {
    try {
      setError('');
      setGifts(await listGifts());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load gifts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshGifts();
  }, []);

  async function copyShareLink() {
    await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <nav className="top-nav">
          <a className="brand" href="#" onClick={() => setView('public')}>Josh & Triniti</a>
          <div>
            <button className="nav-button" onClick={copyShareLink}>
              <Copy size={17} /> {copied ? 'Copied' : 'Share'}
            </button>
            <button className="nav-button" onClick={() => setView(view === 'public' ? 'admin' : 'public')}>
              <ShieldCheck size={17} /> {view === 'public' ? 'Admin' : 'Gift list'}
            </button>
          </div>
        </nav>
        <div className="hero-content">
          <p className="eyebrow">Housewarming gift list</p>
          <h1>Help Josh and Triniti settle into their new home.</h1>
          <p>
            Pick something practical, cozy, or project-ready. Reserve an item before shopping so everyone can avoid duplicates.
          </p>
          <div className="hero-stats">
            <span><strong>{gifts.length}</strong> gift ideas</span>
            <span><strong>{availableCount}</strong> still available</span>
            <span><Heart size={18} /> Thank you for celebrating with us</span>
          </div>
          {!hasSupabaseConfig && (
            <p className="config-banner">Demo data is active. Connect Supabase for production login and shared live updates.</p>
          )}
        </div>
      </header>

      <main>
        {view === 'admin' ? (
          <AdminPanel gifts={gifts} onChanged={refreshGifts} />
        ) : (
          <>
            <Filters filters={filters} stores={stores} onChange={setFilters} />
            {error && <p className="error-text page-message">{error}</p>}
            {loading ? (
              <section className="gift-grid">
                {Array.from({ length: 6 }).map((_, index) => <div className="skeleton-card" key={index} />)}
              </section>
            ) : filteredGifts.length === 0 ? (
              <section className="empty-state">
                <h2>No gifts match those filters.</h2>
                <p>Clear a filter or search for a different room, store, or item.</p>
                <button className="secondary-button" onClick={() => setFilters(initialFilters)}>Clear filters</button>
              </section>
            ) : (
              <section className="gift-grid" aria-label="Gift list">
                {filteredGifts.map((gift) => (
                  <GiftCard key={gift.id} gift={gift} onOpenPurchase={setSelectedGift} />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      <footer>
        <p>Made for Josh and Triniti's housewarming. Please reserve before you buy.</p>
      </footer>
      <PurchaseModal gift={selectedGift} onClose={() => setSelectedGift(null)} onChanged={refreshGifts} />
    </div>
  );
}
