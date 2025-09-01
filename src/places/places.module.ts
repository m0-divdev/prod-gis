import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
// Removed unused controllers - only unified chat endpoint needed
import { OrchestratorService } from './services/orchestrator.service';
import { MapDataService } from './services/map-data.service';
import { QueryRouterService } from './services/query-router.service';
import { ToolProxyService } from './services/tool-proxy.service';

@Module({
  controllers: [
    PlacesController,
  ],
  providers: [
    PlacesService,
    OrchestratorService,
    MapDataService,
    QueryRouterService,
    ToolProxyService,
  ],
  exports: [
    PlacesService,
    OrchestratorService,
    MapDataService,
    QueryRouterService,
    ToolProxyService,
  ],
})
export class PlacesModule {}
