import {
  Injectable,
  Logger,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityUtil } from '../common/utils/security.util';

// Extend Express Request type
declare module 'express' {
  interface Request {
    user?: string;
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const tokenInitial = req.headers['authorization'];
      if (!tokenInitial || typeof tokenInitial !== 'string') {
        throw new UnauthorizedException('Authorization token is missing');
      }

      // Properly extract the token
      const tokenParts = tokenInitial.split(' ');
      if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        throw new UnauthorizedException(
          'Invalid authorization format. Use Bearer token',
        );
      }

      const tokenFinal = tokenParts[1];

      // Special handling for test environment or dummy token
      // const nodeEnv = this.configService.get<string>('NODE_ENV');
      // const dummyToken = this.configService.get<string>('DUMMY_TOKEN');
      // const dummyUser = this.configService.get<string>('DUMMY_USER_ID');
      // if ((nodeEnv === 'test' || tokenFinal === dummyToken) && dummyUser) {
      //     // bypass real JWT verification
      //     req.user = dummyUser;
      //     return next();
      // }

      // Verify JWT using jose
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        this.logger.error('JWT secret is not defined in environment variables');
        throw new UnauthorizedException('Authentication configuration error');
      }

      // Validate JWT secret strength
      if (!SecurityUtil.validateJWTSecret(secret)) {
        this.logger.error('JWT secret does not meet security requirements');
        throw new UnauthorizedException('Authentication configuration error');
      }

      let verified: any;
      try {
        const { jwtVerify } = await import('jose');
        verified = await jwtVerify(
          tokenFinal,
          new TextEncoder().encode(secret),
          {
            maxTokenAge: '3h', // Validate token age
            algorithms: ['HS256'], // Only allow specific algorithms
            issuer: 'research3-platform', // Validate issuer
            audience: 'research3-users', // Validate audience
          },
        );
      } catch (error) {
        this.logger.warn(`JWT verification failed: ${error.message}`);
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Validate token payload
      if (!verified.payload || !verified.payload.userId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Check if user exists and is active
      const user = await this.prisma.user.findUnique({
        where: {
          id: verified.payload.userId as string,
        },
        select: {
          id: true,
          walletAddress: true,
          username: true,
          status: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if user account is active
      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException(`User account is ${user.status.toLowerCase()}`);
      }

      // Set the user ID on the request object
      req.user = user.id;

      // Set comprehensive security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log unexpected errors but don't expose details to client
      this.logger.error(`Authentication error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
