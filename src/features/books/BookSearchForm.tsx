import type { FormEvent } from 'react';

type BookSearchFormProps = {
  query: string;
  loading: boolean;
  onQueryChange: (query: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
};

export function BookSearchForm({ query, loading, onQueryChange, onSearch }: BookSearchFormProps) {
  return (
    <form className="search-form" onSubmit={onSearch}>
      <label className="sr-only" htmlFor="book-search">Search books by title or author</label>
      <input
        id="book-search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search by title or author"
      />
      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? 'Searching…' : 'Search books'}
      </button>
    </form>
  );
}
