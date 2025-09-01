import { Injectable, Logger } from '@nestjs/common';

export enum QueryType {
  SEARCH_ONLY = 'search_only',
  MAP_DATA_ONLY = 'map_data_only',
  COMPREHENSIVE = 'comprehensive',
  ANALYTICS = 'analytics',
  LOCATION_BASED = 'location_based',
  URBAN_PLANNING = 'urban_planning',
  REAL_ESTATE = 'real_estate',
  ENERGY_UTILITIES = 'energy_utilities',
  RETAIL = 'retail',
}

export interface QueryAnalysis {
  type: QueryType;
  confidence: number;
  suggestedAgents: string[];
  extractedEntities: {
    locations?: string[];
    categories?: string[];
    metrics?: string[];
    timeframes?: string[];
  };
  requiresMapping: boolean;
  requiresSummary: boolean;
}

@Injectable()
export class QueryRouterService {
  private readonly logger = new Logger(QueryRouterService.name);

  analyzeQuery(query: string): QueryAnalysis {
    const lowerQuery = query.toLowerCase();
    
    // Extract entities
    const locations = this.extractLocations(query);
    const categories = this.extractCategories(query);
    const metrics = this.extractMetrics(query);
    const timeframes = this.extractTimeframes(query);

    // Determine query type and routing
    const analysis: QueryAnalysis = {
      type: this.classifyQueryType(lowerQuery),
      confidence: 0.8, // Could be enhanced with ML model
      suggestedAgents: [],
      extractedEntities: {
        locations,
        categories,
        metrics,
        timeframes,
      },
      requiresMapping: this.requiresMapping(lowerQuery),
      requiresSummary: this.requiresSummary(lowerQuery),
    };

    // Determine which agents to use
    analysis.suggestedAgents = this.determineAgents(analysis);

    this.logger.log(`Query analyzed: ${analysis.type} (confidence: ${analysis.confidence})`);
    return analysis;
  }

  private classifyQueryType(query: string): QueryType {
    const lowerQuery = query.toLowerCase();

    // Specialized agent keywords
    const urbanPlanningKeywords = [
      'urban planning', 'community', 'infrastructure', 'zoning', 'walkability',
      'bikeability', 'mixed-use', 'sustainable', 'green space', 'public space',
      'pedestrian', 'neighborhood', 'district', 'residential', 'commercial'
    ];

    const realEstateKeywords = [
      'real estate', 'property', 'land use', 'commercial property', 'rental',
      'investment', 'market analysis', 'property value', 'commercial space',
      'office space', 'retail space', 'land development', 'property market'
    ];

    const energyUtilitiesKeywords = [
      'energy', 'utilities', 'power grid', 'electrical', 'gas', 'water',
      'infrastructure', 'renewable', 'solar', 'wind', 'utility network',
      'power lines', 'substation', 'energy efficiency', 'carbon footprint'
    ];

    const retailKeywords = [
      'retail', 'store location', 'shopping center', 'mall', 'franchise',
      'business location', 'market analysis', 'customer traffic', 'sales potential',
      'retail space', 'store optimization', 'market penetration', 'trade area'
    ];

    const mapKeywords = ['map', 'show on map', 'geojson', 'coordinates', 'plot', 'visualize'];
    const analyticsKeywords = ['average', 'count', 'sum', 'how many', 'statistics', 'foot traffic', 'busy'];
    const searchKeywords = ['find', 'search', 'look for', 'locate'];

    // Check for specialized agent queries first
    if (urbanPlanningKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return QueryType.URBAN_PLANNING;
    }

    if (realEstateKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return QueryType.REAL_ESTATE;
    }

    if (energyUtilitiesKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return QueryType.ENERGY_UTILITIES;
    }

    if (retailKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return QueryType.RETAIL;
    }

    // Existing classification logic
    if (mapKeywords.some(keyword => query.includes(keyword))) {
      return QueryType.MAP_DATA_ONLY;
    }

    if (analyticsKeywords.some(keyword => query.includes(keyword))) {
      return QueryType.ANALYTICS;
    }

    if (searchKeywords.some(keyword => query.includes(keyword)) &&
        !query.includes('weather') && !query.includes('events')) {
      return QueryType.SEARCH_ONLY;
    }

    return QueryType.COMPREHENSIVE;
  }

  private determineAgents(analysis: QueryAnalysis): string[] {
    const agents: string[] = [];

    switch (analysis.type) {
      case QueryType.URBAN_PLANNING:
        agents.push('urbanPlanningAgent');
        agents.push('mapDataAgent'); // For geospatial analysis
        break;

      case QueryType.REAL_ESTATE:
        agents.push('realEstateAgent');
        agents.push('mapDataAgent'); // For location analysis
        break;

      case QueryType.ENERGY_UTILITIES:
        agents.push('energyUtilitiesAgent');
        agents.push('mapDataAgent'); // For infrastructure mapping
        break;

      case QueryType.RETAIL:
        agents.push('retailAgent');
        agents.push('mapDataAgent'); // For market analysis
        break;

      case QueryType.MAP_DATA_ONLY:
        agents.push('mapDataAgent');
        break;

      case QueryType.SEARCH_ONLY:
        agents.push('orchestratorAgent');
        break;

      case QueryType.COMPREHENSIVE:
        agents.push('orchestratorAgent');
        if (analysis.requiresMapping) {
          agents.push('mapDataAgent');
        }
        break;

      case QueryType.ANALYTICS:
        agents.push('orchestratorAgent');
        break;

      case QueryType.LOCATION_BASED:
        agents.push('orchestratorAgent', 'mapDataAgent');
        break;
    }

    return agents;
  }

  private extractLocations(query: string): string[] {
    const matches: string[] = [];

    // Simple location patterns - keep it minimal and focused
    const patterns = [
      // City, State pattern: "Chicago, Illinois", "Austin, Texas"
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      // Preposition + location: "in Austin", "near London", "at New York"
      /\b(?:in|near|at|around|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      // Direct city mentions
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        if (match[1] && match[2]) {
          // City, State pattern
          matches.push(`${match[1].trim()}, ${match[2].trim()}`);
        } else if (match[1]) {
          matches.push(match[1].trim());
        }
      }
    });

    return [...new Set(matches)]; // Remove duplicates
  }

  private extractCategories(query: string): string[] {
    const commonCategories = [
      'restaurant', 'cafe', 'coffee shop', 'hotel', 'gas station',
      'pharmacy', 'hospital', 'bank', 'atm', 'grocery store'
    ];
    
    return commonCategories.filter(category => 
      query.toLowerCase().includes(category)
    );
  }

  private extractMetrics(query: string): string[] {
    const metricKeywords = ['average', 'count', 'sum', 'max', 'min', 'total'];
    return metricKeywords.filter(metric => 
      query.toLowerCase().includes(metric)
    );
  }

  private extractTimeframes(query: string): string[] {
    const timeKeywords = ['today', 'tomorrow', 'this week', 'weekend', 'next week'];
    return timeKeywords.filter(time => 
      query.toLowerCase().includes(time)
    );
  }

  private requiresMapping(query: string): boolean {
    const mapIndicators = ['map', 'show', 'plot', 'visualize', 'geojson', 'coordinates'];
    const locationBased = this.extractLocations(query).length > 0;
    const businessAnalysis = ['area', 'around', 'near', 'location', 'suitability', 'competition', 'analyze'].some(keyword => 
      query.toLowerCase().includes(keyword)
    );
    
    return mapIndicators.some(indicator => query.includes(indicator)) || locationBased || businessAnalysis;
  }

  private requiresSummary(query: string): boolean {
    const summaryIndicators = ['tell me', 'explain', 'describe', 'what', 'how'];
    return summaryIndicators.some(indicator => query.includes(indicator));
  }
}
