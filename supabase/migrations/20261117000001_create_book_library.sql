create table public.books (
  google_books_id text primary key,
  title text not null,
  authors text[] not null default '{}',
  description text,
  cover_url text,
  categories text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.user_books (
  user_id uuid not null references auth.users(id) on delete cascade,
  google_books_id text not null references public.books(google_books_id) on delete cascade,
  status text not null default 'want_to_read'
    check (status in ('want_to_read', 'reading', 'read', 'did_not_finish')),
  rating smallint check (rating between 1 and 5),
  added_at timestamptz not null default now(),
  primary key (user_id, google_books_id)
);

alter table public.books enable row level security;
alter table public.user_books enable row level security;

grant select, insert on public.books to authenticated;
grant select, insert, delete on public.user_books to authenticated;

create policy "Signed-in users can view the book catalog"
on public.books
for select
to authenticated
using (true);

create policy "Signed-in users can add books to the catalog"
on public.books
for insert
to authenticated
with check (true);

create policy "Users can view their own library"
on public.user_books
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add books to their own library"
on public.user_books
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can remove books from their own library"
on public.user_books
for delete
to authenticated
using ((select auth.uid()) = user_id);
