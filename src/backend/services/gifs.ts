import { redis } from "bun";
import { env } from "@/shared/env";
import type { PaginationResponse } from "@/shared/schemas";

/**
 * GIF service.
 * Handles Klipy API integration with Redis caching.
 */

// ==========================
// Types
// ==========================

// Klipy API Response Types
interface KlipyFile {
  url: string;
  width: number;
  height: number;
  size: number;
}

interface KlipyFileFormats {
  gif: KlipyFile;
  webp: KlipyFile;
  jpg: KlipyFile;
  mp4: KlipyFile;
  webm: KlipyFile;
}

interface KlipyGif {
  id: number;
  slug: string;
  title: string;
  type: "gif";
  tags: string[];
  blur_preview: string;
  file: {
    hd: KlipyFileFormats;
    md: KlipyFileFormats;
    sm: KlipyFileFormats;
    xs: KlipyFileFormats;
  };
}

interface KlipyPaginatedResponse {
  result: boolean;
  data: {
    data: KlipyGif[];
    current_page: number;
    per_page: number;
    has_next: boolean;
  };
}

// Service Types
export type Gif = {
  id: string;
  title: string;
  preview_url: string; // sm.webp for picker
  url: string; // md.webp for chat
  blur_preview: string;
  width: number;
  height: number;
};

export type GifListResult = {
  gifs: Gif[];
  pagination: PaginationResponse;
};

// ==========================
// Constants
// ==========================

const KLIPY_BASE_URL = "https://api.klipy.com/api/v1";
const CACHE_TTL_TRENDING = 300; // 5 minutes
const CACHE_TTL_SEARCH = 120; // 2 minutes

// ==========================
// Helpers
// ==========================

/** Hash user ID for privacy when sending to Klipy API. */
const hashUserId = (userId: string): string => {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(userId);
  return hasher.digest("hex").slice(0, 32); // Use first 32 chars
};

/** Transform Klipy GIF */
const transformGif = (gif: KlipyGif): Gif => ({
  id: String(gif.id),
  title: gif.title,
  preview_url: gif.file.sm.webp.url,
  url: gif.file.md.webp.url,
  blur_preview: gif.blur_preview,
  width: gif.file.md.webp.width,
  height: gif.file.md.webp.height,
});

/** Build Klipy API URL. */
const buildUrl = (path: string, params: Record<string, string | number | undefined>): string => {
  const url = new URL(`${KLIPY_BASE_URL}/${env.KLIPY_API_KEY}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
};

/** Fetch from Klipy API. */
const fetchKlipy = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Klipy API error: ${res.status}`);
  }

  return res.json();
};

// ==========================
// API Methods
// ==========================

/**
 * Creates pagination response from Klipy API response.
 * Note: Klipy doesn't provide total count, so total is set to -1.
 */
const createGifPagination = (data: KlipyPaginatedResponse["data"]): PaginationResponse => {
  // Klipy doesn't provide total count, so we use -1 to indicate unknown
  return {
    page: data.current_page,
    per_page: data.per_page,
    total: -1,
    total_pages: -1,
    has_next: data.has_next,
  };
};

/**
 * Fetches trending GIFs from Klipy API.
 * Results are cached for 5 minutes.
 *
 * @param params.page - Page number (default: 1)
 * @param params.perPage - Items per page (default: 24)
 */
const getTrending = async (params: { page?: number; perPage?: number }): Promise<GifListResult> => {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 24;

  // Check cache
  const cacheKey = `klipy:trending:${page}:${perPage}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from API
  const url = buildUrl("/gifs/trending", { page, per_page: perPage });
  const response = await fetchKlipy<KlipyPaginatedResponse>(url);

  const result: GifListResult = {
    gifs: response.data.data.map(transformGif),
    pagination: createGifPagination(response.data),
  };

  // Cache result
  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_TRENDING);

  return result;
};

/**
 * Searches GIFs by keyword via Klipy API.
 * Results are cached for 2 minutes per query.
 *
 * @param params.query - Search keyword
 * @param params.page - Page number (default: 1)
 * @param params.perPage - Items per page (default: 24)
 */
const search = async (params: { query: string; page?: number; perPage?: number }): Promise<GifListResult> => {
  const { query } = params;
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 24;

  // Check cache
  const cacheKey = `klipy:search:${query.toLowerCase().trim().replace(/\s+/g, "")}:${page}:${perPage}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from API
  const url = buildUrl("/gifs/search", { q: query, page, per_page: perPage });
  const response = await fetchKlipy<KlipyPaginatedResponse>(url);

  const result: GifListResult = {
    gifs: response.data.data.map(transformGif),
    pagination: createGifPagination(response.data),
  };

  // Cache result
  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SEARCH);

  return result;
};

/**
 * Fetches recently used GIFs for a specific user.
 * User ID is hashed before sending to Klipy for privacy.
 * Not cached as this is personalized data.
 *
 * @param params.userId - User ID (will be hashed)
 * @param params.page - Page number (default: 1)
 * @param params.perPage - Items per page (default: 24)
 */
const getRecent = async (params: { userId: string; page?: number; perPage?: number }): Promise<GifListResult> => {
  const { userId } = params;
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 24;

  // Hash user ID for privacy
  const customerId = hashUserId(userId);

  // No caching for personalized data
  const url = buildUrl(`/gifs/recent/${customerId}`, { page, per_page: perPage });

  try {
    const response = await fetchKlipy<KlipyPaginatedResponse>(url);

    return {
      gifs: response.data.data.map(transformGif),
      pagination: createGifPagination(response.data),
    };
  } catch {
    // Return empty list if user has no recent GIFs
    return {
      gifs: [],
      pagination: { page, per_page: perPage, total: -1, total_pages: -1, has_next: false },
    };
  }
};

// ==========================
// Service Export
// ==========================

export const gifService = {
  getTrending,
  search,
  getRecent,
};
