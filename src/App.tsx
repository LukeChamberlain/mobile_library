import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AuthView } from './features/auth/AuthView';
import { BookSearchForm } from './features/books/BookSearchForm';
import { BookSection } from './features/books/BookSection';
import { BookOverview } from './features/books/BookOverview';
import { ProfileBadge } from './features/profile/ProfileBadge';
import { useAuthSession } from './hooks/useAuthSession';
import { supabase } from './lib/supabase';
import { authenticateWithEmail, authenticateWithGoogle } from './services/auth';
import { getUserProfile, uploadPendingAvatarFor } from './services/profile';
import { searchGoogleBooks } from './services/googleBooks';
import { findWikidataDetails } from './services/wikidata';
import { addBookToLibrary, loadUserLibrary, removeBookFromLibrary } from './services/library';
import type { Book, WikidataBookDetails } from './types/book';

export default function App() {
  const { session, checkingSession } = useAuthSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [library, setLibrary] = useState<Book[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showAuthAfterSignup, setShowAuthAfterSignup] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [wikidataDetails, setWikidataDetails] = useState<WikidataBookDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [savingBook, setSavingBook] = useState(false);
  const pendingAvatarUpload = useRef(false);

  useEffect(() => {
    if (!session?.user.id) return;
    let active = true;
    setLibrary([]);
    setLibraryLoading(true);
    void loadUserLibrary(session.user.id).then((books) => {
      if (active) setLibrary(books);
    }).catch((error: unknown) => {
      if (active) {
        const detail = error instanceof Error ? ` ${error.message}` : '';
        setMessage(`Could not load your saved books. Check that the book-library SQL was run in Supabase.${detail}`);
      }
    }).finally(() => {
      if (active) setLibraryLoading(false);
    });
    return () => { active = false; };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.email || pendingAvatarUpload.current) return;
    pendingAvatarUpload.current = true;
    let active = true;
    void uploadPendingAvatarFor(session.user).then((uploaded) => {
      if (active && uploaded) setMessage('Your profile photo has been added.');
    }).catch(() => {
      if (active) setMessage('Your account is ready, but your selected profile photo could not be uploaded.');
    }).finally(() => {
      pendingAvatarUpload.current = false;
    });
    return () => { active = false; };
  }, [session?.user.id]);

  async function handleSelectBook(book: Book) {
    setSelectedBook(book);
    setWikidataDetails(book.wikidata ?? null);
    setDetailsError('');
    setMessage('');
    if (book.wikidata) return;

    setDetailsLoading(true);
    try {
      setWikidataDetails(await findWikidataDetails(book));
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : 'Could not load the book overview. Try again.');
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleAddBook(book: Book, details: WikidataBookDetails) {
    if (!session || library.some((savedBook) => savedBook.id === book.id)) return;
    setSavingBook(true);
    setLibrary((current) => current.some((savedBook) => savedBook.id === book.id) ? current : [...current, { ...book, wikidata: details }]);
    setMessage('');
    try {
      await addBookToLibrary(session.user.id, book, details);
    } catch (error) {
      setLibrary((current) => current.filter((savedBook) => savedBook.id !== book.id));
      setMessage(error instanceof Error ? `Could not save this book. ${error.message}` : 'Could not save this book. Try again.');
    } finally {
      setSavingBook(false);
    }
  }

  async function handleRemoveBook(bookId: string) {
    if (!session) return;
    const previousLibrary = library;
    setLibrary((current) => current.filter((book) => book.id !== bookId));
    setMessage('');
    try {
      await removeBookFromLibrary(session.user.id, bookId);
    } catch (error) {
      setLibrary(previousLibrary);
      setMessage(error instanceof Error ? `Could not remove this book. ${error.message}` : 'Could not remove this book. Try again.');
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const searchTerm = query.trim();
    if (!searchTerm) {
      setMessage('Enter a title or author to search.');
      return;
    }

    setLoading(true);
    setMessage('');
    setResults([]);
    try {
      const { books, resultCount } = await searchGoogleBooks(searchTerm);
      setResults(books);
      if (!books.length) {
        setMessage(resultCount ? 'No complete individual books matched your search.' : 'No books found. Try another search.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Search failed. Check your connection and API key, then try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailAuth(fullName: string, email: string, password: string, createAccount: boolean, photo: File | null) {
    setMessage('');
    if (createAccount) setShowAuthAfterSignup(true);
    setLoading(true);
    try {
      const result = await authenticateWithEmail(fullName, email, password, createAccount, photo);
      if (result.error) {
        if (createAccount) setShowAuthAfterSignup(false);
        setMessage(result.error.message);
      } else if (createAccount) {
        return {
          accountCreated: true as const,
          emailConfirmationRequired: result.needsEmailConfirmation,
          email,
          photoMessage: result.photoMessage,
        };
      } else {
        setShowAuthAfterSignup(false);
      }
    } catch {
      if (createAccount) setShowAuthAfterSignup(false);
      setMessage('Could not complete sign-in. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setMessage('');
    try {
      const { error } = await authenticateWithGoogle();
      if (error) setMessage(error.message);
    } catch {
      setMessage('Could not complete Google sign-in. Try again.');
    }
  }

  if (checkingSession) {
    return <main className="centered"><span className="spinner" aria-label="Loading" /></main>;
  }

  if (!session || showAuthAfterSignup) {
    return <AuthView onSubmit={handleEmailAuth} onGoogle={handleGoogleAuth} message={message} busy={loading} />;
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Blue Ribbon home"><span className="brand-mark"><img src="/blue-ribbon-logo.webp" alt="" /></span> Blue Ribbon</a>
        <div className="account-actions">
          <ProfileBadge profile={getUserProfile(session.user)} />
          <button className="text-button" onClick={() => void supabase?.auth.signOut()}>Sign out</button>
        </div>
      </header>

      {selectedBook ? (
        <BookOverview
          book={selectedBook}
          details={wikidataDetails}
          loading={detailsLoading}
          saved={library.some((book) => book.id === selectedBook.id)}
          saving={savingBook || libraryLoading}
          error={detailsError || message}
          onBack={() => { setSelectedBook(null); setWikidataDetails(null); setDetailsError(''); setMessage(''); }}
          onSave={() => wikidataDetails && void handleAddBook(selectedBook, wikidataDetails)}
        />
      ) : (
        <>
          <section className="intro" id="top">
            <p className="eyebrow">A BETTER KIND OF BOOK FIND</p>
            <h1>Find your next favorite.</h1>
            <p className="subtitle">Search for books and build a reading shelf that feels like yours.</p>
            <BookSearchForm query={query} loading={loading} onQueryChange={setQuery} onSearch={handleSearch} />
            {message && <p className="notice" role="status">{message}</p>}
          </section>

          {results.length > 0 && (
            <BookSection title="Search results" books={results} library={library} onSelect={(book) => void handleSelectBook(book)} disableActions={libraryLoading} />
          )}
          {libraryLoading ? <p className="library-loading">Loading your library…</p> : <BookSection
            title="My library"
            books={library}
            library={library}
            onSelect={(book) => void handleSelectBook(book)}
            onRemove={(id) => void handleRemoveBook(id)}
            showCount
          />}
        </>
      )}
      <footer className="footer">Your library is saved to your account.</footer>
    </main>
  );
}
