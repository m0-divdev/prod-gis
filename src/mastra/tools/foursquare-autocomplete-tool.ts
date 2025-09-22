import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const baseURL = 'https://places-api.foursquare.com';

export const foursquareAutocompleteTool = createTool({
    id: 'foursquare-autocomplete',
    description: 'Get autocomplete suggestions for places, geos, and searches using Foursquare Places API',
    inputSchema: z.object({
        query: z.string().describe('Search term to be applied against titles (minimum 3 characters)'),
        ll: z.string().optional().describe('Latitude,longitude coordinates for location-based search'),
        radius: z.number().optional().describe('Distance in meters within which to return results (default: 5000)'),
        types: z.string().optional().describe('Types of results to return: place, search, geo (comma-separated)'),
        bias: z.enum(['place', 'search', 'geo']).optional().describe('Bias results by specific type'),
        session_token: z.string().optional().describe('User-generated token for billing session grouping'),
        limit: z.number().optional().default(10).describe('Number of results to return (1-50, default: 10)'),
    }),
    outputSchema: z.object({
        results: z.array(
            z.object({
                type: z.string(),
                text: z.object({
                    primary: z.string(),
                    secondary: z.string().optional(),
                    highlight: z.array(
                        z.object({
                            start: z.number(),
                            length: z.number(),
                        }),
                    ).optional(),
                }),
                icon: z.object({
                    prefix: z.string(),
                    suffix: z.string(),
                }).optional(),
                link: z.string().optional(),
                place: z.object({
                    fsq_id: z.string(),
                    name: z.string(),
                    location: z.object({
                        address: z.string().optional(),
                        formatted_address: z.string().optional(),
                        locality: z.string().optional(),
                        region: z.string().optional(),
                        country: z.string().optional(),
                    }),
                    categories: z.array(
                        z.object({
                            id: z.number(),
                            name: z.string(),
                        }),
                    ).optional(),
                    distance: z.number().optional(),
                }).optional(),
                search: z.object({
                    query: z.string(),
                    filters: z.record(z.any()).optional(),
                }).optional(),
                geo: z.object({
                    name: z.string(),
                    center: z.object({
                        latitude: z.number(),
                        longitude: z.number(),
                    }),
                    bounds: z.object({
                        northeast: z.object({
                            latitude: z.number(),
                            longitude: z.number(),
                        }),
                        southwest: z.object({
                            latitude: z.number(),
                            longitude: z.number(),
                        }),
                    }).optional(),
                }).optional(),
            }),
        ),
    }),
    execute: async ({ context }) => {
        const { query, ll, radius, types, bias, session_token, limit } = context;
        const apiKey = process.env.FOURSQUARE_API_KEY;

        if (!apiKey) {
            throw new Error(
                'Foursquare API key not found. Please set the FOURSQUARE_API_KEY environment variable.',
            );
        }

        const url = new URL(`${baseURL}/autocomplete`);

        // Add query parameters
        url.searchParams.append('query', query);
        if (ll) url.searchParams.append('ll', ll);
        if (radius) url.searchParams.append('radius', radius.toString());
        if (types) url.searchParams.append('types', types);
        if (bias) url.searchParams.append('bias', bias);
        if (session_token) url.searchParams.append('session_token', session_token);
        if (limit) url.searchParams.append('limit', limit.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'X-Places-Api-Version': '2025-06-17',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Foursquare Autocomplete API request failed with status ${response.status}: ${errorText}`,
            );
        }

        const data = await response.json();
        return data;
    },
});

