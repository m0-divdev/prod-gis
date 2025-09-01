// Shared Tools - Common tools used across multiple specialized agents
import { planTool } from '../tools/planner-tool';
import { executePlanTool } from '../tools/execute-plan-tool';
import { summarizeTool } from '../tools/summarizer-tool';

// Core geospatial tools shared across agents
import { tomtomFuzzySearchTool } from '../tools/tomtom-fuzzy-search-tool';
import { searchPoiTool, getPlaceByIdTool, getPoiPhotosTool } from '../tools/tomtom-tool';
import { getGooglePlaceDetailsTool } from '../tools/google-place-details-tool';
import { getGooglePlacesInsightsTool } from '../tools/google-places-insights-tool';
import { searchEventsTool } from '../tools/events-tool';
import { getWeatherTool } from '../tools/weather-tool';
import { getIpLocationTool } from '../tools/ip-location-tool';

// Foot traffic and demographic tools
import { getFootTrafficSummaryTool } from '../tools/foot-traffic-summary-tool';
import { getFootTrafficTool } from '../tools/foot-traffic-tool';

// Analytics tools
import { getAggregatedMetricTool } from '../tools/get-aggregated-metric-tool';

export const SHARED_TOOLS = {
  // Orchestration tools
  planTool,
  executePlanTool,
  summarizeTool,

  // Core geospatial tools
  tomtomFuzzySearchTool,
  searchPoiTool,
  getPlaceByIdTool,
  getPoiPhotosTool,
  getGooglePlaceDetailsTool,
  getGooglePlacesInsightsTool,
  searchEventsTool,
  getWeatherTool,
  getIpLocationTool,

  // Foot traffic and demographic tools
  getFootTrafficSummaryTool,
  getFootTrafficTool,

  // Analytics tools
  getAggregatedMetricTool,
};

// Export individual tools for convenience
export {
  planTool,
  executePlanTool,
  summarizeTool,
  tomtomFuzzySearchTool,
  searchPoiTool,
  getPlaceByIdTool,
  getPoiPhotosTool,
  getGooglePlaceDetailsTool,
  getGooglePlacesInsightsTool,
  searchEventsTool,
  getWeatherTool,
  getIpLocationTool,
  getFootTrafficSummaryTool,
  getFootTrafficTool,
  getAggregatedMetricTool,
};
