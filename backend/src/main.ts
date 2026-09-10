import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createLogger, format, transports } from 'winston';

async function bootstrap() {
  const logger = createLogger({
    level: 'info',
    format: format.combine(
      format.timestamp(),
      format.json(),
    ),
    transports: [
      new transports.Console(),
    ],
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // 客户端真实 IP 解析（X-Forwarded-For）：
  // 绝不能无条件信任代理头，否则客户端可伪造 X-Forwarded-For 污染审计日志。
  // 通过 TRUST_PROXY 环境变量显式声明受信代理：
  //   - 未设置：不信任任何代理头，直接使用 TCP 连接对端地址（fail-closed）
  //   - 数字（如 "1"）：信任的代理跳数
  //   - 逗号分隔的 IP/CIDR（如 "127.0.0.1,10.0.0.0/8"）：仅信任来自这些地址的代理头
  const trustProxyEnv = process.env.TRUST_PROXY?.trim();
  if (trustProxyEnv) {
    const hops = Number(trustProxyEnv);
    app.set(
      'trust proxy',
      Number.isNaN(hops)
        ? trustProxyEnv.split(',').map((s) => s.trim()).filter(Boolean)
        : hops,
    );
  } else {
    app.set('trust proxy', false);
  }

  // 启用CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger API文档配置
  const config = new DocumentBuilder()
    .setTitle('Minecraft Server API')
    .setDescription('Minecraft服务器官方网站API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 8000;
  await app.listen(port);
  logger.info(`Application is running on: http://localhost:${port}`);
  logger.info(`Swagger docs available at: http://localhost:${port}/docs`);
}
bootstrap();
