// NestJS framework imports for creating REST API controllers
import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';

// Swagger/OpenAPI imports for API documentation
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

// Import the main business logic service
import { PlacesService } from './places.service';

// Import DTOs for unified chat and health check only
import {
  HealthResponseDto,
  UnifiedChatDto,
  UnifiedChatResponseDto,
} from './dto';

// Swagger tag for grouping all endpoints under "Places" in API docs
@ApiTags('Places')
// Define the base route for all endpoints in this controller
@Controller('places')

/**
 * PlacesController - Main REST API controller for the Foursquare Places application
 * 
 * This controller provides multiple endpoints for location intelligence:
 * 1. /chat - Legacy non-streaming chat with AI agents
 * 2. /chat/stream - Streaming chat using Server-Sent Events (SSE)
 * 3. /search - Parameterized place search
 * 4. /location - Get location suggestions
 * 5. /health - Health check endpoint
 * 6. /examples - Usage examples for the API
 * 7. /chat/unified - Intelligent routing endpoint (NEW)
 * 
 * The controller acts as the entry point for all HTTP requests and delegates
 * business logic to the PlacesService.
 */
export class PlacesController {
  /**
   * Constructor - Injects the PlacesService for handling business logic
   * @param placesService - Service containing all business logic for places operations
   */
  constructor(private readonly placesService: PlacesService) { }

  @Get('health')
  @ApiOperation({
    summary: 'Health Check',
    description: 'Check the health status of the Places API',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    type: HealthResponseDto,
  })
  healthCheck(): HealthResponseDto {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
  /**
   * Specialized Agent Endpoints
   * Direct endpoints for domain-specific AI agents
   */

  /**
   * Urban Planning Agent - Building Better Communities
   */
  @Post('urban-planning')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Urban Planning & Smart Cities Analysis',
    description:
      'Analyze urban environments for community planning, infrastructure optimization, and sustainable development',
  })
  @ApiBody({
    type: UnifiedChatDto,
    description: 'Query for urban planning analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Urban planning analysis results',
    type: UnifiedChatResponseDto,
  })
  async processUrbanPlanning(
    @Body() unifiedChatDto: UnifiedChatDto,
  ): Promise<UnifiedChatResponseDto> {
    try {
      return await this.placesService.processUrbanPlanningQuery(unifiedChatDto);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Urban planning analysis failed: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Real Estate Agent - Data-Driven Property Decisions
   */
  @Post('real-estate')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Real Estate & Land Use Analysis',
    description:
      'Analyze property markets, land use optimization, and investment opportunities',
  })
  @ApiBody({
    type: UnifiedChatDto,
    description: 'Query for real estate analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Real estate analysis results',
    type: UnifiedChatResponseDto,
  })
  async processRealEstate(
    @Body() unifiedChatDto: UnifiedChatDto,
  ): Promise<UnifiedChatResponseDto> {
    try {
      return await this.placesService.processRealEstateQuery(unifiedChatDto);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Real estate analysis failed: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Energy & Utilities Agent - Powering Up with Spatial Insights
   */
  @Post('energy-utilities')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Energy & Utilities Spatial Analysis',
    description:
      'Optimize energy infrastructure, utility networks, and renewable energy placement',
  })
  @ApiBody({
    type: UnifiedChatDto,
    description: 'Query for energy/utilities analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Energy/utilities analysis results',
    type: UnifiedChatResponseDto,
  })
  async processEnergyUtilities(
    @Body() unifiedChatDto: UnifiedChatDto,
  ): Promise<UnifiedChatResponseDto> {
    try {
      return await this.placesService.processEnergyUtilitiesQuery(
        unifiedChatDto,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Energy/utilities analysis failed: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retail Agent - Pinpointing the Perfect Store Location
   */
  @Post('retail')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Retail Location Optimization',
    description:
      'Analyze retail markets, optimize store locations, and maximize sales potential',
  })
  @ApiBody({
    type: UnifiedChatDto,
    description: 'Query for retail analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Retail analysis results',
    type: UnifiedChatResponseDto,
  })
  async processRetail(
    @Body() unifiedChatDto: UnifiedChatDto,
  ): Promise<UnifiedChatResponseDto> {
    try {
      return await this.placesService.processRetailQuery(unifiedChatDto);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Retail analysis failed: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Supply Chain Agent - Optimizing Logistics Networks
   */
  @Post('supply-chain')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Supply Chain & Logistics Optimization',
    description: 'Analyze distribution networks, optimize warehouse locations, and enhance supply chain efficiency using Foursquare Places API'
  })
  @ApiBody({
    type: UnifiedChatDto,
    description: 'Query for supply chain and logistics analysis',
    examples: {
      'warehouse-analysis': {
        summary: 'Warehouse location analysis',
        value: {
          message: 'Find optimal warehouse locations near major highways in Texas with rail access',
          sessionId: 'supply-chain-session-1',
          responsePreference: 'analysis'
        }
      },
      'port-connectivity': {
        summary: 'Port connectivity assessment',
        value: {
          message: 'Analyze transportation infrastructure around Port of Los Angeles for import distribution',
          sessionId: 'logistics-session-2',
          responsePreference: 'analysis'
        }
      },
      'last-mile-delivery': {
        summary: 'Last-mile delivery planning',
        value: {
          message: 'Identify micro-fulfillment center locations for same-day delivery in Chicago metropolitan area',
          sessionId: 'delivery-session-3',
          responsePreference: 'geojson'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Supply chain analysis results with logistics insights and facility recommendations',
    type: UnifiedChatResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid supply chain query'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during supply chain analysis'
  })
  async processSupplyChain(@Body() unifiedChatDto: UnifiedChatDto): Promise<UnifiedChatResponseDto> {
    try {
      return await this.placesService.processSupplyChainQuery(unifiedChatDto);
    } catch (error) {
      throw new HttpException(
        `Supply chain analysis failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
