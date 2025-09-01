/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { mastra } from '../mastra';
import {
  UnifiedChatDto,
  UnifiedChatResponseDto,
  ResponseType,
} from './dto/unified-chat.dto';

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor() {}

  async processUrbanPlanningQuery(
    unifiedChatDto: UnifiedChatDto,
  ): Promise<UnifiedChatResponseDto> {
    try {
      this.logger.log(
        `Processing urban planning query: ${unifiedChatDto.message}`,
      );

      const urbanPlanningAgent = mastra.getAgent('urbanPlanningAgent');
      if (!urbanPlanningAgent) {
        throw new Error('Urban Planning Agent not available');
      }

      const response = await urbanPlanningAgent.generate(
        unifiedChatDto.message,
      );
      return this.formatAgentResponseDirect(response, 'urban-planning');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Urban planning query failed: ${message}`);
      return this.formatErrorResponse(error, 'urban-planning');
    }
  }

  async processRealEstateQuery(
    unifiedChatDto: UnifiedChatDto,
  ): Promise<UnifiedChatResponseDto> {
    try {
      this.logger.log(
        `Processing real estate query: ${unifiedChatDto.message}`,
      );

      const realEstateAgent = mastra.getAgent('realEstateAgent');
      if (!realEstateAgent) {
        throw new Error('Real Estate Agent not available');
      }

      const response = await realEstateAgent.generate(unifiedChatDto.message);
      return this.formatAgentResponseDirect(response, 'real-estate');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Real estate query failed: ${message}`);
      return this.formatErrorResponse(error, 'real-estate');
    }
  }

  async processEnergyUtilitiesQuery(
    unifiedChatDto: UnifiedChatDto,
  ): Promise<UnifiedChatResponseDto> {
    try {
      this.logger.log(
        `Processing energy/utilities query: ${unifiedChatDto.message}`,
      );

      const energyUtilitiesAgent = mastra.getAgent('energyUtilitiesAgent');
      if (!energyUtilitiesAgent) {
        throw new Error('Energy/Utilities Agent not available');
      }

      const response = await energyUtilitiesAgent.generate(
        unifiedChatDto.message,
      );
      return this.formatAgentResponseDirect(response, 'energy-utilities');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Energy/utilities query failed: ${message}`);
      return this.formatErrorResponse(error, 'energy-utilities');
    }
  }

  async processRetailQuery(
    unifiedChatDto: UnifiedChatDto,
  ): Promise<UnifiedChatResponseDto> {
    try {
      this.logger.log(`Processing retail query: ${unifiedChatDto.message}`);

      const retailAgent = mastra.getAgent('retailAgent');
      if (!retailAgent) {
        throw new Error('Retail Agent not available');
      }

      const response = await retailAgent.generate(unifiedChatDto.message);
      return this.formatAgentResponseDirect(response, 'retail');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Retail query failed: ${message}`);
      return this.formatErrorResponse(error, 'retail');
    }
  }

  private formatAgentResponseDirect(
    agentResponse: unknown,
    agentType: string,
  ): UnifiedChatResponseDto {
    type ToolResult = {
      result?: { type?: string; features?: unknown; mapData?: unknown };
    };
    type AgentResponseShape = {
      text?: string;
      content?: string;
      toolResults?: ToolResult[];
    };

    const resp: AgentResponseShape =
      (agentResponse as AgentResponseShape) || {};
    const responseText = String(
      resp.text ?? resp.content ?? 'Analysis completed',
    );

    let analysis: Record<string, unknown> = {};
    let mapData: unknown = null;

    try {
      const jsonPatterns = [
        /```json\s*([\s\S]*?)\s*```/g,
        /```\s*([\s\S]*?)\s*```/g,
        /\{[\s\S]*\}/g,
      ];

      let jsonContent: Record<string, unknown> | null = null;
      for (const pattern of jsonPatterns) {
        const match = pattern.exec(responseText);
        if (match && match[1]) {
          try {
            jsonContent = JSON.parse(match[1]) as Record<string, unknown>;
            break;
          } catch {
            continue;
          }
        }
      }

      if (jsonContent) {
        const jc = jsonContent;
        analysis = (jc.analysis as Record<string, unknown>) || jc;
        mapData = jc.mapData || jc.map || null;
      }

      if (!mapData && resp.toolResults) {
        for (const toolResult of resp.toolResults) {
          const r = toolResult.result;
          if (r?.type === 'FeatureCollection' || r?.features || r?.mapData) {
            mapData = r?.mapData ?? r;
            break;
          }
        }
      }

      if (!mapData) {
        const locationMatches =
          responseText.match(
            /\b\d+\s+[A-Z][a-z]+(?:\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place))\b/gi,
          ) ||
          responseText.match(
            /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Center|Street|Avenue|Road|Boulevard|Drive|Lane|Way|Court|Place))\b/gi,
          );

        if (locationMatches && locationMatches.length > 0) {
          mapData = this.generateBasicMapDataFromText(
            responseText,
            locationMatches,
          );
        }
      }
    } catch {
      analysis = { summary: responseText };
    }

    return {
      type: ResponseType.ANALYSIS,
      data: { text: responseText, analysis, mapData },
      metadata: {
        executionTime: 0,
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

  private formatErrorResponse(
    error: unknown,
    agentType: string,
  ): UnifiedChatResponseDto {
    const message = error instanceof Error ? error.message : String(error);
    return {
      type: ResponseType.TEXT,
      data: {
        text: `Error processing ${agentType} query: ${message}`,
        analysis: { error: message },
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

  private generateBasicMapDataFromText(
    text: string,
    locationMatches: string[],
  ): any {
    const features: any[] = [];

    const majorLocations = {
      'Embarcadero Center': { lat: 37.7955, lon: -122.3967 },
      'Pine Street': { lat: 37.792, lon: -122.3984 },
      'Commercial Street': { lat: 37.7942, lon: -122.4037 },
      'Front Street': { lat: 37.7925, lon: -122.3989 },
      'Davis Street': { lat: 37.7951, lon: -122.3981 },
      'Financial District': { lat: 37.7949, lon: -122.4039 },
    } as const;

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
          mentionedLocations: locationMatches,
        },
      };
    }

    return null;
  }

  private getToolsForAgent(agentType: string): string[] {
    const toolMappings: Record<string, string[]> = {
      'urban-planning': [
        'getFootTrafficSummaryTool',
        'getWeatherTool',
        'searchEventsTool',
        'getAggregatedMetricTool',
        'searchPoiTool',
        'formatMapDataTool',
      ],
      'real-estate': [
        'getFootTrafficSummaryTool',
        'getGooglePlacesInsightsTool',
        'getAggregatedMetricTool',
        'searchPoiTool',
        'getGooglePlaceDetailsTool',
        'formatMapDataTool',
      ],
      'energy-utilities': [
        'getWeatherTool',
        'getAggregatedMetricTool',
        'searchPoiTool',
        'getIpLocationTool',
        'formatMapDataTool',
      ],
      retail: [
        'getFootTrafficSummaryTool',
        'getGooglePlacesInsightsTool',
        'getAggregatedMetricTool',
        'searchPoiTool',
        'getGooglePlaceDetailsTool',
        'searchEventsTool',
        'formatMapDataTool',
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
        const [lon, lat] = feature.geometry.coordinates as [number, number];
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
        const [lon, lat] = feature.geometry.coordinates as [number, number];
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
