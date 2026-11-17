export type Book = {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  thumbnail?: string;
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
      seriesInfo?: { volumeSeries?: Array<{ seriesBookType?: string }> };
    };
  }>;
};
