export type Book = {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  thumbnail?: string;
  categories?: string[];
  wikidata?: WikidataBookDetails;
};

export type WikidataBookDetails = {
  id: string;
  title: string;
  description?: string;
  authors: string[];
  genres: string[];
  publicationDate?: string;
  entityUrl: string;
};

export type GoogleBooksResponse = {
  items?: Array<{
    id: string;
    volumeInfo?: {
      title?: string;
      subtitle?: string;
      authors?: string[];
      description?: string;
      imageLinks?: { thumbnail?: string; smallThumbnail?: string };
      categories?: string[];
      seriesInfo?: { volumeSeries?: Array<{ seriesBookType?: string }> };
    };
  }>;
};
