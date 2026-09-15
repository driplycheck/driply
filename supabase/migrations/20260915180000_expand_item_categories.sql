alter table public.items
  drop constraint if exists items_category_check;

alter table public.items
  add constraint items_category_check
  check (category in ('top', 'bottoms', 'shoes', 'accessory', 'other', 'dress', 'skirt', 'bag'));
