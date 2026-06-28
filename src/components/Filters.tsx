import { Search } from 'lucide-react';
import { categories, statuses, type Filters as FilterState } from '../lib/types';

type Props = {
  filters: FilterState;
  stores: string[];
  onChange: (filters: FilterState) => void;
};

export function Filters({ filters, stores, onChange }: Props) {
  const patch = (updates: Partial<FilterState>) => onChange({ ...filters, ...updates });

  return (
    <section className="filters" aria-label="Gift filters">
      <label className="search-field">
        <Search size={18} aria-hidden="true" />
        <input
          value={filters.query}
          onChange={(event) => patch({ query: event.target.value })}
          placeholder="Search gifts, rooms, stores..."
          aria-label="Search gifts"
        />
      </label>
      <select value={filters.category} onChange={(event) => patch({ category: event.target.value as FilterState['category'] })} aria-label="Filter by category">
        <option value="All">All categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <select value={filters.store} onChange={(event) => patch({ store: event.target.value })} aria-label="Filter by store">
        <option value="All">All stores</option>
        {stores.map((store) => (
          <option key={store} value={store}>
            {store}
          </option>
        ))}
      </select>
      <select value={filters.status} onChange={(event) => patch({ status: event.target.value as FilterState['status'] })} aria-label="Filter by status">
        <option value="All">All statuses</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <input
        value={filters.minPrice}
        onChange={(event) => patch({ minPrice: event.target.value })}
        inputMode="decimal"
        placeholder="Min $"
        aria-label="Minimum price"
      />
      <input
        value={filters.maxPrice}
        onChange={(event) => patch({ maxPrice: event.target.value })}
        inputMode="decimal"
        placeholder="Max $"
        aria-label="Maximum price"
      />
    </section>
  );
}
