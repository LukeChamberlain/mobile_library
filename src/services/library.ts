import { clearLegacyLibrary, loadLegacyLibrary } from '../lib/libraryStorage';
import { supabase } from '../lib/supabase';
import type { Book, WikidataBookDetails } from '../types/book';

type BookRecord = {
  google_books_id: string;
  title: string;
  authors: string[];
  description: string | null;
  cover_url: string | null;
  categories: string[];
  wikidata_id: string | null;
  wikidata_description: string | null;
  wikidata_authors: string[];
  wikidata_genres: string[];
  publication_date: string | null;
  wikidata_url: string | null;
};

type UserBookRecord = {
  google_books_id: string;
  books: BookRecord | null;
};

function requireSupabase() {
  if (!supabase) throw new Error('Connect your Supabase project before saving books.');
  return supabase;
}

async function addBookToCatalog(client: NonNullable<typeof supabase>, book: Book, details?: WikidataBookDetails): Promise<void> {
  const { error } = await client.from('books').upsert({
    google_books_id: book.id,
    title: details?.title ?? book.title,
    authors: details?.authors ?? book.authors,
    description: details?.description ?? null,
    cover_url: null,
    categories: details?.genres ?? [],
    wikidata_id: details?.id ?? null,
    wikidata_description: details?.description ?? null,
    wikidata_authors: details?.authors ?? [],
    wikidata_genres: details?.genres ?? [],
    publication_date: details?.publicationDate ?? null,
    wikidata_url: details?.entityUrl ?? null,
  }, {
    onConflict: 'google_books_id',
  });
  if (error) throw error;
}

export async function addBookToLibrary(userId: string, book: Book, details?: WikidataBookDetails): Promise<void> {
  const client = requireSupabase();
  await addBookToCatalog(client, book, details);

  const { error } = await client.from('user_books').upsert({
    user_id: userId,
    google_books_id: book.id,
  }, {
    onConflict: 'user_id,google_books_id',
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

export async function removeBookFromLibrary(userId: string, googleBooksId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('user_books')
    .delete()
    .eq('user_id', userId)
    .eq('google_books_id', googleBooksId);
  if (error) throw error;
}

export async function loadUserLibrary(userId: string): Promise<Book[]> {
  const client = requireSupabase();
  const legacyBooks = loadLegacyLibrary();

  // Bring books saved by the previous browser-only version into the signed-in user's account.
  if (legacyBooks.length) {
    await Promise.all(legacyBooks.map((book) => addBookToLibrary(userId, book)));
    clearLegacyLibrary();
  }

  const { data, error } = await client
    .from('user_books')
    .select('google_books_id, books!inner(google_books_id, title, authors, description, cover_url, categories, wikidata_id, wikidata_description, wikidata_authors, wikidata_genres, publication_date, wikidata_url)')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as UserBookRecord[]).flatMap(({ books }) => {
    if (!books) return [];
    return [{
      id: books.google_books_id,
      title: books.title,
      authors: books.authors ?? [],
      description: books.description ?? undefined,
      thumbnail: books.cover_url ?? undefined,
      categories: books.categories ?? [],
      wikidata: books.wikidata_id ? {
        id: books.wikidata_id,
        title: books.title,
        description: books.wikidata_description ?? undefined,
        authors: books.wikidata_authors ?? [],
        genres: books.wikidata_genres ?? [],
        publicationDate: books.publication_date ?? undefined,
        entityUrl: books.wikidata_url ?? `https://www.wikidata.org/wiki/${books.wikidata_id}`,
      } : undefined,
    }];
  });
}
