import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const baseURL = 'https://places-api.foursquare.com';

export const foursquareCategoresTool = createTool({
    id: 'foursquare-categories',
    description: 'Get Foursquare place categories, particularly useful for filtering logistics and supply chain related venues',
    inputSchema: z.object({
        // No input parameters needed for categories endpoint
    }),
    outputSchema: z.object({
        categories: z.array(
            z.object({
                id: z.number(),
                name: z.string(),
                short_name: z.string().optional(),
                plural_name: z.string().optional(),
                icon: z.object({
                    prefix: z.string(),
                    suffix: z.string(),
                }),
                categories: z.array(z.any()).optional(), // Nested categories
            }),
        ),
    }),
    execute: async ({ context }) => {
        const apiKey = process.env.FOURSQUARE_API_KEY;

        if (!apiKey) {
            throw new Error(
                'Foursquare API key not found. Please set the FOURSQUARE_API_KEY environment variable.',
            );
        }

        const url = new URL(`${baseURL}/places/categories`);

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
                `Foursquare Categories API request failed with status ${response.status}: ${errorText}`,
            );
        }

        const data = await response.json();
        return data;
    },
});

// Predefined logistics and supply chain relevant categories
export const LOGISTICS_CATEGORIES = {
    // Transportation & Logistics
    AIRPORT: '19014', // Airport
    TRAIN_STATION: '19020', // Train Station
    BUS_STATION: '19010', // Bus Station
    SHIPPING_STORE: '17069', // Shipping Store
    TRUCK_SERVICE: '19054', // Truck Service
    WAREHOUSE: '17000', // Business & Professional Services (parent category)

    // Industrial & Manufacturing
    INDUSTRIAL: '16000', // Industrial
    FACTORY: '16001', // Factory

    // Retail & Distribution
    DEPARTMENT_STORE: '17024', // Department Store
    WHOLESALE: '17000', // Wholesale
    DISTRIBUTION_CENTER: '17000', // Distribution (under Business services)

    // Automotive & Transport Services
    GAS_STATION: '17057', // Gas Station
    AUTOMOTIVE: '17003', // Automotive
    TRUCK_STOP: '17003', // Truck services

    // Storage & Warehousing
    STORAGE: '17070', // Storage
    SELF_STORAGE: '17070', // Self Storage

    // Ports & Marine
    MARINA: '19041', // Marina
    PORT: '19000', // Travel & Transportation (includes ports)

    // Government & Customs
    GOVERNMENT: '12000', // Government & Community
    CUSTOMS: '12047', // Government Office (includes customs)
};

export const getLogisticsCategoriesString = (): string => {
    return Object.values(LOGISTICS_CATEGORIES).join(',');
};
