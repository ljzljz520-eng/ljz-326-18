import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    description: '退出范围：current=仅当前设备，all=全部设备',
    enum: ['current', 'all'],
    default: 'current',
  })
  @IsOptional()
  @IsIn(['current', 'all'])
  scope?: 'current' | 'all';
}
