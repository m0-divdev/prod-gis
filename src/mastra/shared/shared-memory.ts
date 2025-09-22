// Shared Memory Configuration - Common memory setup for all agents
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

// Shared memory instance for all specialized agents
// This enables memory sharing between agents while maintaining separate contexts
export const sharedMemory = new Memory({
  storage: new LibSQLStore({
    // Clean DATABASE_URL by removing unsupported query parameters
    url: cleanDatabaseUrl(
      process.env.DATABASE_URL || 'file:../mastra-shared.db',
    ),
  }),
  // Configure memory options - workingMemory is not a direct boolean property
  options: {
    lastMessages: 10, // Keep last 10 messages for context
  },
});

/**
 * Clean database URL by removing unsupported query parameters for LibSQL
 * Also handles URL scheme compatibility
 */
function cleanDatabaseUrl(url: string): string {
  // If it's a file URL, use it as-is
  if (url.startsWith('file:')) {
    return url;
  }

  // If it's a PostgreSQL URL, we can't use LibSQL with it
  // Fall back to file-based storage
  if (url.startsWith('postgresql:') || url.startsWith('postgres:')) {
    console.warn(
      `PostgreSQL URL detected: ${url}. LibSQL requires libsql:// or file:// URLs. Falling back to file storage.`,
    );
    return 'file:../mastra-shared.db';
  }

  try {
    const urlObj = new URL(url);

    // Check if the scheme is supported by LibSQL
    const supportedSchemes = [
      'libsql:',
      'wss:',
      'ws:',
      'https:',
      'http:',
      'file:',
    ];
    if (!supportedSchemes.some((scheme) => url.startsWith(scheme))) {
      console.warn(
        `Unsupported URL scheme: ${urlObj.protocol}. LibSQL supports: ${supportedSchemes.join(', ')}. Falling back to file storage.`,
      );
      return 'file:../mastra-shared.db';
    }

    // Remove unsupported query parameters
    const supportedParams = ['mode', 'cache'];
    const currentParams = Array.from(urlObj.searchParams.keys());

    currentParams.forEach((param) => {
      if (!supportedParams.includes(param)) {
        urlObj.searchParams.delete(param);
      }
    });

    return urlObj.toString();
  } catch {
    // If URL parsing fails, fall back to file-based storage
    console.warn(`Invalid DATABASE_URL: ${url}, falling back to file storage`);
    return 'file:../mastra-shared.db';
  }
}

// Memory configuration for different agent types
export const MEMORY_CONFIGS = {
  // For domain-specific agents that need persistent context
  domainAgent: {
    storage: sharedMemory.storage,
    options: {
      lastMessages: 15,
    },
  },

  // For the map data agent (lighter memory footprint)
  mapDataAgent: {
    storage: sharedMemory.storage,
    options: {
      lastMessages: 5, // Shorter context for map operations
    },
  },

  // For planning and orchestration agents
  orchestratorAgent: {
    storage: sharedMemory.storage,
    options: {
      lastMessages: 20,
    },
  },
};

// Helper function to create agent memory with shared storage
export function createSharedMemory(config: typeof MEMORY_CONFIGS.domainAgent) {
  return new Memory({
    storage: config.storage,
    options: config.options,
  });
}

// Export memory utility functions
export { Memory, LibSQLStore };
