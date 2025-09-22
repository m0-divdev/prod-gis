import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDTO } from './dto/create-user.dto';

import { ConfigService } from '@nestjs/config';
import { Address, verifyMessage } from 'viem';
import { isAddress } from 'viem';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { SecurityUtil } from '../common/utils/security.util';
export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  userAgent?: string;
  ipAddress?: string;
}
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async getMessage(walletAddress: string) {
    try {
      // Determine if this is an EVM address
      const isEVMAddress: boolean = isAddress(walletAddress as Address);
      
      // Create secure cache key
      const cacheKey = this.cacheService.createAuthCacheKey(walletAddress, isEVMAddress);

      const data = await this.cacheService.getFromCache(cacheKey);

      if (data) {
        return data;
      } else {
        const nonce = SecurityUtil.generateNonce();
        const normalizedAddress = SecurityUtil.normalizeWalletAddress(walletAddress, isEVMAddress);
        const msg = `Welcome to Research3! Click to sign in.\n\nThis request will not trigger a blockchain transaction or cost any gas fees, it is just a way to verify your wallet address.\n\nWallet address: ${normalizedAddress} \nNonce: ${nonce}`;
        const item: { nonce: number; msg: string } = {
          nonce,
          msg,
        };
        await this.cacheService.addToCacheWithCustomTime(
          cacheKey,
          item,
          10, // 10 minutes
        );
        return { nonce, msg };
      }
    } catch (error) {
      console.error('Error in getMessage:', error);
      throw new BadRequestException('Failed to generate sign message');
    }
  }

  async login(dto: LoginDTO, requestInfo?: LoginRequest) {
    const { walletAddress, signature, message } = dto;

    const isEVMAddress: boolean = isAddress(walletAddress as Address);
    const normalizedAddress = SecurityUtil.normalizeWalletAddress(walletAddress, isEVMAddress);
    const cacheKey = this.cacheService.createAuthCacheKey(walletAddress, isEVMAddress);

    const data = await this.cacheService.getFromCache(cacheKey);

    if (!data) {
      throw new BadRequestException(
        'Authentication timeout - please get a new sign message',
      );
    }

    // Verify that the provided message matches the cached message
    if (message !== data.msg) {
      throw new BadRequestException(
        'Message mismatch - please use the correct message',
      );
    }

    let signatureValid: boolean;

    if (!isEVMAddress) {
      const encodedMessage = new TextEncoder().encode(message);
      const publicKey = new PublicKey(walletAddress);
      const publicKeyBytes = publicKey.toBytes();
      signatureValid = nacl.sign.detached.verify(
        encodedMessage,
        Buffer.from(signature, 'hex'),
        publicKeyBytes,
      );
    } else {
      signatureValid = await verifyMessage({
        address: walletAddress as Address,
        message: message,
        signature: signature as `0x${string}`,
      });
    }

    if (!signatureValid) throw new BadRequestException('Authentication Failed');

    await this.cacheService.deleteFromCache(cacheKey);

    const existingUser = await this.prisma.user.findUnique({
      where: {
        walletAddress: normalizedAddress,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingUser) {
      // Check if user account is active
      if (existingUser.status !== 'ACTIVE') {
        throw new UnauthorizedException(`User account is ${existingUser.status.toLowerCase()}`);
      }

      const tokens = await this.generateTokens({ userId: existingUser.id });

      // Generate device fingerprint for session tracking
      const deviceId = SecurityUtil.generateDeviceId(requestInfo?.userAgent, requestInfo?.ipAddress);
      const sanitizedUserAgent = SecurityUtil.sanitizeUserAgent(requestInfo?.userAgent);
      const ipAddress = requestInfo?.ipAddress && SecurityUtil.isValidIP(requestInfo.ipAddress) 
        ? requestInfo.ipAddress 
        : null;

      const refreshTokenExpiryDays = parseInt(
        this.configService.get<string>('REFRESH_TOKEN_EXPIRY_DAYS') || '7',
        10,
      );
      const expiresAt = new Date(
        Date.now() + refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
      );

      // Implement refresh token rotation - revoke all existing tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { 
          userId: existingUser.id,
          isRevoked: false,
        },
        data: { isRevoked: true },
      });

      // Create a new refresh token
      await this.prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          expiresAt,
          deviceId,
          userAgent: sanitizedUserAgent,
          ipAddress,
          updatedAt: new Date(),
          user: { connect: { id: existingUser.id } },
        },
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userId: existingUser.id,
      };
    } else {
      const createdUser = await this.prisma.user.create({
        data: {
          walletAddress: normalizedAddress,
          status: 'ACTIVE', // Default status for new users
          credits: {
            create: {
              availableCredits:
                parseFloat(
                  this.configService.get<string>('DEFAULT_USER_BALANCE') || '0',
                ) || 0,
            },
          },
        },
        select: { id: true },
      });

      if (!createdUser) {
        throw new BadRequestException('Unable to Create Profile.');
      }

      const tokens = await this.generateTokens({ userId: createdUser.id });
      
      // Generate device fingerprint for new user session
      const deviceId = SecurityUtil.generateDeviceId(requestInfo?.userAgent, requestInfo?.ipAddress);
      const sanitizedUserAgent = SecurityUtil.sanitizeUserAgent(requestInfo?.userAgent);
      const ipAddress = requestInfo?.ipAddress && SecurityUtil.isValidIP(requestInfo.ipAddress) 
        ? requestInfo.ipAddress 
        : null;

      const refreshTokenExpiryDays = parseInt(
        this.configService.get<string>('REFRESH_TOKEN_EXPIRY_DAYS') || '7',
        10,
      );
      const expiresAt = new Date(
        Date.now() + refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
      );

      await this.prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          expiresAt: expiresAt,
          deviceId,
          userAgent: sanitizedUserAgent,
          ipAddress,
          updatedAt: new Date(),
          user: { connect: { id: createdUser.id } },
        },
        select: { id: true },
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userId: createdUser.id,
      };
    }
  }

  async updateUserName(id: string, name: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { username: name },
      select: { id: true, username: true },
    });

    return user;
  }

  async generateToken(obj: any, expiresIn: string, secret: string) {
    // Validate JWT secret strength
    if (!SecurityUtil.validateJWTSecret(secret)) {
      throw new Error('JWT secret does not meet security requirements. Must be at least 32 characters with mixed case, numbers, and special characters.');
    }

    const { SignJWT } = await import('jose');
    return new SignJWT(obj)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(`${expiresIn}h`) // Set expiration time in hours
      .setIssuedAt()
      .setIssuer('research3-platform')
      .setAudience('research3-users')
      .sign(new TextEncoder().encode(secret));
  }

  async generateTokens(obj: object): Promise<Tokens> {
    const accessToken = await this.generateToken(
      obj,
      this.configService.get<string>('ACCESS_TOKEN_EXPIRY_HOURS') || '3',
      this.configService.getOrThrow<string>('JWT_SECRET'),
    );
    const refreshToken = await this.generateToken(
      obj,
      this.configService.get<string>('REFRESH_TOKEN_EXPIRY_DAYS') || '168', // 7 DAYS
      this.configService.getOrThrow<string>('JWT_SECRET'),
    );
    return { accessToken, refreshToken };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async getUserByRefreshToken(refreshToken: string) {
    try {
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!tokenRecord) {
        throw new NotFoundException('Invalid refresh token');
      }

      return tokenRecord.user;
    } catch (error) {
      console.error('Error getting user by refresh token:', error);
      throw new BadRequestException('Failed to get user');
    }
  }

  async refreshAccessToken(refreshToken: string, requestInfo?: LoginRequest) {
    try {
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!tokenRecord) {
        throw new NotFoundException('Invalid refresh token');
      }

      // Check if refresh token is revoked
      if (tokenRecord.isRevoked) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Check if refresh token is expired
      if (tokenRecord.expiresAt.getTime() < Date.now()) {
        // Mark as revoked since it's expired
        await this.prisma.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { isRevoked: true },
        });
        throw new UnauthorizedException('Refresh token has expired');
      }

      // Check if user account is still active
      if (tokenRecord.user.status !== 'ACTIVE') {
        throw new UnauthorizedException(`User account is ${tokenRecord.user.status.toLowerCase()}`);
      }

      // Update last used timestamp
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { lastUsed: new Date() },
      });

      // Generate new access token
      const accessTokenExpiry =
        this.configService.get<string>('ACCESS_TOKEN_EXPIRY_HOURS') || '3';
      const accessToken = await this.generateToken(
        { userId: tokenRecord.user.id },
        accessTokenExpiry,
        this.configService.getOrThrow<string>('JWT_SECRET'),
      );

      return {
        accessToken,
        user: {
          id: tokenRecord.user.id,
          walletAddress: tokenRecord.user.walletAddress,
          username: tokenRecord.user.username,
          status: tokenRecord.user.status,
        },
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new BadRequestException('Failed to refresh access token');
    }
  }

  async logout(refreshToken: string) {
    try {
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!tokenRecord) {
        throw new NotFoundException('Invalid refresh token');
      }

      // Mark the refresh token as revoked instead of deleting
      await this.prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { isRevoked: true },
      });

      return { message: 'Successfully logged out' };
    } catch (error) {
      console.error('Error during logout:', error);
      throw new BadRequestException('Failed to logout');
    }
  }

  /**
   * Logout from all devices - revokes all refresh tokens for a user
   */
  async logoutFromAllDevices(userId: string) {
    try {
      await this.prisma.refreshToken.updateMany({
        where: { 
          userId: userId,
          isRevoked: false,
        },
        data: { isRevoked: true },
      });

      return { message: 'Successfully logged out from all devices' };
    } catch (error) {
      console.error('Error during logout from all devices:', error);
      throw new BadRequestException('Failed to logout from all devices');
    }
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string) {
    try {
      const sessions = await this.prisma.refreshToken.findMany({
        where: {
          userId: userId,
          isRevoked: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          deviceId: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
          lastUsed: true,
          expiresAt: true,
        },
        orderBy: {
          lastUsed: 'desc',
        },
      });

      return sessions;
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw new BadRequestException('Failed to get active sessions');
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string) {
    try {
      const tokenRecord = await this.prisma.refreshToken.findFirst({
        where: {
          id: sessionId,
          userId: userId,
          isRevoked: false,
        },
      });

      if (!tokenRecord) {
        throw new NotFoundException('Session not found');
      }

      await this.prisma.refreshToken.update({
        where: { id: sessionId },
        data: { isRevoked: true },
      });

      return { message: 'Session revoked successfully' };
    } catch (error) {
      console.error('Error revoking session:', error);
      throw new BadRequestException('Failed to revoke session');
    }
  }
}
