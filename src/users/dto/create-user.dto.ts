import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export enum EConnectionType {
  EVM = 'evm',
  SOLANA = 'solana',
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Wallet address',
    example: '0x1234567890123456789012345678901234567890',
    required: true,
  })
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Sign message',
    example: '0x189284105974350948335031823419874859483685449504957',
    required: true,
  })
  signMessage: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Message',
    example: 'Welcome to the Platform',
    required: true,
  })
  message: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Type of connection',
    example: 'evm',
    required: true,
  })
  type: EConnectionType;
}

export class GetMessageDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Wallet address',
    example: '0x1234567890123456789012345678901234567890',
    required: true,
  })
  walletAddress: string;
}

export class LoginDTO {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Wallet address',
    example: '0x1234567890123456789012345678901234567890',
    required: true,
  })
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Cryptographic signature for verification',
    example: '0x189284105974350948335031823419874859483685449504957',
    required: true,
  })
  signature: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Original message that was signed',
    example: 'Welcome to Research3! Click to sign in...',
    required: true,
  })
  message: string;
}
