import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomCacheModule } from '../cache/cache.module';

@Module({
  imports: [PrismaModule, CustomCacheModule],
  controllers: [HealthController],
})
export class HealthModule {}
