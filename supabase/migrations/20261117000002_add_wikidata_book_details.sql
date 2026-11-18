alter table public.books
  add column if not exists wikidata_id text,
  add column if not exists wikidata_description text,
  add column if not exists wikidata_authors text[] not null default '{}',
  add column if not exists wikidata_genres text[] not null default '{}',
  add column if not exists publication_date text,
  add column if not exists wikidata_url text;

create index if not exists books_wikidata_id_idx on public.books (wikidata_id);
