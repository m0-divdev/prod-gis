// NestJS dependency injection and logging
import { Injectable, Logger } from '@nestjs/common';

// Import Mastra framework instance for direct agent access
import { mastra } from '../mastra';

// Import specialized service classes for different types of queries
import { OrchestratorService } from './services/orchestrator.service';
import { MapDataService } from './services/map-data.service';
import { QueryRouterService, QueryType } from './services/query-router.service';

// Import DTOs for unified chat functionality
import {
  UnifiedChatDto,
  UnifiedChatResponseDto,
  ResponseType,
  ResponsePreference,
  UnifiedChatSchema,
} from './dto/unified-chat.dto';

/**
 * PlacesService - Core business logic service for the Foursquare Places application
 *
 * This service acts as the main orchestrator that:
 * 1. Receives requests from the controller layer
 * 2. Analyzes user queries to determine intent
 * 3. Routes to appropriate specialized services
 * 4. Coordinates with Mastra AI agents
 * 5. Returns processed responses
 *
 * Service Architecture:
 * - OrchestratorService: Handles general text-based queries
 * - IntelligentOrchestratorService: Processes complex analytical queries
 * - MapDataService: Generates GeoJSON data for map visualization
 * - QueryRouterService: Analyzes query intent for intelligent routing
 */
@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  /**
   * Constructor - Injects all specialized services for query processing
   * @param orchestratorService - Handles basic orchestration and text response
   * @param mapDataService - Generates GeoJSON data for mapping
   * @param queryRouter - Analyzes queries to determine routing strategy
   */
  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly mapDataService: MapDataService,
    private readonly queryRouter: QueryRouterService,
  ) {}

  // Search method removed - only unified chat needed

  /**
   * Unified Chat Method - Intelligent Query Routing (MAIN FEATURE)
   *
   * This is the most advanced method that intelligently analyzes user queries
   * and automatically routes them to the most appropriate service based on content.
   *
   * Intelligence Features:
   * - Automatic intent detection (map, analysis, or text)
   * - Smart response format selection
   * - Multi-service coordination
   * - Performance tracking and metadata
   *
   * Routing Logic:
   * 1. Analyze query using QueryRouterService
   * 2. Determine response type (auto or user preference)
   * 3. Route to appropriate service:
   *    - MapDataService → GeoJSON for location queries
   *    - IntelligentOrchestratorService → Analysis for complex queries
   *    - OrchestratorService → Text for general queries
   * 4. Return response with execution metadata
   *
   * @param unifiedChatDto - Contains message, sessionId, and preferences
   * @returns Promise<UnifiedChatResponseDto> - Intelligent response with metadata
   */
  async processUnifiedChat(
    unifiedChatDto: UnifiedChatDto,
  ): Promise<UnifiedChatResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Processing unified chat: "${unifiedChatDto.message.substring(0, 100)}..."`,
      );

      // Validate input
      const validatedInput = UnifiedChatSchema.parse(unifiedChatDto);

      // Analyze query to determine intent and routing
      const analysis = this.queryRouter.analyzeQuery(validatedInput.message);

      let responseType: ResponseType;
      let responseData: any;
      let agentsUsed: string[] = [];
      let toolsUsed: string[] = [];

      // Determine response type based on preference and analysis
      if (validatedInput.responsePreference === ResponsePreference.AUTO) {
        responseType = this.determineAutoResponseType(
          analysis,
          validatedInput.message,
        );
      } else {
        responseType = this.mapPreferenceToType(
          validatedInput.responsePreference,
        );
      }

      // Route to appropriate service based on determined response type
      switch (responseType) {
        case ResponseType.GEOJSON:
          this.logger.log('Routing to MapDataService for GeoJSON response');
          const mapResult = await this.mapDataService.generateMapData({
            query: validatedInput.message,
            sessionId: validatedInput.sessionId,
            maxResults: 50,
          });
          responseData = mapResult.geojson;
          agentsUsed = ['mapDataAgent'];
          toolsUsed = ['tomtomFuzzySearchTool', 'formatMapDataTool'];
          break;

        case ResponseType.ANALYSIS:
          this.logger.log('Routing to Urban Planning Agent for detailed analysis');
          // Use urban planning agent for analysis requests as it's the most comprehensive
          const analysisResult = await this.processUrbanPlanningQuery({
            message: validatedInput.message,
            sessionId: validatedInput.sessionId,
            responsePreference: ResponsePreference.ANALYSIS,
            context: validatedInput.context,
          });
          responseData = analysisResult.data;
          agentsUsed = ['urbanPlanningAgent'];
          toolsUsed = this.getToolsForAgent('urban-planning');
          break;

        case ResponseType.TEXT:
        default:
          this.logger.log('Routing to OrchestratorService for text response');
          const textResult = await this.orchestratorService.processQuery({
            query: validatedInput.message,
            sessionId: validatedInput.sessionId,
            maxSteps: 10,
            includeRawData: false,
          });

          // OrchestratorAgent returns structured data with both summary and mapData
          if (textResult.data && textResult.data.summary) {
            responseData = {
              summary:
                textResult.data.summary.analysis?.text ||
                textResult.summary ||
                textResult.data.summary,
              mapData: textResult.data.mapData,
              metadata: textResult.metadata,
            };
          } else {
            responseData = textResult.summary || textResult;
          }

          agentsUsed = ['orchestratorAgent'];
          toolsUsed = ['planTool', 'executePlanTool', 'summarizeTool'];
          break;
      }

      const executionTime = Date.now() - startTime;

      return {
        type: responseType,
        data: responseData,
        metadata: {
          executionTime,
          agentsUsed,
          toolsUsed,
          confidence: analysis.confidence,
          intent: analysis.type,
          detectedEntities: analysis.extractedEntities.locations || [],
        },
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Unified chat processing failed: ${error.message}`);

      return {
        type: ResponseType.TEXT,
        data: `I encountered an error processing your request: ${error.message}`,
        metadata: {
          executionTime: Date.now() - startTime,
          agentsUsed: [],
          toolsUsed: [],
          confidence: 0,
        },
        success: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private determineAutoResponseType(
    analysis: any,
    message: string,
  ): ResponseType {
    // Keywords that strongly indicate map visualization
    const mapKeywords = [
      'map',
      'show on map',
      'visualize',
      'plot',
      'geojson',
      'locations',
      'where are',
      'show me on',
      'display on map',
      'geographic',
      'coordinates',
    ];

    // Keywords that indicate detailed analysis needed
    const analysisKeywords = [
      'analyze',
      'analysis',
      'comprehensive',
      'detailed',
      'compare',
      'trends',
      'patterns',
      'insights',
      'statistics',
      'metrics',
      'report',
      'breakdown',
    ];

    const lowerMessage = message.toLowerCase();

    // Check for explicit map requests
    if (mapKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return ResponseType.GEOJSON;
    }

    // Check for analysis requests
    if (analysisKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return ResponseType.ANALYSIS;
    }

    // Use query analysis results
    switch (analysis.type) {
      case QueryType.MAP_DATA_ONLY:
        return ResponseType.GEOJSON;
      case QueryType.ANALYTICS:
      case QueryType.COMPREHENSIVE:
        return ResponseType.ANALYSIS;
      default:
        return ResponseType.TEXT;
    }
  }

  private mapPreferenceToType(preference: ResponsePreference): ResponseType {
    switch (preference) {
      case ResponsePreference.GEOJSON:
        return ResponseType.GEOJSON;
      case ResponsePreference.ANALYSIS:
        return ResponseType.ANALYSIS;
      case ResponsePreference.TEXT:
      default:
        return ResponseType.TEXT;
    }
  }

  /**
   * Specialized Agent Methods
   * Direct methods for handling domain-specific agent queries
   */

  /**
   * Process urban planning queries using the specialized urban planning agent
   */
  async processUrbanPlanningQuery(unifiedChatDto: UnifiedChatDto): Promise<UnifiedChatResponseDto> {
    try {
      this.logger.log(`Processing urban planning query: ${unifiedChatDto.message}`);

      // Get the urban planning agent directly
      const urbanPlanningAgent = mastra.getAgent('urbanPlanningAgent');
      if (!urbanPlanningAgent) {
        throw new Error('Urban Planning Agent not available');
      }

      // Let the agent decide what to do - no coordination service interference
      const response = await urbanPlanningAgent.generate(unifiedChatDto.message);

      // Format response from agent's direct output
      return this.formatAgentResponseDirect(response, 'urban-planning');
    } catch (error) {
      this.logger.error(`Urban planning query failed: ${error}`);
      return this.formatErrorResponse(error, 'urban-planning');
    }
  }

  /**
   * Process real estate queries using the specialized real estate agent
   */
  async processRealEstateQuery(unifiedChatDto: UnifiedChatDto): Promise<UnifiedChatResponseDto> {
    try {
      this.logger.log(`Processing real estate query: ${unifiedChatDto.message}`);

      const realEstateAgent = mastra.getAgent('realEstateAgent');
      if (!realEstateAgent) {
        throw new Error('Real Estate Agent not available');
      }

      const response = await realEstateAgent.generate(unifiedChatDto.message);
      return this.formatAgentResponseDirect(response, 'real-estate');
    } catch (error) {
      this.logger.error(`Real estate query failed: ${error}`);
      return this.formatErrorResponse(error, 'real-estate');
    }
  }

  /**
   * Process energy/utilities queries using the specialized energy utilities agent
   */
  async processEnergyUtilitiesQuery(unifiedChatDto: UnifiedChatDto): Promise<UnifiedChatResponseDto> {
    try {
      this.logger.log(`Processing energy/utilities query: ${unifiedChatDto.message}`);

      const energyUtilitiesAgent = mastra.getAgent('energyUtilitiesAgent');
      if (!energyUtilitiesAgent) {
        throw new Error('Energy/Utilities Agent not available');
      }

      const response = await energyUtilitiesAgent.generate(unifiedChatDto.message);
      return this.formatAgentResponseDirect(response, 'energy-utilities');
    } catch (error) {
      this.logger.error(`Energy/utilities query failed: ${error}`);
      return this.formatErrorResponse(error, 'energy-utilities');
    }
  }

  /**
   * Process retail queries using the specialized retail agent
   */
  async processRetailQuery(unifiedChatDto: UnifiedChatDto): Promise<UnifiedChatResponseDto> {
    try {
      this.logger.log(`Processing retail query: ${unifiedChatDto.message}`);

      const retailAgent = mastra.getAgent('retailAgent');
      if (!retailAgent) {
        throw new Error('Retail Agent not available');
      }

      const response = await retailAgent.generate(unifiedChatDto.message);
      return this.formatAgentResponseDirect(response, 'retail');
    } catch (error) {
      this.logger.error(`Retail query failed: ${error}`);
      return this.formatErrorResponse(error, 'retail');
    }
  }

  /**
   * Format agent response directly from agent's output (no coordination service)
   */
  private formatAgentResponseDirect(agentResponse: any, agentType: string): UnifiedChatResponseDto {
    // Extract meaningful content from agent's direct response
    const responseText = agentResponse?.text || agentResponse?.content || 'Analysis completed';

    // Try to parse structured data from response if available
    let analysis = {};
    let mapData = null;

    try {
      // Look for JSON content in the response - check multiple patterns
      const jsonPatterns = [
        /```json\s*([\s\S]*?)\s*```/g,  // ```json ... ```
        /```\s*([\s\S]*?)\s*```/g,      // Generic code blocks
        /\{[\s\S]*\}/g                   // Raw JSON objects
      ];

      let jsonContent = null;
      for (const pattern of jsonPatterns) {
        const match = pattern.exec(responseText);
        if (match && match[1]) {
          try {
            jsonContent = JSON.parse(match[1]);
            break;
          } catch (e) {
            // Try next pattern
            continue;
          }
        }
      }

      if (jsonContent) {
        analysis = jsonContent.analysis || jsonContent;
        mapData = jsonContent.mapData || jsonContent.map || null;
      }

      // If no structured JSON found, try to extract map data from agent response object
      if (!mapData && agentResponse?.toolResults) {
        // Look for map data in tool results
        for (const toolResult of agentResponse.toolResults) {
          if (toolResult.result?.type === 'FeatureCollection' ||
              toolResult.result?.features ||
              toolResult.result?.mapData) {
            mapData = toolResult.result.mapData || toolResult.result;
            break;
          }
        }
      }

      // If still no map data, try to generate basic map data from mentioned locations
      if (!mapData) {
        const locationMatches = responseText.match(/\b\d+\s+[A-Z][a-z]+(?:\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place))\b/gi) ||
                               responseText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Center|Street|Avenue|Road|Boulevard|Drive|Lane|Way|Court|Place))\b/gi);

        if (locationMatches && locationMatches.length > 0) {
          // Generate basic map data for mentioned locations
          mapData = this.generateBasicMapDataFromText(responseText, locationMatches);
        }
      }

    } catch (e) {
      // If no structured data, use response text as analysis
      analysis = { summary: responseText };
    }

    return {
      type: ResponseType.ANALYSIS,
      data: {
        text: responseText,
        analysis: analysis,
        mapData: mapData,
      },
      metadata: {
        executionTime: 0, // Will be set by caller
        agentsUsed: [`${agentType}Agent`],
        toolsUsed: this.getToolsForAgent(agentType),
        confidence: 0.9,
        intent: agentType,
        detectedEntities: [],
      },
      success: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format error response
   */
  private formatErrorResponse(error: any, agentType: string): UnifiedChatResponseDto {
    return {
      type: ResponseType.TEXT,
      data: {
        text: `Error processing ${agentType} query: ${error.message}`,
        analysis: { error: error.message },
        mapData: null,
      },
      metadata: {
        executionTime: 0,
        agentsUsed: [`${agentType}Agent`],
        toolsUsed: [],
        confidence: 0,
        intent: agentType,
        detectedEntities: [],
      },
      success: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Map agent response type to unified response type
   */
  private mapResponseType(agentType: string): ResponseType {
    switch (agentType) {
      case 'geojson':
        return ResponseType.GEOJSON;
      case 'analysis':
        return ResponseType.ANALYSIS;
      default:
        return ResponseType.TEXT;
    }
  }

  /**
   * Generate basic map data from locations mentioned in text
   */
  private generateBasicMapDataFromText(text: string, locationMatches: string[]): any {
    const features: any[] = [];

    // Try to geocode some of the major locations mentioned
    const majorLocations = {
      'Embarcadero Center': { lat: 37.7955, lon: -122.3967 },
      'Pine Street': { lat: 37.7920, lon: -122.3984 },
      'Commercial Street': { lat: 37.7942, lon: -122.4037 },
      'Front Street': { lat: 37.7925, lon: -122.3989 },
      'Davis Street': { lat: 37.7951, lon: -122.3981 },
      'Financial District': { lat: 37.7949, lon: -122.4039 },
    };

    // Create features for known locations
    Object.entries(majorLocations).forEach(([name, coords], index) => {
      if (text.toLowerCase().includes(name.toLowerCase())) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [coords.lon, coords.lat],
          },
          properties: {
            id: `location-${index}`,
            name: name,
            category: 'commercial-property',
            source: 'text-analysis',
            confidence: 0.8,
          },
        });
      }
    });

    if (features.length > 0) {
      return {
        type: 'FeatureCollection',
        features: features,
        bounds: this.calculateBounds(features),
        center: this.calculateCenter(features),
        metadata: {
          totalFeatures: features.length,
          sources: ['text-analysis'],
          generatedAt: new Date().toISOString(),
          note: 'Generated from locations mentioned in analysis',
        },
      };
    }

    return null;
  }

  /**
   * Get tools used by a specific agent type
   */
  private getToolsForAgent(agentType: string): string[] {
    const toolMappings: Record<string, string[]> = {
      'urban-planning': [
        'getFootTrafficSummaryTool',
        'getWeatherTool',
        'searchEventsTool',
        'getAggregatedMetricTool',
        'searchPoiTool',
        'formatMapDataTool'
      ],
      'real-estate': [
        'getFootTrafficSummaryTool',
        'getGooglePlacesInsightsTool',
        'getAggregatedMetricTool',
        'searchPoiTool',
        'getGooglePlaceDetailsTool',
        'formatMapDataTool'
      ],
      'energy-utilities': [
        'getWeatherTool',
        'getAggregatedMetricTool',
        'searchPoiTool',
        'getIpLocationTool',
        'formatMapDataTool'
      ],
      'retail': [
        'getFootTrafficSummaryTool',
        'getGooglePlacesInsightsTool',
        'getAggregatedMetricTool',
        'searchPoiTool',
        'getGooglePlaceDetailsTool',
        'searchEventsTool',
        'formatMapDataTool'
      ],
    };

    return toolMappings[agentType] || [];
  }

  private calculateBounds(features: any[]): any {
    if (!features || features.length === 0) return null;

    let minLat = Infinity,
      maxLat = -Infinity;
    let minLon = Infinity,
      maxLon = -Infinity;

    features.forEach((feature) => {
      if (feature.geometry?.type === 'Point') {
        const [lon, lat] = feature.geometry.coordinates;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      }
    });

    if (minLat === Infinity) return null;

    return {
      north: maxLat,
      south: minLat,
      east: maxLon,
      west: minLon,
    };
  }

  private calculateCenter(features: any[]): any {
    if (!features || features.length === 0) return null;

    let totalLat = 0,
      totalLon = 0,
      count = 0;

    features.forEach((feature) => {
      if (feature.geometry?.type === 'Point') {
        const [lon, lat] = feature.geometry.coordinates;
        totalLat += lat;
        totalLon += lon;
        count++;
      }
    });

    if (count === 0) return null;

    return {
      lat: totalLat / count,
      lon: totalLon / count,
    };
  }
}
