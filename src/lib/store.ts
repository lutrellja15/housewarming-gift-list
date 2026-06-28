import { createClient, type User } from '@supabase/supabase-js';
import { seedGifts } from './seed';
import type { ActivityEvent, GiftInput, GiftItem, GiftStatus } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl!, supabasePublishableKey!) : null;

type DbGift = {
  id: string;
  title: string;
  image_url: string;
  store: string;
  store_url: string;
  price: number | null;
  description: string;
  priority: GiftItem['priority'];
  category: GiftItem['category'];
  status: GiftStatus;
  reserved_by_name: string | null;
  reserved_by_email: string | null;
  purchased_by_name: string | null;
  purchased_by_email: string | null;
  thank_you_sent: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
};

type DbActivity = {
  id: string;
  gift_id: string | null;
  gift_title: string;
  action: ActivityEvent['action'];
  actor_name: string | null;
  actor_email: string | null;
  created_at: string;
};

const demoGiftKey = 'housewarming-demo-gifts';
const demoActivityKey = 'housewarming-demo-activity';

function fromDbGift(row: DbGift): GiftItem {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    store: row.store,
    storeUrl: row.store_url,
    price: row.price,
    description: row.description,
    priority: row.priority,
    category: row.category,
    status: row.status,
    reservedByName: row.reserved_by_name,
    reservedByEmail: row.reserved_by_email,
    purchasedByName: row.purchased_by_name,
    purchasedByEmail: row.purchased_by_email,
    thankYouSent: row.thank_you_sent,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toDbGift(input: GiftInput) {
  return {
    title: input.title,
    image_url: input.imageUrl,
    store: input.store,
    store_url: input.storeUrl,
    price: input.price,
    description: input.description,
    priority: input.priority,
    category: input.category,
    status: input.status,
    notes: input.notes
  };
}

function fromDbActivity(row: DbActivity): ActivityEvent {
  return {
    id: row.id,
    giftId: row.gift_id,
    giftTitle: row.gift_title,
    action: row.action,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    createdAt: row.created_at
  };
}

function getDemoGifts(): GiftItem[] {
  const stored = localStorage.getItem(demoGiftKey);
  if (!stored) {
    localStorage.setItem(demoGiftKey, JSON.stringify(seedGifts));
    return seedGifts;
  }
  return JSON.parse(stored) as GiftItem[];
}

function setDemoGifts(gifts: GiftItem[]) {
  localStorage.setItem(demoGiftKey, JSON.stringify(gifts));
}

function getDemoActivity(): ActivityEvent[] {
  return JSON.parse(localStorage.getItem(demoActivityKey) ?? '[]') as ActivityEvent[];
}

function addDemoActivity(event: Omit<ActivityEvent, 'id' | 'createdAt'>) {
  const activity = [
    {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    },
    ...getDemoActivity()
  ].slice(0, 40);
  localStorage.setItem(demoActivityKey, JSON.stringify(activity));
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function loginAdmin(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable production login.');
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function logoutAdmin() {
  if (supabase) await supabase.auth.signOut();
}

export async function listGifts(): Promise<GiftItem[]> {
  if (!supabase) return getDemoGifts();
  const { data, error } = await supabase.from('gifts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DbGift[]).map(fromDbGift);
}

export async function listActivity(): Promise<ActivityEvent[]> {
  if (!supabase) return getDemoActivity();
  const { data, error } = await supabase.from('gift_activity').select('*').order('created_at', { ascending: false }).limit(40);
  if (error) throw error;
  return (data as DbActivity[]).map(fromDbActivity);
}

export async function upsertGift(input: GiftInput, id?: string): Promise<void> {
  if (!supabase) {
    const now = new Date().toISOString();
    const gifts = getDemoGifts();
    if (id) {
      const updated = gifts.map((gift) =>
        gift.id === id ? { ...gift, ...input, updatedAt: now } : gift
      );
      setDemoGifts(updated);
      addDemoActivity({ giftId: id, giftTitle: input.title, action: 'Updated', actorName: 'Demo admin', actorEmail: null });
      return;
    }
    const newGift: GiftItem = {
      ...input,
      id: crypto.randomUUID(),
      reservedByName: null,
      reservedByEmail: null,
      purchasedByName: null,
      purchasedByEmail: null,
      thankYouSent: false,
      createdAt: now,
      updatedAt: now
    };
    setDemoGifts([newGift, ...gifts]);
    addDemoActivity({ giftId: newGift.id, giftTitle: input.title, action: 'Added', actorName: 'Demo admin', actorEmail: null });
    return;
  }

  const payload = toDbGift(input);
  const { error } = id
    ? await supabase.from('gifts').update(payload).eq('id', id)
    : await supabase.from('gifts').insert(payload);
  if (error) throw error;
}

export async function deleteGift(gift: GiftItem): Promise<void> {
  if (!supabase) {
    setDemoGifts(getDemoGifts().filter((item) => item.id !== gift.id));
    addDemoActivity({ giftId: gift.id, giftTitle: gift.title, action: 'Deleted', actorName: 'Demo admin', actorEmail: null });
    return;
  }
  const { error } = await supabase.from('gifts').delete().eq('id', gift.id);
  if (error) throw error;
}

export async function setThankYouSent(giftId: string, thankYouSent: boolean): Promise<void> {
  if (!supabase) {
    setDemoGifts(getDemoGifts().map((gift) => (gift.id === giftId ? { ...gift, thankYouSent } : gift)));
    return;
  }
  const { error } = await supabase.from('gifts').update({ thank_you_sent: thankYouSent }).eq('id', giftId);
  if (error) throw error;
}

export async function updateGiftStatus(
  gift: GiftItem,
  status: GiftStatus,
  actorName: string | null,
  actorEmail: string | null
): Promise<void> {
  const payload = {
    status,
    reserved_by_name: status === 'Reserved' ? actorName : null,
    reserved_by_email: status === 'Reserved' ? actorEmail : null,
    purchased_by_name: status === 'Purchased' ? actorName : null,
    purchased_by_email: status === 'Purchased' ? actorEmail : null
  };
  const action = status === 'Available' ? 'Unreserved' : status;

  if (!supabase) {
    setDemoGifts(
      getDemoGifts().map((item) =>
        item.id === gift.id
          ? {
              ...item,
              status,
              reservedByName: payload.reserved_by_name,
              reservedByEmail: payload.reserved_by_email,
              purchasedByName: payload.purchased_by_name,
              purchasedByEmail: payload.purchased_by_email,
              updatedAt: new Date().toISOString()
            }
          : item
      )
    );
    addDemoActivity({ giftId: gift.id, giftTitle: gift.title, action, actorName, actorEmail });
    return;
  }

  const { error } = await supabase.from('gifts').update(payload).eq('id', gift.id);
  if (error) throw error;
  await supabase.from('gift_activity').insert({
    gift_id: gift.id,
    gift_title: gift.title,
    action,
    actor_name: actorName,
    actor_email: actorEmail
  });
}
