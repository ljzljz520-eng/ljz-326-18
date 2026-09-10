import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '邮箱', example: 'player@example.com' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({ description: '密码', example: 'Password123!' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: '信任此设备（30天内免登录）' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiPropertyOptional({ description: '自定义设备名称（勾选信任设备时生效）', example: '我的游戏电脑' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;

  @ApiPropertyOptional({ description: '客户端生成并持久保存的稳定设备标识（用于可信设备记录复用）' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientDeviceId?: string;
}
