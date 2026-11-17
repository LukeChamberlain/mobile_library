import type { Book } from '../../types/book';

type BookSectionProps = {
  title: string;
  books: Book[];
  library: Book[];
  onAdd?: (book: Book) => void;
  onRemove?: (id: string) => void;
  showCount?: boolean;
};

export function BookSection({ title, books, library, onAdd, onRemove, showCount = false }: BookSectionProps) {
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
                {onAdd && <button className={`small-button ${saved ? 'saved' : ''}`} onClick={() => onAdd(book)} disabled={saved}>{saved ? 'Added' : 'Add'}</button>}
                {onRemove && <button className="remove-button" onClick={() => onRemove(book.id)}>Remove</button>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
