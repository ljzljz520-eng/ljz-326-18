import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { DevicesService } from '../devices/devices.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { parseDeviceName, getClientIp, fingerprint } from './utils/device.util';

// 可信设备 30 天免登录；普通会话 12 小时
const TRUSTED_TTL_SECONDS = 30 * 24 * 60 * 60;
const SESSION_TTL_SECONDS = 12 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private devicesService: DevicesService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async register(createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const { password: _, ...result } = user;
    return {
      message: '注册成功，请查收邮件验证您的账户',
      user: result,
    };
  }

  async login(loginDto: LoginDto, req?: any) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    await this.usersService.updateLastLogin(user.id);

    const trusted = !!loginDto.rememberMe;
    const userAgent = fingerprint(req?.headers?.['user-agent'] || 'unknown');
    const defaultName = parseDeviceName(req?.headers?.['user-agent'] || '');
    const deviceName =
      trusted && loginDto.deviceName?.trim()
        ? loginDto.deviceName.trim().slice(0, 100)
        : defaultName;
    const ip = getClientIp(req);
    const ttlSeconds = trusted ? TRUSTED_TTL_SECONDS : SESSION_TTL_SECONDS;

    // 创建设备会话（可信设备同一浏览器会复用原记录）
    const device = await this.devicesService.createOnLogin({
      userId: user.id,
      name: deviceName,
      trusted,
      ip,
      userAgent,
      ttlSeconds,
    });

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      did: device.uuid,
    };

    return {
      message: '登录成功',
      accessToken: this.jwtService.sign(payload, { expiresIn: ttlSeconds }),
      trusted,
      deviceUuid: device.uuid,
      expiresIn: ttlSeconds,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        minecraftUsername: user.minecraftUsername,
        avatar: user.avatar,
      },
    };
  }

  /**
   * 退出登录
   * - current：仅作废当前设备的会话
   * - all：作废该账户所有设备会话
   */
  async logout(userId: number, deviceUuid: string | undefined, scope: 'current' | 'all') {
    if (scope === 'all') {
      await this.devicesService.revokeAllForUser(userId);
    } else {
      await this.devicesService.revokeByUuid(deviceUuid || '');
    }
    return { message: scope === 'all' ? '已退出全部设备' : '已退出当前设备' };
  }

  async verifyEmail(token: string) {
    const result = await this.usersService.verifyEmail(token);
    if (!result) {
      throw new BadRequestException('无效的验证链接');
    }
    return { message: '邮箱验证成功' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const token = await this.usersService.createPasswordResetToken(
      forgotPasswordDto.email,
    );
    if (token) {
      // 这里可以集成邮件发送服务
      // 目前仅返回token用于测试
      return {
        message: '密码重置链接已发送到您的邮箱',
        // 仅用于测试，生产环境应该发送邮件
        resetToken: token,
      };
    }
    // 即使邮箱不存在也返回相同信息，防止枚举攻击
    return { message: '如果邮箱存在，密码重置链接已发送' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const result = await this.usersService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
    if (!result) {
      throw new BadRequestException('重置链接无效或已过期');
    }
    return { message: '密码重置成功' };
  }
}
