import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true });

  app.use((req: Request, res: Response, next: NextFunction) => {
    // console.log('Request URL:', req.url);
    // console.log('Request Body:', req.body); 
    next();
  });

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
  console.log("Backend starting with CORS enabled for hollyhop.cz... VERSION: FIX_LOGIN_V6");
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
