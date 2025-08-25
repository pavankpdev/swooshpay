/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;

  const config = new DocumentBuilder()
    .setTitle('Swoosh Pay Internal REST API')
    .setDescription(
      'A plug-and-play checkout solution for SaaS/eCommerce apps offering address, coupon, payment, and analytics tools.'
    )
    .setVersion('1.0')
    .addTag('docs')
    .addTag('internal')
    .addServer('https://api.swooshpay.com', 'Production server')
    .addServer('https://staging.swooshpay.com', 'Staging server')
    .addServer('http://localhost:3000', 'Local dev')
    .addGlobalResponse({
      status: 500,
      description: 'Internal Server Error',
    })
    .addGlobalResponse({
      status: 401,
      description: 'Unauthorized',
    })
    .addGlobalResponse({
      status: 403,
      description: 'Forbidden',
    })
    .build();

  const options: SwaggerDocumentOptions = {
    // To make sure that the library generates operation names like createUser instead of UsersController_createUser
    // Usefull when the spec used by a codegen tool such as Orval.
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  };
  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, options);

  SwaggerModule.setup('docs', app, documentFactory);
  SwaggerModule.setup('docs-json', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
  });

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
