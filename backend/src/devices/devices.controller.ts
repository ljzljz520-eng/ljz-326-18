import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TrustedDevice } from './entities/trusted-device.entity';

function serializeDevice(device: TrustedDevice, currentUuid?: string) {
  return {
    id: device.id,
    name: device.name,
    trusted: device.trusted,
    ip: device.ip,
    lastLoginAt: device.lastLoginAt,
    expiresAt: device.expiresAt,
    createdAt: device.createdAt,
    revokedAt: device.revokedAt,
    isCurrent: currentUuid ? device.uuid === currentUuid : false,
    user: device.user
      ? {
          id: device.user.id,
          username: device.user.username,
          email: device.user.email,
        }
      : undefined,
  };
}

@ApiTags('设备管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  // ========== 管理员接口（需在 :id 路由之前注册，避免路径参数抢先匹配） ==========

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取全部设备（管理员）' })
  async listAll() {
    const devices = await this.devicesService.findAll();
    return devices.map((d) => serializeDevice(d));
  }

  @Get('admin/users/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取指定用户的设备（管理员）' })
  async listByUser(@Param('userId', ParseIntPipe) userId: number) {
    const devices = await this.devicesService.findByUser(userId);
    return devices.map((d) => serializeDevice(d));
  }

  @Delete('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '移除任意设备（管理员）' })
  async removeAsAdmin(@Param('id', ParseIntPipe) id: number) {
    await this.devicesService.revokeAsAdmin(id);
    return { message: '设备已移除' };
  }

  // ========== 玩家接口 ==========

  @Get()
  @ApiOperation({ summary: '获取当前账户的可信设备列表' })
  async list(@Request() req: any) {
    const devices = await this.devicesService.findActiveByUser(req.user.id);
    return devices.map((d) => serializeDevice(d, req.user.deviceUuid));
  }

  @Patch(':id')
  @ApiOperation({ summary: '重命名自己的设备' })
  async rename(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeviceDto,
  ) {
    const device = await this.devicesService.renameForUser(req.user.id, id, dto.name.trim());
    return serializeDevice(device, req.user.deviceUuid);
  }

  @Delete(':id')
  @ApiOperation({ summary: '移除（下线）自己的一台设备' })
  async remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.devicesService.revokeForUser(req.user.id, id);
    return { message: '设备已移除' };
  }
}
