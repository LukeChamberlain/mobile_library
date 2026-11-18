import type { Book, WikidataBookDetails } from '../../types/book';

type BookOverviewProps = {
  book: Book;
  details: WikidataBookDetails | null;
  loading: boolean;
  saved: boolean;
  saving: boolean;
  error: string;
  onBack: () => void;
  onSave: () => void;
};

export function BookOverview({ book, details, loading, saved, saving, error, onBack, onSave }: BookOverviewProps) {
  return (
    <section className="overview-page" aria-labelledby="overview-title">
      <button className="back-button" onClick={onBack}>← Back to books</button>
      <article className="overview-card">
        <div className="overview-cover-wrap">
          {book.thumbnail
            ? <img className="overview-cover" src={book.thumbnail} alt={`Cover of ${book.title}`} />
            : <div className="cover placeholder overview-cover">M</div>}
        </div>
        <div className="overview-content">
          <p className="eyebrow">BOOK OVERVIEW</p>
          <h1 id="overview-title">{book.title}</h1>
          <p className="overview-search-authors">{book.authors.join(', ')}</p>

          {loading && <p className="overview-state">Looking for more book information…</p>}
          {error && <p className="notice" role="status">{error}</p>}
          {!loading && details && (
            <>
              {details.description && <p className="overview-description">{details.description}</p>}
              <dl className="overview-facts">
                <dt>Author{details.authors.length === 1 ? '' : 's'}</dt>
                <dd>{details.authors.length ? details.authors.join(', ') : 'Not listed'}</dd>
                <dt>Genre{details.genres.length === 1 ? '' : 's'}</dt>
                <dd>{details.genres.length ? details.genres.join(', ') : 'Not listed'}</dd>
                <dt>Publication date</dt>
                <dd>{details.publicationDate ?? 'Not listed'}</dd>
              </dl>
              <p className="source-note">Additional details from <a href={details.entityUrl} target="_blank" rel="noreferrer">Wikidata</a>.</p>
            </>
          )}
          {!loading && !details && !error && (
            <p className="overview-state">I couldn’t find a confident Wikidata match for this title. You can still return to your search results.</p>
          )}
          {details && <button className="primary-button save-book-button" onClick={onSave} disabled={saved || saving}>{saving ? 'Saving…' : saved ? 'In your library' : 'Add to my library'}</button>}
        </div>
      </article>
    </section>
  );
}
