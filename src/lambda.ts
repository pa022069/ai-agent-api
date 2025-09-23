import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { createServer, proxy } from 'aws-serverless-express';
import { eventContext } from 'aws-serverless-express/middleware';
import * as express from 'express';

let cachedServer: any;

async function createNestServer(expressApp: express.Application) {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.use(eventContext());
  app.enableCors();

  return app.init();
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (!cachedServer) {
    const expressApp = express();
    await createNestServer(expressApp);
    cachedServer = createServer(expressApp);
  }

  return proxy(cachedServer, event, context, 'PROMISE').promise;
};
