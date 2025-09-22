import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const baseURL = 'https://places-api.foursquare.com';

export const foursquarePlaceDetailsTool = createTool({
    id: 'foursquare-place-details',
    description: 'Get detailed information about a specific place using its Foursquare ID',
    inputSchema: z.object({
        fsq_id: z.string().describe('The Foursquare place ID'),
        fields: z.string().optional().default('fsq_id,name,location,categories,geocodes,hours,website,tel,email,social_media,verified,date_closed,description,features,store_id,link,rating,stats,popularity,price,menu,date_closed,photos,tips,tastes,hours_popular,stats,chains').describe('Comma-separated list of fields to return'),
    }),
    outputSchema: z.object({
        fsq_id: z.string(),
        name: z.string(),
        location: z.object({
            address: z.string().optional(),
            address_extended: z.string().optional(),
            admin_region: z.string().optional(),
            census_block: z.string().optional(),
            country: z.string().optional(),
            cross_street: z.string().optional(),
            dma: z.string().optional(),
            formatted_address: z.string().optional(),
            locality: z.string().optional(),
            neighborhood: z.array(z.string()).optional(),
            po_box: z.string().optional(),
            post_town: z.string().optional(),
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
        geocodes: z.object({
            main: z.object({
                latitude: z.number(),
                longitude: z.number(),
            }),
            drop_off: z.object({
                latitude: z.number(),
                longitude: z.number(),
            }).optional(),
            front_door: z.object({
                latitude: z.number(),
                longitude: z.number(),
            }).optional(),
            road: z.object({
                latitude: z.number(),
                longitude: z.number(),
            }).optional(),
            roof: z.object({
                latitude: z.number(),
                longitude: z.number(),
            }).optional(),
        }),
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
            seasonal: z.array(
                z.object({
                    closed: z.boolean().optional(),
                    end_date: z.string().optional(),
                    hours: z.array(
                        z.object({
                            close: z.string(),
                            day: z.number(),
                            open: z.string(),
                        }),
                    ).optional(),
                    start_date: z.string().optional(),
                }),
            ).optional(),
        }).optional(),
        website: z.string().optional(),
        tel: z.string().optional(),
        email: z.string().optional(),
        social_media: z.object({
            facebook_id: z.string().optional(),
            instagram: z.string().optional(),
            twitter: z.string().optional(),
        }).optional(),
        verified: z.boolean().optional(),
        description: z.string().optional(),
        features: z.object({
            payment: z.object({
                credit_cards: z.object({
                    accepts_credit_cards: z.boolean().optional(),
                    amex: z.boolean().optional(),
                    discover: z.boolean().optional(),
                    visa: z.boolean().optional(),
                    master_card: z.boolean().optional(),
                }).optional(),
                digital_wallet: z.object({
                    accepts_nfc: z.boolean().optional(),
                }).optional(),
            }).optional(),
            food_and_drink: z.object({
                alcohol: z.object({
                    bar_service: z.boolean().optional(),
                    beer: z.boolean().optional(),
                    byo: z.boolean().optional(),
                    cocktails: z.boolean().optional(),
                    full_bar: z.boolean().optional(),
                    wine: z.boolean().optional(),
                }).optional(),
                meals: z.object({
                    bar_snacks: z.boolean().optional(),
                    breakfast: z.boolean().optional(),
                    brunch: z.boolean().optional(),
                    lunch: z.boolean().optional(),
                    happy_hour: z.boolean().optional(),
                    dinner: z.boolean().optional(),
                    tasting_menu: z.boolean().optional(),
                }).optional(),
            }).optional(),
            services: z.object({
                delivery: z.boolean().optional(),
                takeout: z.boolean().optional(),
                drive_through: z.boolean().optional(),
                dine_in: z.object({
                    reservations: z.boolean().optional(),
                    online_reservations: z.boolean().optional(),
                    groups_only_reservations: z.boolean().optional(),
                    essential_reservations: z.boolean().optional(),
                }).optional(),
            }).optional(),
            amenities: z.object({
                restroom: z.boolean().optional(),
                smoking: z.boolean().optional(),
                jukebox: z.boolean().optional(),
                music: z.boolean().optional(),
                live_music: z.boolean().optional(),
                private_room: z.boolean().optional(),
                outdoor_seating: z.boolean().optional(),
                tvs: z.boolean().optional(),
                atm: z.boolean().optional(),
                coat_check: z.boolean().optional(),
                wheelchair_accessible: z.boolean().optional(),
                parking: z.object({
                    parking: z.boolean().optional(),
                    street_parking: z.boolean().optional(),
                    valet_parking: z.boolean().optional(),
                    public_lot: z.boolean().optional(),
                    private_lot: z.boolean().optional(),
                }).optional(),
                sit_down_dining: z.boolean().optional(),
                wifi: z.string().optional(),
            }).optional(),
        }).optional(),
        store_id: z.string().optional(),
        link: z.string().optional(),
        rating: z.number().optional(),
        stats: z.object({
            total_photos: z.number().optional(),
            total_ratings: z.number().optional(),
            total_tips: z.number().optional(),
        }).optional(),
        popularity: z.number().optional(),
        price: z.number().optional(),
        photos: z.array(
            z.object({
                id: z.string(),
                created_at: z.string(),
                prefix: z.string(),
                suffix: z.string(),
                width: z.number(),
                height: z.number(),
                classifications: z.array(z.string()).optional(),
                tip: z.object({
                    id: z.string(),
                    created_at: z.string(),
                    text: z.string(),
                }).optional(),
            }),
        ).optional(),
        tips: z.array(
            z.object({
                id: z.string(),
                created_at: z.string(),
                text: z.string(),
                url: z.string().optional(),
                photo: z.object({
                    id: z.string(),
                    created_at: z.string(),
                    prefix: z.string(),
                    suffix: z.string(),
                    width: z.number(),
                    height: z.number(),
                }).optional(),
                agree_count: z.number().optional(),
                disagree_count: z.number().optional(),
            }),
        ).optional(),
        chains: z.array(
            z.object({
                id: z.string(),
                name: z.string(),
            }),
        ).optional(),
    }),
    execute: async ({ context }) => {
        const { fsq_id, fields } = context;
        const apiKey = process.env.FOURSQUARE_API_KEY;

        if (!apiKey) {
            throw new Error(
                'Foursquare API key not found. Please set the FOURSQUARE_API_KEY environment variable.',
            );
        }

        const url = new URL(`${baseURL}/places/${fsq_id}`);
        if (fields) {
            url.searchParams.append('fields', fields);
        }

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
                `Foursquare Place Details API request failed with status ${response.status}: ${errorText}`,
            );
        }

        const data = await response.json();
        return data;
    },
});
