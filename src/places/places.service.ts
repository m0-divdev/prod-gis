/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { mastra } from '../mastra';
import {
  UnifiedChatDto,
  UnifiedChatResponseDto,
  ResponseType,
} from './dto/unified-chat.dto';
import { formatMapDataTool } from '../mastra/tools/format-map-data-tool';
import { tomtomFuzzySearchTool } from '../mastra/tools/tomtom-fuzzy-search-tool';

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
      return await this.formatAgentResponseDirect(
        response,
        'urban-planning',
        unifiedChatDto.message,
      );
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
      return await this.formatAgentResponseDirect(
        response,
        'real-estate',
        unifiedChatDto.message,
      );
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
      return await this.formatAgentResponseDirect(
        response,
        'energy-utilities',
        unifiedChatDto.message,
      );
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
      return await this.formatAgentResponseDirect(
        response,
        'retail',
        unifiedChatDto.message,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Retail query failed: ${message}`);
      return this.formatErrorResponse(error, 'retail');
    }
  }

  private async formatAgentResponseDirect(
    agentResponse: unknown,
    agentType: string,
    originalMessage: string,
  ): Promise<UnifiedChatResponseDto> {
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
    let toolsUsed: string[] = [];
    const agentsUsed: string[] = [`${agentType}Agent`];

    try {
      // Helper: extract first top-level JSON object from arbitrary text
      const extractFirstJsonObject = (text: string): string | null => {
        const start = text.indexOf('{');
        if (start === -1) return null;
        let depth = 0;
        let inString = false;
        let escape = false;
        for (let i = start; i < text.length; i++) {
          const ch = text[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (ch === '\\') {
            escape = true;
            continue;
          }
          if (ch === '"') {
            inString = !inString;
            continue;
          }
          if (inString) continue;
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          if (depth === 0) {
            return text.slice(start, i + 1);
          }
        }
        return null;
      };

      // 1) Try fenced JSON first
      let jsonContent: Record<string, unknown> | null = null;
      const fencedJsonPatterns = [
        /```json\s*([\s\S]*?)\s*```/,
        /```\s*([\s\S]*?)\s*```/,
      ];
      for (const pattern of fencedJsonPatterns) {
        const m = responseText.match(pattern);
        if (m && m[1]) {
          try {
            jsonContent = JSON.parse(m[1]) as Record<string, unknown>;
            break;
          } catch {
            // ignore malformed fenced JSON
          }
        }
      }

      // 2) If not fenced, attempt to extract the first JSON object from the text
      if (!jsonContent) {
        const candidate = extractFirstJsonObject(responseText);
        if (candidate) {
          try {
            jsonContent = JSON.parse(candidate) as Record<string, unknown>;
          } catch {
            // ignore malformed inline JSON
          }
        }
      }

      // Promote analysis/mapData/toolsUsed from JSON when present
      let toolsFromJson: string[] = [];
      if (jsonContent) {
        const jc = jsonContent as Record<string, unknown> & {
          analysis?: Record<string, unknown>;
          mapData?: unknown;
          map?: unknown;
          toolsUsed?: unknown;
          type?: string;
          features?: unknown;
        };
        // If the JSON looks like GeoJSON, treat it as map data; otherwise treat as analysis
        if (jc.type === 'FeatureCollection' && Array.isArray(jc.features)) {
          mapData = jc;
        } else {
          analysis = (jc.analysis as Record<string, unknown>) || jc;
          mapData = jc.mapData ?? jc.map ?? null;
        }
        if (Array.isArray(jc.toolsUsed)) {
          toolsFromJson = (jc.toolsUsed as unknown[])
            .filter((t): t is string => typeof t === 'string')
            .filter((s) => s.length > 0);
        }
      }

      // Derive tool names/ids from toolResults when available, then merge with JSON toolsUsed
      if (resp.toolResults) {
        try {
          const names = resp.toolResults
            .map((tr: any) => {
              const v = tr?.toolId ?? tr?.tool ?? tr?.name ?? tr?.toolName;
              return typeof v === 'string' ? v : '';
            })
            .filter((s: string) => s.length > 0);
          toolsUsed = Array.from(new Set([...(toolsFromJson || []), ...names]));
        } catch {
          toolsUsed = Array.from(new Set([...(toolsFromJson || [])]));
        }
        for (const toolResult of resp.toolResults) {
          const r = toolResult.result as any;
          if (r?.type === 'FeatureCollection' || r?.features || r?.mapData) {
            mapData = r?.mapData ?? r;
            break;
          }
        }
      } else if (toolsFromJson.length) {
        toolsUsed = Array.from(new Set(toolsFromJson));
      }
    } catch {
      analysis = { summary: responseText };
    }

    // If no mapData yet, try programmatic synthesis from toolResults using format-map-data
    if (!mapData && resp.toolResults && resp.toolResults.length > 0) {
      try {
        const rawData: Record<string, unknown> = {};
        const addAlias = (key: string, value: unknown) => {
          if (key && !(key in rawData)) rawData[key] = value;
        };
        for (const tr of resp.toolResults as any[]) {
          const id: string = String(
            tr?.toolId ?? tr?.tool ?? tr?.name ?? tr?.toolName ?? '',
          );
          const value = tr?.result;
          if (!id || value == null) continue;
          // original id
          addAlias(id, value);
          // kebab-case alias
          const kebab = id
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
            .toLowerCase();
          addAlias(kebab, value);
          // remove Tool suffix variants
          if (id.endsWith('Tool')) {
            const noTool = id.slice(0, -4);
            addAlias(noTool, value);
            const kebabNoTool = kebab.replace(/-tool$/, '');
            addAlias(kebabNoTool, value);
          }
        }
        const fc = await (
          formatMapDataTool as unknown as {
            execute: (args: {
              context: { rawData: Record<string, unknown> };
            }) => Promise<unknown>;
          }
        ).execute({
          context: { rawData },
        });
        if (
          fc &&
          (fc as any).type === 'FeatureCollection' &&
          Array.isArray((fc as any).features) &&
          (fc as any).features.length > 0
        ) {
          mapData = fc as unknown;
          toolsUsed = Array.from(
            new Set([...(toolsUsed || []), 'format-map-data']),
          );
        }
      } catch (err) {
        this.logger.warn(
          `Programmatic map synthesis failed: ${String(
            err instanceof Error ? err.message : err,
          )}`,
        );
      }
    }

    // If still no mapData, call mapDataAgent to produce GeoJSON
    if (!mapData) {
      try {
        const generated = await this.generateMapDataFromQuery(originalMessage);
        if (generated) {
          mapData = generated;
          agentsUsed.push('mapDataAgent');
          // We know format-map-data is used inside mapDataAgent
          toolsUsed = Array.from(
            new Set([...(toolsUsed || []), 'format-map-data']),
          );
        }
      } catch (err) {
        // ignore map generation failures, keep existing analysis
        this.logger.warn(
          `Map generation skipped: ${String(
            err instanceof Error ? err.message : err,
          )}`,
        );
      }
    }

    // If still no mapData, try deterministic TomTom fuzzy-search to seed features
    if (!mapData) {
      try {
        const seeded = await this.synthesizeMapViaTomTom(originalMessage);
        if (seeded) {
          mapData = seeded;
          toolsUsed = Array.from(
            new Set([
              ...(toolsUsed || []),
              'tomtom-fuzzy-search',
              'format-map-data',
            ]),
          );
        }
      } catch (err) {
        this.logger.warn(
          `TomTom fallback failed: ${String(
            err instanceof Error ? err.message : err,
          )}`,
        );
      }
    }

    return {
      type: ResponseType.ANALYSIS,
      data: { text: responseText, analysis, mapData },
      metadata: {
        executionTime: 0,
        agentsUsed,
        toolsUsed,
        confidence: 0.9,
        intent: agentType,
        detectedEntities: [],
      },
      success: true,
      timestamp: new Date().toISOString(),
    };
  }

  // Generate GeoJSON via the mapDataAgent given the original user message
  private async generateMapDataFromQuery(
    message: string,
  ): Promise<Record<string, unknown> | null> {
    const mapAgent = mastra.getAgent('mapDataAgent');
    if (!mapAgent) return null;
    const resp = await mapAgent.generate(message);
    const text = String(
      (resp as any)?.text ?? (resp as any)?.content ?? resp ?? '',
    );

    // Reuse JSON extraction: find first top-level JSON object
    const extractFirstJsonObject = (t: string): string | null => {
      const start = t.indexOf('{');
      if (start === -1) return null;
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = start; i < t.length; i++) {
        const ch = t[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\') {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (inString) continue;
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        if (depth === 0) {
          return t.slice(start, i + 1);
        }
      }
      return null;
    };

    const candidate = extractFirstJsonObject(text);
    if (!candidate) return null;
    try {
      const obj = JSON.parse(candidate);
      if (
        obj &&
        typeof obj === 'object' &&
        'type' in obj &&
        'features' in obj &&
        (obj as { type?: unknown }).type === 'FeatureCollection' &&
        Array.isArray((obj as { features?: unknown }).features)
      ) {
        return obj as Record<string, unknown>;
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }

  // Final minimal fallback: use TomTom fuzzy search to produce nearby retail POIs if everything else failed
  private async synthesizeMapViaTomTom(
    message: string,
  ): Promise<Record<string, unknown> | null> {
    // naive extraction of a location after the word "near"
    const m = message.match(/near\s+([^;,.]+(?:,\s*[^;,.]+)?)/i);
    const geobias = (m?.[1] || message).trim();
    try {
      const search = await (
        tomtomFuzzySearchTool as unknown as {
          execute: (args: {
            context: {
              query: string;
              geobias?: string;
              radius?: number;
              limit?: number;
            };
          }) => Promise<unknown>;
        }
      ).execute({
        context: { query: 'retail', geobias, radius: 1000, limit: 20 },
      });

      const rawData: Record<string, unknown> = {
        'tomtom-fuzzy-search': search,
      };
      const fc = await (
        formatMapDataTool as unknown as {
          execute: (args: {
            context: { rawData: Record<string, unknown> };
          }) => Promise<unknown>;
        }
      ).execute({ context: { rawData } });
      if (
        fc &&
        (fc as any).type === 'FeatureCollection' &&
        Array.isArray((fc as any).features) &&
        (fc as any).features.length > 0
      ) {
        return fc as Record<string, unknown>;
      }
    } catch {
      // swallow and return null
    }
    return null;
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
}
