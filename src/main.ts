import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';


async function bootstrap() {
 const app = await NestFactory.create(AppModule, { cors: true });
 
  // swagger setup
  const config = new DocumentBuilder()
  .setTitle("Contact Crud in nestjs")
  .setDescription("Api Description")
  .setVersion('1.0')
  .addTag('api')
  .addBearerAuth(
    {
      description: `Please enter token in following format: Bearer <JWT>`,
      name: 'Authorization',
      bearerFormat: 'Bearer',
      scheme: 'Bearer',
      type: 'http', 
      in: 'Header'
    },
    'access-token',
  )
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document, {
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
  ],
  customCssUrl: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css',
  ],
});
  app.useGlobalPipes(new ValidationPipe());
const corsOptions: CorsOptions = {
    origin: ['https://blog-next-js-ruby-gamma.vercel.app', "http://localhost:3000"],
   
    methods:  ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
  };
  // Enable CORS with options
  app.enableCors(corsOptions);
 
  await app.listen(3001);
}
bootstrap();
