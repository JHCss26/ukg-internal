import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { setupSwagger } from './core/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  app.enableCors({ origin: true, credentials: true });

  const prefix = (process.env.API_PREFIX || 'api/v1').replace(/^\/+|\/+$/g, ''); // trim slashes
  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  setupSwagger(app);

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log('EMP_API_KEY:', process.env.EMP_API_KEY);
  logger.log(`ukg-internal up at http://localhost:${port}/${prefix}`);
}
bootstrap();
