import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateDeviceDto {
  @ApiProperty({ description: '设备名称', example: '我的电脑' })
  @IsNotEmpty({ message: '设备名称不能为空' })
  @IsString()
  @MaxLength(100, { message: '设备名称最长 100 个字符' })
  name: string;
}
