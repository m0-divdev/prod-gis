import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const tomtomApiVersion = '2';
const baseURL = 'https://api.tomtom.com';

// Tool for searching for points of interest
export const searchPoiTool = createTool({
    id: 'search-poi',
    description: 'Search for Points of Interest using the TomTom API',
    inputSchema: z.object({
        query: z.string().describe('The search query (e.g., "restaurant", "cafe")'),
        limit: z
            .number()
            .optional()
            .default(10)
            .describe('Maximum number of responses to return'),
        lat: z.number().optional().describe('Latitude for biasing results'),
        lon: z.number().optional().describe('Longitude for biasing results'),
        radius: z
            .number()
            .optional()
            .describe('Radius in meters for constraining results'),
    }),
    outputSchema: z.object({
        results: z.array(
            z.object({
                id: z.string(),
                dist: z.number(),
                poi: z.object({
                    name: z.string(),
                }),
                address: z.object({
                    freeformAddress: z.string(),
                }),
                position: z.object({
                    lat: z.number(),
                    lon: z.number(),
                }),
            }),
        ),
    }),
    execute: async ({ context }) => {
        const { query, limit, lat, lon, radius } = context;
        const apiKey = process.env.TOMTOM_API_KEY;

        if (!apiKey) {
            throw new Error(
                'TomTom API key not found. Please set the TOMTOM_API_KEY environment variable.',
            );
        }

        const url = new URL(
            `${baseURL}/search/${tomtomApiVersion}/poiSearch/${query}.json`,
        );
        url.searchParams.append('key', apiKey);
        url.searchParams.append('limit', limit.toString());

        if (lat) url.searchParams.append('lat', lat.toString());
        if (lon) url.searchParams.append('lon', lon.toString());
        if (radius) url.searchParams.append('radius', radius.toString());

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(
                `TomTom API request failed with status ${response.status}`,
            );
        }

        const data = await response.json();
        return { results: data.results };
    },
});
