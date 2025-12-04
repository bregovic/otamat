import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

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
      'http://localhost:4000'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  console.log("Backend starting with CORS enabled for hollyhop.cz... VERSION: FIX_IMAGES_V3");
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
