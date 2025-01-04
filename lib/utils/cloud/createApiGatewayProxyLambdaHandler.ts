import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  Context,
} from 'aws-lambda';
import { HttResponse } from '../http/HttpResponse';

import { errorLogger } from '../errorLogger';
import { apiGatewayProxyErrorHandler } from './apiGatewayProxyErrorHandler';

export const createApiGatewayProxyLambdaHandler =
  (params: {
    processor: (
      event: APIGatewayProxyEventV2,
      context: Context
    ) => Promise<HttResponse> | HttResponse;
  }): APIGatewayProxyHandlerV2 =>
  async (event, context) => {
    const { processor } = params;

    try {
      const result = await processor(event, context);

      return {
        statusCode: result.statusCode,
        body: result?.body,
        headers: result?.headers,
      };
    } catch (error) {
      errorLogger(error, context);

      return apiGatewayProxyErrorHandler(error);
    }
  };
