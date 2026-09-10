import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TrustedDevice } from './entities/trusted-device.entity';

export interface CreateDeviceInput {
  userId: number;
  name: string;
  trusted: boolean;
  ip: string | null;
  userAgent: string;
  // 客户端生成并持久保存的稳定设备标识；为空时一律新建会话记录
  clientId?: string | null;
  ttlSeconds: number;
}

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(TrustedDevice)
    private devicesRepository: Repository<TrustedDevice>,
  ) {}

  /**
   * 登录时创建（或复用）一个设备会话。
   * 仅在客户端提供了稳定设备标识（clientId）且勾选“信任此设备”时，
   * 才按 (userId, clientId) 复用记录，避免设备列表因反复登录而膨胀。
   * 复用时会轮换 uuid（旧 JWT 立即失效）；绝不按 User-Agent 复用，
   * 否则相同浏览器/UA 的多台设备会共享同一条会话记录，
   * 导致移除/退出其中一台时另一台被一并强制下线。
   */
  async createOnLogin(input: CreateDeviceInput): Promise<TrustedDevice> {
    const now = new Date();

    if (input.trusted && input.clientId) {
      const existing = await this.devicesRepository
        .createQueryBuilder('d')
        .where('d.userId = :userId', { userId: input.userId })
        .andWhere('d.trusted = :trusted', { trusted: true })
        .andWhere('d.clientId = :clientId', { clientId: input.clientId })
        .andWhere('d.revokedAt IS NULL')
        .andWhere('(d.expiresAt IS NULL OR d.expiresAt > :now)', { now })
        .orderBy('d.lastLoginAt', 'DESC')
        .getOne();

      if (existing) {
        // 轮换会话标识：旧 JWT 的 did 立即失效，仅本次登录签发的新令牌可用
        existing.uuid = uuidv4();
        existing.name = input.name;
        existing.ip = input.ip;
        existing.userAgent = input.userAgent;
        existing.lastLoginAt = now;
        existing.expiresAt = new Date(now.getTime() + input.ttlSeconds * 1000);
        return this.devicesRepository.save(existing);
      }
    }

    const device = this.devicesRepository.create({
      uuid: uuidv4(),
      userId: input.userId,
      name: input.name,
      trusted: input.trusted,
      ip: input.ip,
      userAgent: input.userAgent,
      clientId: input.clientId ?? null,
      lastLoginAt: now,
      expiresAt: new Date(now.getTime() + input.ttlSeconds * 1000),
      revokedAt: null,
    });

    return this.devicesRepository.save(device);
  }

  /** JWT 校验时调用：设备必须存在、未被移除、未过期 */
  async validateActiveDevice(uuid: string): Promise<TrustedDevice | null> {
    if (!uuid) return null;
    const device = await this.devicesRepository.findOne({ where: { uuid } });
    if (!device || device.revokedAt) return null;
    if (device.expiresAt && device.expiresAt <= new Date()) return null;
    return device;
  }

  /** 当前用户的有效设备列表（未移除且未过期） */
  async findActiveByUser(userId: number): Promise<TrustedDevice[]> {
    const now = new Date();
    return this.devicesRepository
      .createQueryBuilder('d')
      .where('d.userId = :userId', { userId })
      .andWhere('d.revokedAt IS NULL')
      .andWhere('(d.expiresAt IS NULL OR d.expiresAt > :now)', { now })
      .orderBy('d.lastLoginAt', 'DESC')
      .getMany();
  }

  /** 管理员：查看所有设备（含已移除/已过期的历史记录） */
  async findAll(): Promise<TrustedDevice[]> {
    return this.devicesRepository.find({
      relations: ['user'],
      order: { lastLoginAt: 'DESC' },
      take: 500,
    });
  }

  /** 管理员：查看指定用户的设备 */
  async findByUser(userId: number): Promise<TrustedDevice[]> {
    return this.devicesRepository.find({
      where: { userId },
      order: { lastLoginAt: 'DESC' },
    });
  }

  /** 玩家主动移除自己的设备（立即失效对应会话） */
  async revokeForUser(userId: number, deviceId: number): Promise<void> {
    const device = await this.devicesRepository.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('设备不存在');
    }
    if (device.userId !== userId) {
      throw new ForbiddenException('无权移除此设备');
    }
    if (!device.revokedAt) {
      device.revokedAt = new Date();
      await this.devicesRepository.save(device);
    }
  }

  /** 管理员移除任意设备 */
  async revokeAsAdmin(deviceId: number): Promise<void> {
    const device = await this.devicesRepository.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('设备不存在');
    }
    if (!device.revokedAt) {
      device.revokedAt = new Date();
      await this.devicesRepository.save(device);
    }
  }

  /** 玩家重命名自己的设备 */
  async renameForUser(userId: number, deviceId: number, name: string): Promise<TrustedDevice> {
    const device = await this.devicesRepository.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('设备不存在');
    }
    if (device.userId !== userId) {
      throw new ForbiddenException('无权修改此设备');
    }
    device.name = name;
    return this.devicesRepository.save(device);
  }

  /** 退出登录：仅当前设备 */
  async revokeByUuid(uuid: string): Promise<void> {
    if (!uuid) return;
    const device = await this.devicesRepository.findOne({ where: { uuid } });
    if (device && !device.revokedAt) {
      device.revokedAt = new Date();
      await this.devicesRepository.save(device);
    }
  }

  /** 退出登录：该用户全部有效设备 */
  async revokeAllForUser(userId: number): Promise<void> {
    await this.devicesRepository
      .createQueryBuilder()
      .update(TrustedDevice)
      .set({ revokedAt: () => 'CURRENT_TIMESTAMP' })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .execute();
  }
}
