import type { Book, WikidataBookDetails } from '../types/book';

type WikidataSearchResponse = {
  search?: Array<{ id: string; label: string; description?: string }>;
};

type WikidataEntity = {
  id: string;
  labels?: { en?: { value: string } };
  descriptions?: { en?: { value: string } };
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
};

type WikidataEntitiesResponse = { entities?: Record<string, WikidataEntity> };

const API_URL = 'https://www.wikidata.org/w/api.php';

function claimIds(entity: WikidataEntity, property: string): string[] {
  return (entity.claims?.[property] ?? []).flatMap((claim) => {
    const value = claim.mainsnak?.datavalue?.value;
    return value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
      ? [value.id]
      : [];
  });
}

function normalizeTitle(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function dateFromClaim(entity: WikidataEntity): string | undefined {
  const value = entity.claims?.P577?.[0]?.mainsnak?.datavalue?.value;
  if (!value || typeof value !== 'object' || !('time' in value) || typeof value.time !== 'string') return undefined;
  return value.time.replace(/^\+/, '').split('T')[0];
}

async function fetchJson<T>(params: URLSearchParams): Promise<T> {
  params.set('origin', '*');
  const response = await fetch(`${API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error('Wikidata could not be reached. Try again in a moment.');
  return response.json() as Promise<T>;
}

export async function findWikidataDetails(book: Book): Promise<WikidataBookDetails | null> {
  const search = new URLSearchParams({
    action: 'wbsearchentities',
    search: book.title,
    language: 'en',
    uselang: 'en',
    type: 'item',
    limit: '8',
    format: 'json',
  });
  const searchData = await fetchJson<WikidataSearchResponse>(search);
  const candidates = searchData.search ?? [];
  if (!candidates.length) return null;

  const entitiesParams = new URLSearchParams({
    action: 'wbgetentities',
    ids: candidates.map(({ id }) => id).join('|'),
    props: 'labels|descriptions|claims',
    languages: 'en',
    format: 'json',
  });
  const { entities = {} } = await fetchJson<WikidataEntitiesResponse>(entitiesParams);
  const title = normalizeTitle(book.title);
  const exact = candidates
    .map(({ id }) => entities[id])
    .filter((entity): entity is WikidataEntity => Boolean(entity?.labels?.en?.value))
    .filter((entity) => normalizeTitle(entity.labels?.en?.value ?? '') === title);

  if (!exact.length) return null;

  const candidateAuthors = [...new Set(exact.flatMap((entity) => claimIds(entity, 'P50')))];
  const candidateGenres = [...new Set(exact.flatMap((entity) => claimIds(entity, 'P136')))];
  const relatedIds = [...new Set([...candidateAuthors, ...candidateGenres])];
  let related: Record<string, WikidataEntity> = {};
  if (relatedIds.length) {
    const relatedParams = new URLSearchParams({
      action: 'wbgetentities',
      ids: relatedIds.join('|'),
      props: 'labels',
      languages: 'en',
      format: 'json',
    });
    ({ entities: related = {} } = await fetchJson<WikidataEntitiesResponse>(relatedParams));
  }

  const matchingEntity = exact.find((entity) => {
    const names = claimIds(entity, 'P50').map((id) => related[id]?.labels?.en?.value?.toLocaleLowerCase());
    return !book.authors.length || !names.length || book.authors.some((author) => names.includes(author.toLocaleLowerCase()));
  }) ?? exact[0];
  const authorIds = claimIds(matchingEntity, 'P50');
  const genreIds = claimIds(matchingEntity, 'P136');

  return {
    id: matchingEntity.id,
    title: matchingEntity.labels?.en?.value ?? book.title,
    description: matchingEntity.descriptions?.en?.value,
    authors: authorIds.map((id) => related[id]?.labels?.en?.value).filter((name): name is string => Boolean(name)),
    genres: genreIds.map((id) => related[id]?.labels?.en?.value).filter((name): name is string => Boolean(name)),
    publicationDate: dateFromClaim(matchingEntity),
    entityUrl: `https://www.wikidata.org/wiki/${matchingEntity.id}`,
  };
}
