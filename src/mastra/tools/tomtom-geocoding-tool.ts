import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const tomtomApiVersion = '2';
const baseURL = 'https://api.tomtom.com';

export const tomtomGeocodingTool = createTool({
  id: 'tomtom-geocoding',
  description: 'Geocode addresses and location names using the TomTom Geocoding API. Convert location names, addresses, and place names to latitude/longitude coordinates.',
  inputSchema: z.object({
    query: z.string().describe('The location, address, or place name to geocode'),
    limit: z.number().min(1).max(100).optional().default(10).describe('Maximum number of results to return'),
    countrySet: z.string().optional().describe('Comma-separated country codes to limit search'),
    lat: z.number().optional().describe('Latitude for biasing results'),
    lon: z.number().optional().describe('Longitude for biasing results'),
    radius: z.number().optional().describe('Search radius in meters'),
    language: z.string().optional().describe('Language for results'),
  }),
  outputSchema: z.object({
    summary: z.object({
      query: z.string(),
      queryType: z.string().optional(),
      queryTime: z.number().optional(),
      numResults: z.number().optional(),
      totalResults: z.number().optional(),
      fuzzyLevel: z.number().optional(),
      geoBias: z.object({
        lat: z.number().optional(),
        lon: z.number().optional(),
      }).optional(),
    }),
    results: z.array(z.object({
      type: z.string().optional(),
      id: z.string().optional(),
      score: z.number().optional(),
      entityType: z.string().optional(),
      address: z.object({
        streetNumber: z.string().optional(),
        streetName: z.string().optional(),
        municipality: z.string().optional(),
        countryCode: z.string().optional(),
        country: z.string().optional(),
        freeformAddress: z.string().optional(),
      }).optional(),
      position: z.object({
        lat: z.number(),
        lon: z.number(),
      }),
      viewport: z.object({
        topLeftPoint: z.object({
          lat: z.number(),
          lon: z.number(),
        }),
        btmRightPoint: z.object({
          lat: z.number(),
          lon: z.number(),
        }),
      }).optional(),
    })),
  }),
  execute: async ({ context }) => {
    const { query, limit, countrySet, lat, lon, radius, language } = context;
    const apiKey = process.env.TOMTOM_API_KEY;

    if (!apiKey) {
      throw new Error('TomTom API key not found.');
    }

    const url = new URL(
      `${baseURL}/search/${tomtomApiVersion}/geocode/${encodeURIComponent(query)}.json`,
    );
    url.searchParams.append('key', apiKey);

    if (limit && limit !== 10) url.searchParams.append('limit', limit.toString());
    if (countrySet) url.searchParams.append('countrySet', countrySet);
    if (lat !== undefined) url.searchParams.append('lat', lat.toString());
    if (lon !== undefined) url.searchParams.append('lon', lon.toString());
    if (radius !== undefined) url.searchParams.append('radius', radius.toString());
    if (language) url.searchParams.append('language', language);

    // Use retry logic with exponential backoff for rate limit handling
    const response = await fetchWithRetry(url.toString(), {}, 3, 1000);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TomTom Geocoding API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  },
});

// Helper function for retry logic with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<Response> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If successful or not a rate limit error, return immediately
      if (response.ok || response.status !== 429) {
        return response;
      }

      // Rate limit hit - prepare for retry
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(
          `TomTom API rate limit hit (429). Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries + 1})`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // All retries exhausted
        const errorText = await response.text();
        lastError = new Error(
          `TomTom API rate limit exceeded after ${maxRetries + 1} attempts: ${errorText}`
        );
      }
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries) break;

      // Network errors - also retry with backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(
        `TomTom API network error. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries + 1})`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
