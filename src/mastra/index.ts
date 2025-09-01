import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';

// Import specialized agents
import { urbanPlanningAgent } from './agents/urban-planning-agent';
import { realEstateAgent } from './agents/real-estate-agent';
import { energyUtilitiesAgent } from './agents/energy-utilities-agent';
import { retailAgent } from './agents/retail-agent';

// Import shared components
import { mapDataAgent } from './shared';
import { sharedMemory } from './shared';

// Import utility agents (still needed for tools)
import { plannerAgent } from './agents/planner-agent';
import { summarizerAgent } from './agents/summarizer-agent';

export const mastra: Mastra = new Mastra({
  agents: {
    // New specialized agents
    urbanPlanningAgent,
    realEstateAgent,
    energyUtilitiesAgent,
    retailAgent,

    // Shared agents
    mapDataAgent,

    // Utility agents (required for tool functionality)
    plannerAgent,
    summarizerAgent,
  },
  storage: sharedMemory.storage,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
