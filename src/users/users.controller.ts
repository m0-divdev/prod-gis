import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

import { CreateUserDto, GetMessageDto, LoginDTO } from './dto/create-user.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiBearerAuth()
@ApiTags('users')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get sign message' })
  @ApiOkResponse({ description: 'Sign message' })
  // 🚧 DEV MODE: Rate limiting commented out
  // @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Get('sign-message')
  signMessage(@Query() query: GetMessageDto) {
    const { walletAddress } = query;
    return this.usersService.getMessage(walletAddress);
  }

  @ApiOperation({ summary: 'Register a new user' })
  @ApiOkResponse({ description: 'User registered successfully' })
  // 🚧 DEV MODE: Rate limiting commented out
  // @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 login attempts per minute
  @Post('/login')
  async login(@Body() dto: LoginDTO, @Req() req: Request) {
    const requestInfo = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
    };
    
    const response = await this.usersService.login(dto, requestInfo);
    console.log('Response: ', response);
    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      userId: response.userId,
    };
  }

  @ApiOperation({ summary: 'Get User Details' })
  @ApiOkResponse({ description: 'Get user Details based on user ID' })
  @Get('/get-user/:id')
  async getUser(@Param('id') id: string) {
    return await this.usersService.getUser(id);
  }

  @ApiOperation({ summary: 'Update User Name by ID' })
  @ApiOkResponse({ description: 'User name updated successfully' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({
    description: 'New name for the user',
    type: String,
    examples: { name: { value: 'Shrey' } },
  })
  @Patch('/update-name/:id')
  async updateUserName(@Param('id') id: string, @Body('name') name: string) {
    return await this.usersService.updateUserName(id, name);
  }

  @ApiOperation({ summary: 'Get User Details by Refresh Token' })
  @ApiOkResponse({ description: 'Get user Details based on refresh token' })
  @Get('/get-user-by-refresh-token')
  async getUserByRefreshToken(@Query('refreshToken') refreshToken: string) {
    return await this.usersService.getUserByRefreshToken(refreshToken);
  }

  @ApiOperation({ summary: 'Refresh Access Token' })
  @ApiOkResponse({
    description: 'Generate new access token using refresh token',
  })
  // 🚧 DEV MODE: Rate limiting commented out
  // @Throttle({ medium: { limit: 10, ttl: 60000 } }) // 10 refresh attempts per minute
  @Post('/refresh-token')
  async refreshToken(@Body('refreshToken') refreshToken: string, @Req() req: Request) {
    const requestInfo = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
    };
    
    return await this.usersService.refreshAccessToken(refreshToken, requestInfo);
  }

  @ApiOperation({ summary: 'Logout User' })
  @ApiOkResponse({ description: 'Invalidate refresh token and logout user' })
  @Post('/logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    return await this.usersService.logout(refreshToken);
  }

  @ApiOperation({ summary: 'Logout from All Devices' })
  @ApiOkResponse({ description: 'Invalidate all refresh tokens for user' })
  @Post('/logout-all/:userId')
  async logoutFromAllDevices(@Param('userId') userId: string) {
    return await this.usersService.logoutFromAllDevices(userId);
  }

  @ApiOperation({ summary: 'Get Active Sessions' })
  @ApiOkResponse({ description: 'Get all active sessions for user' })
  @Get('/sessions/:userId')
  async getActiveSessions(@Param('userId') userId: string) {
    return await this.usersService.getActiveSessions(userId);
  }

  @ApiOperation({ summary: 'Revoke Session' })
  @ApiOkResponse({ description: 'Revoke a specific session' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to revoke' })
  @Post('/revoke-session/:userId/:sessionId')
  async revokeSession(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return await this.usersService.revokeSession(userId, sessionId);
  }
}
