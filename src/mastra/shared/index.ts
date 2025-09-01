// Shared Components Index - Central export for all shared resources
// This file serves as the single entry point for shared components used by specialized agents

// Shared Agents
export { mapDataAgent } from './map-data-agent';

// Shared Tools
export * from './shared-tools';

// Shared Memory
export * from './shared-memory';

// Shared Configuration
export const SHARED_CONFIG = {
  // Common model configuration
  model: 'gpt-4.1-2025-04-14',

  // Common agent settings
  agentDefaults: {
    temperature: 0.7,
    maxTokens: 2000,
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'file:../mastra-shared.db',
  },
};

// Utility function to get agent configuration
export function getAgentConfig(overrides = {}) {
  return {
    ...SHARED_CONFIG.agentDefaults,
    ...overrides,
  };
}

// Utility function to get database configuration
export function getDatabaseConfig() {
  return SHARED_CONFIG.database;
}
