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
  ) { }

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
          this.logger.log(`Routing to specialized agent for analysis: ${analysis.type}`);
          // Route to appropriate specialized agent based on query analysis
          let analysisResult: UnifiedChatResponseDto;

          switch (analysis.type) {
            case QueryType.URBAN_PLANNING:
              analysisResult = await this.processUrbanPlanningQuery({
                message: validatedInput.message,
                sessionId: validatedInput.sessionId,
                responsePreference: ResponsePreference.ANALYSIS,
                context: validatedInput.context,
              });
              agentsUsed = ['urbanPlanningAgent'];
              toolsUsed = this.getToolsForAgent('urban-planning');
              break;

            case QueryType.REAL_ESTATE:
              analysisResult = await this.processRealEstateQuery({
                message: validatedInput.message,
                sessionId: validatedInput.sessionId,
                responsePreference: ResponsePreference.ANALYSIS,
                context: validatedInput.context,
              });
              agentsUsed = ['realEstateAgent'];
              toolsUsed = this.getToolsForAgent('real-estate');
              break;

            case QueryType.ENERGY_UTILITIES:
              analysisResult = await this.processEnergyUtilitiesQuery({
                message: validatedInput.message,
                sessionId: validatedInput.sessionId,
                responsePreference: ResponsePreference.ANALYSIS,
                context: validatedInput.context,
              });
              agentsUsed = ['energyUtilitiesAgent'];
              toolsUsed = this.getToolsForAgent('energy-utilities');
              break;

            case QueryType.RETAIL:
              analysisResult = await this.processRetailQuery({
                message: validatedInput.message,
                sessionId: validatedInput.sessionId,
                responsePreference: ResponsePreference.ANALYSIS,
                context: validatedInput.context,
              });
              agentsUsed = ['retailAgent'];
              toolsUsed = this.getToolsForAgent('retail');
              break;

            case QueryType.SUPPLY_CHAIN:
              analysisResult = await this.processSupplyChainQuery({
                message: validatedInput.message,
                sessionId: validatedInput.sessionId,
                responsePreference: ResponsePreference.ANALYSIS,
                context: validatedInput.context,
              });
              agentsUsed = ['supplyChainAgent'];
              toolsUsed = this.getToolsForAgent('supply-chain');
              break;

            default:
              // Fall back to urban planning agent for comprehensive analysis
              analysisResult = await this.processUrbanPlanningQuery({
                message: validatedInput.message,
                sessionId: validatedInput.sessionId,
                responsePreference: ResponsePreference.ANALYSIS,
                context: validatedInput.context,
              });
              agentsUsed = ['urbanPlanningAgent'];
              toolsUsed = this.getToolsForAgent('urban-planning');
              break;
          }

          responseData = analysisResult.data;
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
      case QueryType.URBAN_PLANNING:
      case QueryType.REAL_ESTATE:
      case QueryType.ENERGY_UTILITIES:
      case QueryType.RETAIL:
      case QueryType.SUPPLY_CHAIN:
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
   * Process Supply Chain & Logistics Queries
   * Routes queries to the specialized supply chain agent for logistics analysis
   */
  async processSupplyChainQuery(unifiedChatDto: UnifiedChatDto): Promise<UnifiedChatResponseDto> {
    try {
      this.logger.log(`Processing supply chain query: ${unifiedChatDto.message}`);

      const supplyChainAgent = mastra.getAgent('supplyChainAgent');
      if (!supplyChainAgent) {
        throw new Error('Supply Chain Agent not available');
      }

      const response = await supplyChainAgent.generate(unifiedChatDto.message);
      return this.formatAgentResponseDirect(response, 'supply-chain');
    } catch (error) {
      this.logger.error(`Supply chain query failed: ${error}`);
      return this.formatErrorResponse(error, 'supply-chain');
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

    // Improved location patterns - focus on actual location names
    const locationPatterns = [
      // Specific Austin locations from the analysis
      /\b(Republic Square|Waterloo Park|Duncan Park|Auditorium Shores|Waller Creek|Rainey Street|Congress Ave|Red River Street|East Cesar Chavez|Convention Center|Palm Square Community Center|Arena Hall|Austin Central Library)\b/gi,

      // Street intersections and addresses
      /\b(\d+(?:th|rd|st|nd)\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd))\b/gi,

      // Neighborhood and district names
      /\b(Downtown Austin|Financial District|Central Business District|Entertainment District)\b/gi,

      // Landmark and facility names
      /\b(Texas Capitol|University of Texas|Lady Bird Lake|I-35|Shoal Creek)\b/gi,
    ];

    // Words to exclude (not actual locations)
    const excludeWords = [
      'downtown', 'central', 'southwest', 'northwest', 'southeast', 'northeast',
      'area', 'areas', 'location', 'locations', 'site', 'sites', 'place', 'places',
      'park', 'parks', 'center', 'centers', 'street', 'streets', 'avenue', 'avenues',
      'development', 'developments', 'community', 'communities', 'facility', 'facilities',
      'infrastructure', 'transportation', 'amenities', 'services', 'housing', 'buildings',
      'action', 'actions', 'pilot', 'launch', 'expand', 'improve', 'enhance', 'create',
      'use', 'uses', 'mixed', 'green', 'public', 'private', 'new', 'existing',
      'increased', 'improved', 'better', 'enhanced', 'reduced', 'increased',
      'short', 'medium', 'long', 'term', 'terms', 'implementation', 'timeline',
      'risk', 'assessment', 'mitigation', 'strategy', 'strategies', 'recommendations',
      'findings', 'data', 'analysis', 'insights', 'trends', 'patterns', 'statistics',
      'impact', 'impacts', 'projections', 'goals', 'objectives', 'priorities',
      'summary', 'table', 'conclusion', 'key', 'major', 'important', 'critical',
      'focus', 'focusing', 'target', 'targeting', 'priority', 'priorities'
    ];

    const foundLocations: string[] = [];

    locationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const locationName = match[1] || match.slice(1).join(' ');
        if (locationName &&
          locationName.length > 3 &&
          !foundLocations.includes(locationName) &&
          !excludeWords.some(word => locationName.toLowerCase().includes(word))) {
          foundLocations.push(locationName);
        }
      }
    });

    // If no specific locations found, try a more targeted extraction
    if (foundLocations.length === 0) {
      // Extract proper nouns that might be locations
      const properNounPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
      let match;
      while ((match = properNounPattern.exec(text)) !== null) {
        const potentialLocation = match[1];
        if (potentialLocation.length > 5 &&
          potentialLocation.length < 30 &&
          !excludeWords.some(word => potentialLocation.toLowerCase().includes(word)) &&
          !foundLocations.includes(potentialLocation)) {
          foundLocations.push(potentialLocation);
        }
      }
    }

    // Limit to top 10 most relevant locations to avoid rate limiting
    const topLocations = foundLocations.slice(0, 10);

    // Extract locations using provided patterns - let agent handle intelligence
    topLocations.forEach((locationName, index) => {
      // Use default coordinates - agent should provide specific city context
      const defaultLat = 39.8283; // US geographic center
      const defaultLon = -98.5795;

      // Simple random distribution within a reasonable area
      // Agent should override these with specific city coordinates
      const lat = defaultLat + (Math.random() - 0.5) * 0.1;
      const lon = defaultLon + (Math.random() - 0.5) * 0.1;

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          id: `location-${index}`,
          name: locationName,
          category: 'location', // Let agent categorize based on context
          source: 'text-extraction',
          confidence: 0.5, // Lower confidence since no city context
          description: `Location extracted from text: ${locationName}`,
          note: 'Coordinates are generic estimates - agent should provide city-specific coordinates',
        },
      });
    });

    if (features.length > 0) {
      return {
        type: 'FeatureCollection',
        features: features,
        bounds: this.calculateBounds(features),
        center: this.calculateCenter(features),
        metadata: {
          totalFeatures: features.length,
          sources: ['text-extraction'],
          generatedAt: new Date().toISOString(),
          note: 'Generated from specific locations mentioned in urban planning analysis',
          disclaimer: 'Coordinates are approximate estimates for visualization purposes',
          extractionMethod: 'improved-pattern-matching',
        },
      };
    }

    return null;
  }

  private categorizeLocation(locationName: string): string {
    const name = locationName.toLowerCase();

    if (name.includes('park') || name.includes('square') || name.includes('green')) {
      return 'park';
    }
    if (name.includes('center') || name.includes('community') || name.includes('library')) {
      return 'community-center';
    }
    if (name.includes('street') || name.includes('avenue') || name.includes('boulevard')) {
      return 'street';
    }
    if (name.includes('convention') || name.includes('capitol') || name.includes('university')) {
      return 'landmark';
    }
    if (name.includes('lake') || name.includes('creek') || name.includes('river')) {
      return 'water-feature';
    }

    return 'location';
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
      'supply-chain': [
        'tomtomFuzzySearchTool',
        'getFootTrafficSummaryTool',
        'getGooglePlacesInsightsTool',
        'getAggregatedMetricTool',
        'searchPoiTool',
        'getGooglePlaceDetailsTool',
        'getWeatherTool',
        'searchEventsTool',
        'getIpLocationTool',
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
