import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const baseURL = 'https://places-api.foursquare.com';

export const foursquarePlacesSearchTool = createTool({
    id: 'foursquare-places-search',
    description: 'Search for places using the Foursquare Places API with advanced filtering for logistics and supply chain locations',
    inputSchema: z.object({
        query: z.string().optional().describe('Text search query (e.g., "warehouse", "distribution center")'),
        ll: z.string().optional().describe('Latitude,longitude coordinates for location-based search'),
        radius: z.number().optional().describe('Search radius in meters (max 100,000)'),
        categories: z.string().optional().describe('Comma-separated category IDs for filtering (e.g., logistics, warehouses)'),
        chains: z.string().optional().describe('Comma-separated chain IDs for brand filtering'),
        limit: z.number().optional().default(50).describe('Maximum number of results to return (max 50)'),
        sort: z.enum(['distance', 'relevance', 'rating', 'popularity']).optional().default('relevance').describe('Sort order for results'),
        fields: z.string().optional().default('fsq_place_id,name,location,categories,distance,rating,stats,hours,website,tel').describe('Comma-separated list of fields to return'),
    }),
    outputSchema: z.object({
        results: z.array(
            z.object({
                fsq_place_id: z.string(),
                name: z.string(),
                location: z.object({
                    address: z.string().optional(),
                    address_extended: z.string().optional(),
                    census_block: z.string().optional(),
                    country: z.string().optional(),
                    cross_street: z.string().optional(),
                    dma: z.string().optional(),
                    formatted_address: z.string().optional(),
                    locality: z.string().optional(),
                    neighborhood: z.array(z.string()).optional(),
                    postcode: z.string().optional(),
                    region: z.string().optional(),
                }),
                categories: z.array(
                    z.object({
                        id: z.number(),
                        name: z.string(),
                        short_name: z.string().optional(),
                        plural_name: z.string().optional(),
                        icon: z.object({
                            prefix: z.string(),
                            suffix: z.string(),
                        }).optional(),
                    }),
                ),
                distance: z.number().optional(),
                latitude: z.number(),
                longitude: z.number(),
                rating: z.number().optional(),
                stats: z.object({
                    total_photos: z.number().optional(),
                    total_ratings: z.number().optional(),
                    total_tips: z.number().optional(),
                }).optional(),
                hours: z.object({
                    display: z.string().optional(),
                    is_local_holiday: z.boolean().optional(),
                    open_now: z.boolean().optional(),
                    regular: z.array(
                        z.object({
                            close: z.string(),
                            day: z.number(),
                            open: z.string(),
                        }),
                    ).optional(),
                }).optional(),
                website: z.string().optional(),
                tel: z.string().optional(),
            }),
        ),
        context: z.object({
            geo_bounds: z.object({
                circle: z.object({
                    center: z.object({
                        latitude: z.number(),
                        longitude: z.number(),
                    }),
                    radius: z.number(),
                }),
            }).optional(),
        }).optional(),
    }),
    execute: async ({ context }) => {
        const { query, ll, radius, categories, chains, limit, sort, fields } = context;
        const apiKey = process.env.FOURSQUARE_API_KEY;

        if (!apiKey) {
            throw new Error(
                'Foursquare API key not found. Please set the FOURSQUARE_API_KEY environment variable.',
            );
        }

        const url = new URL(`${baseURL}/places/search`);

        // Add query parameters
        if (query) url.searchParams.append('query', query);
        if (ll) url.searchParams.append('ll', ll);
        if (radius) url.searchParams.append('radius', radius.toString());
        if (categories) url.searchParams.append('categories', categories);
        if (chains) url.searchParams.append('chains', chains);
        if (limit) url.searchParams.append('limit', limit.toString());
        if (sort) url.searchParams.append('sort', sort);
        if (fields) url.searchParams.append('fields', fields);

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
                `Foursquare Places Search API request failed with status ${response.status}: ${errorText}`,
            );
        }

        const data = await response.json();
        return data;
    },
});
