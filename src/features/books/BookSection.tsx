import type { Book } from '../../types/book';

type BookSectionProps = {
  title: string;
  books: Book[];
  library: Book[];
  onAdd?: (book: Book) => void;
  onRemove?: (id: string) => void;
  onSelect?: (book: Book) => void;
  showCount?: boolean;
  disableActions?: boolean;
};

export function BookSection({ title, books, library, onAdd, onRemove, onSelect, showCount = false, disableActions = false }: BookSectionProps) {
  return (
    <section className="book-section">
      <div className="section-heading">
        <h2>{title}</h2>
        {showCount && <span className="count">{books.length}</span>}
      </div>
      {books.length === 0 ? <p className="empty-state">{showCount ? 'Books you add will appear here.' : 'No books to show.'}</p> : (
        <div className="book-grid">
          {books.map((book) => {
            const saved = library.some((item) => item.id === book.id);
            return (
              <article className="book-card" key={book.id}>
                {book.thumbnail
                  ? <img className="cover" src={book.thumbnail} alt={`Cover of ${book.title}`} loading="lazy" />
                  : <div className="cover placeholder">M</div>}
                <div className="book-info"><h3>{book.title}</h3><p>{book.authors.join(', ')}</p></div>
                {onSelect && <button className="small-button overview-button" onClick={() => onSelect(book)}>Overview</button>}
                {onAdd && <button className={`small-button ${saved ? 'saved' : ''}`} onClick={() => onAdd(book)} disabled={saved || disableActions}>{saved ? 'Added' : 'Add'}</button>}
                {onRemove && <button className="remove-button" onClick={() => onRemove(book.id)} disabled={disableActions}>Remove</button>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
