// Swagger decorator for API documentation
import { ApiProperty } from '@nestjs/swagger';

// Used in health check endpoint in places health controller
export class HealthResponseDto {
  @ApiProperty({
    description:
      'Health status of the service - indicates if the service is operational',
    example: 'healthy',
  })
  status: string;

  @ApiProperty({
    description:
      'Timestamp of the health check in ISO format - when the health check was performed',
    example: '2024-08-13T10:30:00.000Z',
  })
  timestamp: string;
}