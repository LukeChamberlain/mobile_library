import type { Book } from '../types/book';

const LEGACY_LIBRARY_KEY = 'mobile-library-books';

export function loadLegacyLibrary(): Book[] {
  try {
    const stored = localStorage.getItem(LEGACY_LIBRARY_KEY);
    return stored ? (JSON.parse(stored) as Book[]) : [];
  } catch {
    return [];
  }
}

export function clearLegacyLibrary(): void {
  localStorage.removeItem(LEGACY_LIBRARY_KEY);
}
