export const categories = [
  'Kitchen',
  'Living Room',
  'Bedroom',
  'Bathroom',
  'Outdoor',
  'Smart Home',
  'Decor',
  'Cleaning',
  'Tools',
  'Gift Card',
  'Misc'
] as const;

export const priorities = ['Must Have', 'Nice to Have', 'Optional'] as const;
export const statuses = ['Available', 'Reserved', 'Purchased'] as const;

export type Category = (typeof categories)[number];
export type Priority = (typeof priorities)[number];
export type GiftStatus = (typeof statuses)[number];

export type GiftItem = {
  id: string;
  title: string;
  imageUrl: string;
  store: string;
  storeUrl: string;
  price: number | null;
  description: string;
  priority: Priority;
  category: Category;
  status: GiftStatus;
  reservedByName: string | null;
  reservedByEmail: string | null;
  purchasedByName: string | null;
  purchasedByEmail: string | null;
  thankYouSent: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type GiftInput = Omit<
  GiftItem,
  | 'id'
  | 'reservedByName'
  | 'reservedByEmail'
  | 'purchasedByName'
  | 'purchasedByEmail'
  | 'thankYouSent'
  | 'createdAt'
  | 'updatedAt'
>;

export type ActivityEvent = {
  id: string;
  giftId: string | null;
  giftTitle: string;
  action: 'Reserved' | 'Unreserved' | 'Purchased' | 'Added' | 'Updated' | 'Deleted';
  actorName: string | null;
  actorEmail: string | null;
  createdAt: string;
};

export type Filters = {
  query: string;
  category: 'All' | Category;
  store: 'All' | string;
  status: 'All' | GiftStatus;
  minPrice: string;
  maxPrice: string;
};

export type VisitorAction = 'reserve' | 'purchase' | 'store';
