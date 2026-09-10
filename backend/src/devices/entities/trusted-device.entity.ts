import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('trusted_devices')
export class TrustedDevice {
  @PrimaryGeneratedColumn()
  id: number;

  // 写入 JWT 的设备唯一标识（jti）
  @Index({ unique: true })
  @Column({ length: 36 })
  uuid: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // 用户可读的设备名称（登录时可自定义，默认从 UA 推断）
  @Column({ length: 100 })
  name: string;

  // 登录时是否勾选了“信任此设备”
  @Column({ default: false })
  trusted: boolean;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  // 浏览器/操作系统信息，仅用于展示与审计，不作为设备复用依据
  @Column({ length: 128, nullable: true })
  userAgent: string;

  // 客户端生成并持久保存的稳定设备标识（每浏览器实例唯一）。
  // 可信设备按 (userId, clientId) 复用记录，与 UA 无关，
  // 避免相同浏览器/UA 的多台设备共享同一条会话记录。
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  clientId: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  // 会话/设备过期时间（由登录时的 token 有效期决定）
  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  // 主动移除 / 退出登录后置位，JWT 校验时拒绝
  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
