import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthMiddleware } from './auth.middleware';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [AuthMiddleware, PrismaService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 🚧 DEVELOPMENT MODE: Authentication middleware is commented out
    // 📝 To enable authentication, uncomment the code below:
    
    /*
    consumer
      .apply(AuthMiddleware)
      .exclude(
        // Health check endpoints - no auth required
        { path: '/api/health', method: RequestMethod.GET },
        
        // Authentication endpoints - no auth required  
        {
          path: '/api/user/sign-message',
          method: RequestMethod.GET,
        },
        {
          path: '/api/user/login',
          method: RequestMethod.POST,
        },
        {
          path: '/api/user/refresh-token',
          method: RequestMethod.POST,
        },
        {
          path: '/api/user/logout',
          method: RequestMethod.POST,
        },
        {
          path: '/api/user/get-user-by-refresh-token',
          method: RequestMethod.GET,
        },
      )
      .forRoutes('*');
    */
    
    // 🔧 Development note: All routes are currently accessible without authentication
    // 🔐 When ready for production, uncomment the middleware configuration above
  }
}
