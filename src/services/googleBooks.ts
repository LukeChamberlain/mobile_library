import type { Book, GoogleBooksResponse } from '../types/book';

const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;

export async function searchGoogleBooks(query: string): Promise<{ books: Book[]; resultCount: number }> {
  if (!GOOGLE_BOOKS_API_KEY) {
    throw new Error('Add your Google Books API key to .env.local to enable search.');
  }

  const params = new URLSearchParams({ q: query, maxResults: '20', key: GOOGLE_BOOKS_API_KEY });
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`);
  if (!response.ok) throw new Error('Search failed. Check your connection and API key, then try again.');

  const data = (await response.json()) as GoogleBooksResponse;
  const items = data.items ?? [];
  const books = items.flatMap(({ id, volumeInfo }) => {
    const title = volumeInfo?.title?.trim();
    const authors = volumeInfo?.authors?.filter((author) => author.trim());
    const cover = volumeInfo?.imageLinks?.thumbnail ?? volumeInfo?.imageLinks?.smallThumbnail;
    const bookTypes = volumeInfo?.seriesInfo?.volumeSeries?.map(
      (series) => series.seriesBookType?.toLowerCase() ?? '',
    ) ?? [];
    const isSeriesCollection = bookTypes.some(
      (type) => type.includes('collection edition') || type.includes('omnibus'),
    ) || /\b(complete|entire|full)\s+(series|collection)\b|\b(box(?:ed)?\s+set|omnibus|collection edition)\b|\bbooks?\s+\d+\s*[-–&]\s*\d+\b/i.test(
      `${title ?? ''} ${volumeInfo?.subtitle ?? ''}`,
    );

    if (!title || !authors?.length || !cover || isSeriesCollection) return [];

    return [{
      id,
      title,
      authors,
      description: volumeInfo?.description,
      thumbnail: cover.replace('http://', 'https://'),
    }];
  });

  return { books, resultCount: items.length };
}
