import { DevicesService } from './devices.service';
import { TrustedDevice } from './entities/trusted-device.entity';

// 内存版 Repository mock，覆盖 createOnLogin 用到的查询接口
function createRepoMock() {
  const rows: TrustedDevice[] = [];
  let idSeq = 1;
  return {
    rows,
    create: (data: Partial<TrustedDevice>) => ({ ...data } as TrustedDevice),
    save: async (entity: TrustedDevice) => {
      if (!(entity as any).id) {
        (entity as any).id = idSeq++;
        rows.push(entity);
      }
      return entity;
    },
    createQueryBuilder: () => {
      const filters: Array<(d: TrustedDevice) => boolean> = [];
      const qb: any = {
        where: (_: string, p: any) => { filters.push((d) => d.userId === p.userId); return qb; },
        andWhere: (cond: string, p?: any) => {
          if (cond.includes('trusted')) filters.push((d) => d.trusted === p.trusted);
          else if (cond.includes('clientId')) filters.push((d) => d.clientId === p.clientId);
          else if (cond.includes('userAgent')) filters.push((d) => d.userAgent === p.ua);
          else if (cond.includes('revokedAt IS NULL')) filters.push((d) => !d.revokedAt);
          else if (cond.includes('expiresAt')) filters.push((d) => !d.expiresAt || d.expiresAt > p.now);
          return qb;
        },
        orderBy: () => qb,
        getOne: async () => rows.filter((d) => filters.every((f) => f(d)))[0] ?? null,
      };
      return qb;
    },
  };
}

const baseInput = {
  userId: 1,
  name: 'Chrome · Windows',
  trusted: true,
  ip: '1.1.1.1',
  userAgent: 'Mozilla/5.0 Chrome/120',
  ttlSeconds: 3600,
};

describe('DevicesService.createOnLogin', () => {
  it('相同 UA 但不同 clientId 的两台设备应生成两条独立记录、不同 uuid', async () => {
    const repo = createRepoMock();
    const service = new DevicesService(repo as any);

    const devA = await service.createOnLogin({ ...baseInput, clientId: 'device-A' });
    const devB = await service.createOnLogin({ ...baseInput, clientId: 'device-B' });

    expect(repo.rows).toHaveLength(2);
    expect(devA.uuid).not.toBe(devB.uuid);
  });

  it('同一 clientId 重复登录复用记录且轮换 uuid（旧 JWT 失效）', async () => {
    const repo = createRepoMock();
    const service = new DevicesService(repo as any);

    const first = await service.createOnLogin({ ...baseInput, clientId: 'device-A' });
    const firstUuid = first.uuid; // 先取快照：复用时同一记录会被原地轮换
    const second = await service.createOnLogin({ ...baseInput, clientId: 'device-A' });

    expect(repo.rows).toHaveLength(1);
    expect(second.uuid).not.toBe(firstUuid);
  });

  it('缺少 clientId 时即使 UA 相同也绝不复用记录', async () => {
    const repo = createRepoMock();
    const service = new DevicesService(repo as any);

    const a = await service.createOnLogin({ ...baseInput, clientId: null });
    const b = await service.createOnLogin({ ...baseInput, clientId: null });

    expect(repo.rows).toHaveLength(2);
    expect(a.uuid).not.toBe(b.uuid);
  });
});
