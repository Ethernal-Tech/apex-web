import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './src/app.module';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

async function generateSwagger() {
    const app = await NestFactory.create(AppModule);

    const config = new DocumentBuilder()
        .setTitle('Web API')
        .setVersion('1.0')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    const yamlPath = join(__dirname, '../../apex-bridge/docs/web-api/swagger.yaml');
    writeFileSync(yamlPath, yaml.dump(document));

    await app.close();
}

generateSwagger();