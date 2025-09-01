import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
// No need to import Mastra type directly if we're casting to 'any' for getTool/getAgent access
// import { Mastra } from '@mastra/core/mastra';

export const executePlanTool = createTool({
  id: 'execute-plan',
  description:
    'Executes a structured plan of tool calls and returns their combined results.',
  inputSchema: z.object({
    plan: z
      .array(
        z.object({
          tool: z.string().describe('The ID of the tool to call.'),
          args: z
            .record(z.any())
            .optional()
            .default({})
            .describe('The arguments for the tool call.'),
        }),
      )
      .describe('A JSON array representing the plan of tool calls to execute.'),
  }),
  outputSchema: z
    .record(z.any())
    .describe(
      'A JSON object containing the results of all executed tool calls, keyed by tool ID or unique identifier.',
    ),
  execute: async ({ context }) => {
    type PlanItem = { tool: string; args?: Record<string, unknown> };
    const ctx = context as Record<string, unknown>;
    const maybePlan = ctx?.plan;
    const results: Record<string, unknown> = {};

    if (!Array.isArray(maybePlan)) {
      return results as Record<string, any>;
    }
    const plan = maybePlan as PlanItem[];

    for (const toolCall of plan) {
      let toolId = toolCall?.tool;
      if (!toolId || typeof toolId !== 'string') continue;

      // Normalize IDs: strip prefixes and map aliases
      if (toolId.startsWith('functions.')) {
        toolId = toolId.substring('functions.'.length);
      }

      const aliasMap: Record<string, string> = {
        executePlanTool: 'execute-plan',
        'execute-plan': 'execute-plan',
        planTool: 'plan-query',
        'plan-query': 'plan-query',
        tomtomFuzzySearchTool: 'tomtom-fuzzy-search',
        'tomtom-fuzzy-search': 'tomtom-fuzzy-search',
        searchPoiTool: 'search-poi',
        'search-poi': 'search-poi',
        getPlaceByIdTool: 'get-place-by-id',
        'get-place-by-id': 'get-place-by-id',
        getGooglePlaceDetailsTool: 'get-google-place-details',
        'get-google-place-details': 'get-google-place-details',
        getGooglePlacesInsightsTool: 'get-google-places-insights',
        'get-google-places-insights': 'get-google-places-insights',
        searchEventsTool: 'search-events',
        'search-events': 'search-events',
        getIpLocationTool: 'get-ip-location',
        'get-ip-location': 'get-ip-location',
        getWeatherTool: 'get-weather',
        'get-weather': 'get-weather',
        getFootTrafficTool: 'get-foot-traffic-forecast',
        'get-foot-traffic-forecast': 'get-foot-traffic-forecast',
        getFootTrafficSummaryTool: 'get-foot-traffic-summary',
        'get-foot-traffic-summary': 'get-foot-traffic-summary',
        getPoiPhotosTool: 'get-poi-photos',
        'get-poi-photos': 'get-poi-photos',
        getAggregatedMetricTool: 'get-aggregated-metric',
        'get-aggregated-metric': 'get-aggregated-metric',
        formatMapDataTool: 'format-map-data',
        'format-map-data': 'format-map-data',
      };

  const canonicalId = aliasMap[toolId] ?? toolId;
  const toolArgs: Record<string, unknown> = toolCall.args ?? {};

      // Prevent recursion or planning inside execution
      if (canonicalId === 'execute-plan' || canonicalId === 'plan-query') {
        results[canonicalId] = {
          error: 'Recursive/plan call prevented during execution',
        };
        continue;
      }

      try {
        type ToolArgs = { context: Record<string, unknown> };
        type ToolLike = { execute: (args: ToolArgs) => Promise<unknown> };

        let toolInstance: ToolLike | null = null;

        switch (canonicalId) {
          case 'tomtom-fuzzy-search': {
            const { tomtomFuzzySearchTool } = await import(
              '../tools/tomtom-fuzzy-search-tool.js'
            );
            toolInstance = tomtomFuzzySearchTool;
            break;
          }
          case 'search-poi': {
            const { searchPoiTool } = await import('../tools/tomtom-tool.js');
            toolInstance = searchPoiTool;
            break;
          }
          case 'get-place-by-id': {
            const { getPlaceByIdTool } = await import(
              '../tools/tomtom-tool.js'
            );
            toolInstance = getPlaceByIdTool;
            break;
          }
          case 'get-google-place-details': {
            const { getGooglePlaceDetailsTool } = await import(
              '../tools/google-place-details-tool.js'
            );
            toolInstance = getGooglePlaceDetailsTool;
            break;
          }
          case 'get-google-places-insights': {
            const { getGooglePlacesInsightsTool } = await import(
              '../tools/google-places-insights-tool.js'
            );
            toolInstance = getGooglePlacesInsightsTool;
            break;
          }
          case 'search-events': {
            const { searchEventsTool } = await import(
              '../tools/events-tool.js'
            );
            toolInstance = searchEventsTool;
            break;
          }
          case 'get-ip-location': {
            const { getIpLocationTool } = await import(
              '../tools/ip-location-tool.js'
            );
            toolInstance = getIpLocationTool;
            break;
          }
          case 'get-weather': {
            const { getWeatherTool } = await import('../tools/weather-tool.js');
            toolInstance = getWeatherTool;
            break;
          }
          case 'get-foot-traffic-forecast': {
            const { getFootTrafficTool } = await import(
              '../tools/foot-traffic-tool.js'
            );
            toolInstance = getFootTrafficTool;
            break;
          }
          case 'get-foot-traffic-summary': {
            const { getFootTrafficSummaryTool } = await import(
              '../tools/foot-traffic-summary-tool.js'
            );
            toolInstance = getFootTrafficSummaryTool;
            break;
          }
          case 'get-poi-photos': {
            const { getPoiPhotosTool } = await import(
              '../tools/tomtom-tool.js'
            );
            toolInstance = getPoiPhotosTool;
            break;
          }
          case 'get-aggregated-metric': {
            const { getAggregatedMetricTool } = await import(
              '../tools/get-aggregated-metric-tool.js'
            );
            toolInstance = getAggregatedMetricTool;
            break;
          }
          case 'format-map-data': {
            const { formatMapDataTool } = await import(
              '../tools/format-map-data-tool.js'
            );
            toolInstance = formatMapDataTool;
            break;
          }
          default: {
            break;
          }
        }

        if (toolInstance && typeof toolInstance.execute === 'function') {
          const toolResult = await toolInstance.execute({
            context: toolArgs,
          });
          results[canonicalId] = toolResult;
        } else {
          results[canonicalId] = {};
        }
      } catch (err) {
        const e = err as { message?: string };
        results[canonicalId] = {
          error: e.message || 'Unknown error during tool execution',
        };
      }
    }

    return results as Record<string, any>;
  },
});
