import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AuthScreen } from '@/components/auth-screen';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Book = {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  thumbnail?: string;
};

type GoogleBooksResponse = {
  items?: {
    id: string;
    volumeInfo?: {
      title?: string;
      subtitle?: string;
      authors?: string[];
      description?: string;
      imageLinks?: { thumbnail?: string; smallThumbnail?: string };
      seriesInfo?: {
        volumeSeries?: { seriesBookType?: string }[];
      };
    };
  }[];
};

const LIBRARY_KEY = 'mobile-library-books';
const GOOGLE_BOOKS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(isSupabaseConfigured);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [library, setLibrary] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(LIBRARY_KEY)
      .then((savedBooks) => {
        if (savedBooks) setLibrary(JSON.parse(savedBooks) as Book[]);
      })
      .catch(() => setMessage('Could not load your saved library.'));
  }, []);

  async function saveLibrary(nextLibrary: Book[]) {
    setLibrary(nextLibrary);
    try {
      await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(nextLibrary));
    } catch {
      setMessage('Could not save your library on this device.');
    }
  }

  async function searchBooks() {
    const searchTerm = query.trim();
    if (!searchTerm) {
      setMessage('Enter a title or author to search.');
      return;
    }
    if (!GOOGLE_BOOKS_API_KEY) {
      setMessage('Add your Google Books API key to .env.local to enable search.');
      return;
    }

    setLoading(true);
    setMessage('');
    setResults([]);
    try {
      const params = new URLSearchParams({ q: searchTerm, maxResults: '20', key: GOOGLE_BOOKS_API_KEY });
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
      if (!response.ok) throw new Error('Search request failed');
      const data = (await response.json()) as GoogleBooksResponse;
      const rawBooks = data.items ?? [];
      const books = rawBooks
        .filter(({ volumeInfo }) => {
          const title = volumeInfo?.title?.trim();
          const authors = volumeInfo?.authors?.filter((author) => author.trim());
          const cover = volumeInfo?.imageLinks?.thumbnail ?? volumeInfo?.imageLinks?.smallThumbnail;
          const bookTypes = volumeInfo?.seriesInfo?.volumeSeries?.map((series) =>
            series.seriesBookType?.toLowerCase() ?? '',
          ) ?? [];
          const looksLikeBundle =
            bookTypes.some((type) => type.includes('collection edition') || type.includes('omnibus')) ||
            /\b(complete|entire|full)\s+(series|collection)\b|\b(box(?:ed)?\s+set|omnibus|collection edition)\b|\bbooks?\s+\d+\s*[-–&]\s*\d+\b/i.test(
              `${title ?? ''} ${volumeInfo?.subtitle ?? ''}`,
            );

          return Boolean(title && authors?.length && cover && !looksLikeBundle);
        })
        .map(({ id, volumeInfo }) => ({
          id,
          title: volumeInfo!.title!.trim(),
          authors: volumeInfo!.authors!.filter((author) => author.trim()),
          description: volumeInfo?.description,
          thumbnail: (volumeInfo?.imageLinks?.thumbnail ?? volumeInfo?.imageLinks?.smallThumbnail)?.replace('http://', 'https://'),
        }));
      setResults(books);
      if (books.length === 0) {
        setMessage(
          rawBooks.length === 0
            ? 'No books found. Try another search.'
            : 'No complete individual books matched—some results may be missing a title, author, or cover, or may be series collections.',
        );
      }
    } catch {
      setMessage('Search failed. Check your connection and API key, then try again.');
    } finally {
      setLoading(false);
    }
  }

  function addBook(book: Book) {
    if (library.some((savedBook) => savedBook.id === book.id)) return;
    void saveLibrary([...library, book]);
  }

  function removeBook(bookId: string) {
    void saveLibrary(library.filter((book) => book.id !== bookId));
  }

  if (checkingSession) {
    return <View style={styles.loadingScreen}><ActivityIndicator color="#315c48" /></View>;
  }

  if (!session) return <AuthScreen />;

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.eyebrow}>YOUR PERSONAL READING SPACE</Text>
          <Text style={styles.title}>Mobile Library</Text>
        </View>
        <Pressable onPress={() => { void supabase?.auth.signOut(); }}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Find a book and start building your shelf.</Text>

      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search books by title or author"
          style={styles.input}
          placeholder="Title or author"
          placeholderTextColor="#7c827c"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchBooks}
          returnKeyType="search"
        />
        <Pressable style={styles.searchButton} onPress={searchBooks} disabled={loading}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator color="#315c48" style={styles.loader} />}
      {!!message && <Text style={styles.message}>{message}</Text>}

      {results.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search results</Text>
          {results.map((book) => {
            const isSaved = library.some((savedBook) => savedBook.id === book.id);
            return (
              <View key={book.id} style={styles.bookCard}>
                <BookCover book={book} />
                <View style={styles.bookDetails}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.author}>{book.authors.join(', ')}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isSaved ? `${book.title} is in your library` : `Add ${book.title} to your library`}
                  style={[styles.addButton, isSaved && styles.savedButton]}
                  onPress={() => addBook(book)}
                  disabled={isSaved}>
                  <Text style={[styles.addButtonText, isSaved && styles.savedButtonText]}>
                    {isSaved ? 'Added' : 'Add'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My library <Text style={styles.count}>{library.length}</Text></Text>
        {library.length === 0 ? (
          <Text style={styles.empty}>Books you add will appear here and stay saved on this device.</Text>
        ) : (
          library.map((book) => (
            <View key={book.id} style={styles.bookCard}>
              <BookCover book={book} />
              <View style={styles.bookDetails}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.author}>{book.authors.join(', ')}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => removeBook(book.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function BookCover({ book }: { book: Book }) {
  if (book.thumbnail) return <Image source={{ uri: book.thumbnail }} style={styles.cover} />;
  return <View style={[styles.cover, styles.coverPlaceholder]}><Text style={styles.coverMark}>M</Text></View>;
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f4ef' },
  screen: { flexGrow: 1, backgroundColor: '#f5f4ef', paddingTop: 72, paddingHorizontal: 22, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerTitle: { flex: 1 },
  eyebrow: { color: '#617367', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#1f352a', fontSize: 34, fontWeight: '700', marginTop: 8 },
  signOut: { color: '#315c48', fontSize: 14, fontWeight: '700' },
  subtitle: { color: '#626a63', fontSize: 16, marginTop: 8, marginBottom: 24 },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, minWidth: 0, height: 50, borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 15, color: '#1f352a', fontSize: 16 },
  searchButton: { height: 50, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 17, borderRadius: 12, backgroundColor: '#315c48' },
  searchButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  loader: { marginTop: 22 },
  message: { color: '#8b4c39', marginTop: 14, lineHeight: 20 },
  section: { marginTop: 30, gap: 12 },
  sectionTitle: { color: '#1f352a', fontSize: 21, fontWeight: '700', marginBottom: 2 },
  count: { color: '#758177', fontSize: 17, fontWeight: '500' },
  empty: { color: '#68716a', lineHeight: 22 },
  bookCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 12, borderRadius: 14, backgroundColor: '#fff' },
  cover: { width: 48, height: 68, borderRadius: 5, backgroundColor: '#e5e8e1' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  coverMark: { color: '#768779', fontSize: 20, fontWeight: '700' },
  bookDetails: { flex: 1, gap: 5 },
  bookTitle: { color: '#25372c', fontSize: 15, fontWeight: '700' },
  author: { color: '#6e776f', fontSize: 13 },
  addButton: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#315c48' },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  savedButton: { backgroundColor: '#e6eee8' },
  savedButtonText: { color: '#315c48' },
  removeText: { color: '#8b4c39', fontSize: 13, fontWeight: '600' },
});
