import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'https://hollyhop.cz',
      'http://hollyhop.cz',
      'https://otamat.w33.wedos.net',
      'http://localhost:3000',
      'http://localhost:4000'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  console.log("Backend starting with CORS enabled for hollyhop.cz...");
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
