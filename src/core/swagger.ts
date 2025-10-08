import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const cfg = new DocumentBuilder()
    .setTitle('UKG Internal API')
    .setDescription('API docs for ukg-internal')
    .setVersion('1.0.0')
    .build();

  const doc = SwaggerModule.createDocument(app, cfg);

  SwaggerModule.setup('docs', app, doc, {
    // This makes Swagger follow your global prefix => /api/v1/docs
    useGlobalPrefix: true,
    // So JSON will be at /api/v1/docs/json
    jsonDocumentUrl: 'docs/json',
    // swaggerOptions: { persistAuthorization: true },
    customfavIcon: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/favicon-32x32.png',
    customSiteTitle: 'UKG Internal API',
  });
}
