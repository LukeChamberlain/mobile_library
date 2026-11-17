import type { Book } from '../types/book';

const LIBRARY_KEY = 'mobile-library-books';

export function loadLibrary(): Book[] {
  try {
    const stored = localStorage.getItem(LIBRARY_KEY);
    return stored ? (JSON.parse(stored) as Book[]) : [];
  } catch {
    return [];
  }
}

export function storeLibrary(books: Book[]): void {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(books));
}
