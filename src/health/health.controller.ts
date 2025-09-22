import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

interface HealthResponse {
  status: string;
  db: string;
  cache?: string;
  message?: string;
}

interface CacheTestResponse {
  success: boolean;
  message: string;
  data?: any;
  timestamp?: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health Check',
    description:
      'Check the health status of the application, database, and cache connection',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check successful',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        db: { type: 'string', example: 'available' },
        cache: { type: 'string', example: 'available' },
        message: { type: 'string', example: 'Optional error message' },
      },
    },
  })
  async health(): Promise<HealthResponse> {
    try {
      const response: HealthResponse = { status: 'ok', db: 'available' };

      // Check database
      if (!this.prisma) {
        response.status = 'error';
        response.db = 'unavailable';
      }

      // Test cache connectivity
      try {
        await this.cacheService.addToCache(
          'health-test',
          { timestamp: new Date().toISOString() },
          10,
        );
        const cached = await this.cacheService.getFromCache('health-test');
        response.cache = cached ? 'available' : 'unavailable';
        await this.cacheService.deleteFromCache('health-test'); // cleanup
      } catch (cacheError) {
        response.cache = 'unavailable';
        response.message = `Cache error: ${cacheError instanceof Error ? cacheError.message : 'Unknown cache error'}`;
      }

      return response;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return {
        status: 'error',
        db: 'disconnected',
        cache: 'unknown',
        message: errorMessage,
      };
    }
  }

  @Post('cache/test')
  @ApiOperation({
    summary: 'Test Cache Set',
    description: 'Test setting a value in the cache',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'test-key' },
        value: { type: 'object', example: { message: 'Hello Cache!' } },
        ttl: { type: 'number', example: 300 },
      },
      required: ['key', 'value'],
    },
  })
  @ApiResponse({ status: 200, description: 'Cache set successful' })
  async testCacheSet(
    @Body() body: { key: string; value: any; ttl?: number },
  ): Promise<CacheTestResponse> {
    try {
      await this.cacheService.addToCache(body.key, body.value, body.ttl || 300);
      return {
        success: true,
        message: `Successfully cached value for key: ${body.key}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to cache value: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('cache/test/:key')
  @ApiOperation({
    summary: 'Test Cache Get',
    description: 'Test getting a value from the cache',
  })
  @ApiParam({ name: 'key', description: 'Cache key to retrieve' })
  @ApiResponse({ status: 200, description: 'Cache get result' })
  async testCacheGet(@Param('key') key: string): Promise<CacheTestResponse> {
    try {
      const data = await this.cacheService.getFromCache(key);
      return {
        success: true,
        message: data
          ? `Found cached value for key: ${key}`
          : `No cached value found for key: ${key}`,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get cached value: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('cache/clear')
  @ApiOperation({
    summary: 'Clear Cache',
    description: 'Clear all cached values',
  })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  async clearCache(): Promise<CacheTestResponse> {
    try {
      await this.cacheService.clearCache();
      return {
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('cache/clear-wallet')
  @ApiOperation({
    summary: 'Clear Wallet Cache',
    description: 'Clear cache entries for a specific wallet address',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          example: '0xb6040205e14e0ab42ea38c31e84c386dea02a0b1',
        },
      },
      required: ['walletAddress'],
    },
  })
  @ApiResponse({ status: 200, description: 'Wallet cache cleared' })
  async clearWalletCache(
    @Body() body: { walletAddress: string },
  ): Promise<CacheTestResponse> {
    try {
      await this.cacheService.clearWalletCache(body.walletAddress);
      return {
        success: true,
        message: `Wallet cache cleared for address: ${body.walletAddress}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear wallet cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
