import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.enableCors({
    origin: [
      'https://hollyhop.cz',
      'http://hollyhop.cz',
      'https://www.hollyhop.cz',
      'http://www.hollyhop.cz',
      'https://otamat.w33.wedos.net',
      'http://localhost:3000',
      'http://localhost:4000',
      'https://otamat-production.up.railway.app'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  console.log("Backend starting with CORS enabled... VERSION: DEBUG_WSS_FIX (Time: " + new Date().toISOString() + ")");
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
