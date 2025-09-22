import { Injectable, Inject } from '@nestjs/common';
import { SecurityUtil } from '../common/utils/security.util';

interface CacheInstance {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  reset?(): Promise<void>;
  store?: {
    reset?(): Promise<void>;
  };
}

@Injectable()
export class CacheService {
  constructor(@Inject('CACHE_MANAGER') private readonly cache: CacheInstance) {}

  async addToCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
    const ttlMs = ttlSeconds * 1000;
    await this.cache.set(key, JSON.stringify(value), ttlMs);
  }

  async addToCacheWithCustomTime(
    key: string,
    value: any,
    ttlMinutes: number,
  ): Promise<void> {
    const ttlMs = Math.round(ttlMinutes * 60 * 1000);
    await this.cache.set(key, JSON.stringify(value), ttlMs);
  }

  async getFromCache(key: string): Promise<any> {
    const cached = await this.cache.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async deleteFromCache(key: string): Promise<void> {
    await this.cache.del(key);
  }

  async clearCache(): Promise<void> {
    try {
      if (this.cache.reset) {
        await this.cache.reset();
        console.log('✅ Cache cleared using reset()');
      } else if (this.cache.store?.reset) {
        await this.cache.store.reset();
        console.log('✅ Cache cleared using store.reset()');
      } else {
        console.warn('❌ Cache reset method not available');
        // Fallback: try to clear manually if we have access to Redis client
        console.log('Attempting manual cache clear...');
      }
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      throw error;
    }
  }

  // Add method to clear specific wallet cache entries
  async clearWalletCache(walletAddress: string, isEVM: boolean = true): Promise<void> {
    try {
      const normalizedAddress = SecurityUtil.normalizeWalletAddress(walletAddress, isEVM);
      const secureKey = SecurityUtil.createSecureCacheKey('auth:sign_message', normalizedAddress);

      // Check if there's an active authentication in progress
      const activeAuth = await this.getFromCache(secureKey);
      if (activeAuth) {
        console.log(
          `⚠️ Warning: Clearing cache for wallet with active authentication: ${normalizedAddress}`,
        );
      }

      await this.deleteFromCache(secureKey);
      console.log(`🗑️ Deleted cache key for wallet: ${normalizedAddress}`);
      console.log('✅ Wallet cache entries cleared');
    } catch (error) {
      console.error('❌ Failed to clear wallet cache:', error);
    }
  }

  /**
   * Creates a secure cache key for authentication messages
   * @param walletAddress - The wallet address
   * @param isEVM - Whether this is an EVM address
   * @returns Secure cache key
   */
  createAuthCacheKey(walletAddress: string, isEVM: boolean = true): string {
    const normalizedAddress = SecurityUtil.normalizeWalletAddress(walletAddress, isEVM);
    return SecurityUtil.createSecureCacheKey('auth:sign_message', normalizedAddress);
  }
}
