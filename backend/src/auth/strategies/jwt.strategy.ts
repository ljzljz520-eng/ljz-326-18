import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DevicesService } from '../../devices/devices.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private devicesService: DevicesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'minecraft_jwt_secret'),
    });
  }

  async validate(payload: any) {
    // 新版本 token 绑定设备：设备被移除或退出后立即失效
    if (payload.did) {
      const device = await this.devicesService.validateActiveDevice(payload.did);
      if (!device) {
        throw new UnauthorizedException('登录已失效，请重新登录');
      }
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        deviceUuid: payload.did,
        deviceId: device.id,
      };
    }

    // 兼容升级前签发的旧 token
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
