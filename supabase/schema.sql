create extension if not exists "pgcrypto";

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 160),
  image_url text not null default '',
  store text not null check (char_length(store) <= 80),
  store_url text not null,
  price numeric(10, 2),
  description text not null default '',
  priority text not null check (priority in ('Must Have', 'Nice to Have', 'Optional')),
  category text not null check (category in ('Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Outdoor', 'Smart Home', 'Decor', 'Cleaning', 'Tools', 'Gift Card', 'Misc')),
  status text not null default 'Available' check (status in ('Available', 'Reserved', 'Purchased')),
  reserved_by_name text,
  reserved_by_email text,
  purchased_by_name text,
  purchased_by_email text,
  thank_you_sent boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_activity (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid references public.gifts(id) on delete set null,
  gift_title text not null,
  action text not null check (action in ('Reserved', 'Unreserved', 'Purchased', 'Added', 'Updated', 'Deleted')),
  actor_name text,
  actor_email text,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gifts_touch_updated_at on public.gifts;
create trigger gifts_touch_updated_at
before update on public.gifts
for each row execute function public.touch_updated_at();

create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

alter table public.gifts enable row level security;
alter table public.gift_activity enable row level security;

revoke all on public.gifts from anon, authenticated;
revoke all on public.gift_activity from anon, authenticated;

grant select on public.gifts to anon, authenticated;
grant update (status, reserved_by_name, reserved_by_email, purchased_by_name, purchased_by_email) on public.gifts to anon, authenticated;
grant insert, update, delete on public.gifts to authenticated;

grant select, insert on public.gift_activity to anon, authenticated;

drop policy if exists "Public can read gifts" on public.gifts;
create policy "Public can read gifts"
on public.gifts for select
using (true);

drop policy if exists "Visitors can reserve or purchase gifts" on public.gifts;
create policy "Visitors can reserve or purchase gifts"
on public.gifts for update
using (status in ('Available', 'Reserved'))
with check (status in ('Available', 'Reserved', 'Purchased'));

drop policy if exists "Admins manage gifts" on public.gifts;
create policy "Admins manage gifts"
on public.gifts for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Public can add activity" on public.gift_activity;
create policy "Public can add activity"
on public.gift_activity for insert
with check (true);

drop policy if exists "Admins read activity" on public.gift_activity;
create policy "Admins read activity"
on public.gift_activity for select
to authenticated
using (public.is_admin_user());

insert into public.gifts (title, image_url, store, store_url, price, description, priority, category, status, notes)
values
('Ceramic Nonstick Cookware Set', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80', 'Amazon', 'https://www.amazon.com/s?k=ceramic+nonstick+cookware+set', 119, 'Everyday pots and pans for weeknight dinners and hosting friends.', 'Must Have', 'Kitchen', 'Available', ''),
('Warm Floor Lamp', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80', 'Wayfair', 'https://www.wayfair.com/keyword.php?keyword=warm+floor+lamp', 86, 'Soft lighting for the living room reading corner.', 'Nice to Have', 'Living Room', 'Available', ''),
('Hotel Cotton Towel Bundle', 'https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?auto=format&fit=crop&w=900&q=80', 'Walmart', 'https://www.walmart.com/search?q=cotton+towel+bundle', 48, 'Neutral bath towels and hand towels for guests.', 'Must Have', 'Bathroom', 'Available', ''),
('Home Improvement Gift Card', 'https://images.unsplash.com/photo-1561715276-a2d087060f1d?auto=format&fit=crop&w=900&q=80', 'Any Store', 'https://www.walmart.com/cp/gift-cards/96894', null, 'A flexible option for paint, hardware, plants, or a future project.', 'Optional', 'Gift Card', 'Available', 'Any amount is appreciated.')
on conflict do nothing;
