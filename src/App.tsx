import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AuthView } from './features/auth/AuthView';
import { BookSearchForm } from './features/books/BookSearchForm';
import { BookSection } from './features/books/BookSection';
import { ProfileBadge } from './features/profile/ProfileBadge';
import { useAuthSession } from './hooks/useAuthSession';
import { loadLibrary, storeLibrary } from './lib/libraryStorage';
import { supabase } from './lib/supabase';
import { authenticateWithEmail, authenticateWithGoogle } from './services/auth';
import { getUserProfile, uploadPendingAvatarFor } from './services/profile';
import { searchGoogleBooks } from './services/googleBooks';
import type { Book } from './types/book';

export default function App() {
  const { session, checkingSession } = useAuthSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [library, setLibrary] = useState<Book[]>(loadLibrary);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showAuthAfterSignup, setShowAuthAfterSignup] = useState(false);
  const pendingAvatarUpload = useRef(false);

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

  function updateLibrary(nextBooks: Book[]) {
    setLibrary(nextBooks);
    try {
      storeLibrary(nextBooks);
    } catch {
      setMessage('Your browser could not save the library. Check its storage settings.');
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

      <section className="intro" id="top">
        <p className="eyebrow">A BETTER KIND OF BOOK FIND</p>
        <h1>Find your next favorite.</h1>
        <p className="subtitle">Search for books and build a reading shelf that feels like yours.</p>
        <BookSearchForm query={query} loading={loading} onQueryChange={setQuery} onSearch={handleSearch} />
        {message && <p className="notice" role="status">{message}</p>}
      </section>

      {results.length > 0 && (
        <BookSection title="Search results" books={results} library={library} onAdd={(book) => updateLibrary([...library, book])} />
      )}
      <BookSection
        title="My library"
        books={library}
        library={library}
        onRemove={(id) => updateLibrary(library.filter((book) => book.id !== id))}
        showCount
      />
      <footer className="footer">Your library is saved in this browser.</footer>
    </main>
  );
}
