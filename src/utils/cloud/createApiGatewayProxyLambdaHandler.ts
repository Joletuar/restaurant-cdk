import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  Context,
} from 'aws-lambda';
import { HttResponse } from '../http/HttpResponse';

import { errorLogger } from '../errorLogger';
import { apiGatewayProxyErrorHandler } from './apiGatewayProxyErrorHandler';

export type ApiProxyProcessor = (
  event: APIGatewayProxyEventV2,
  context: Context
) => Promise<HttResponse> | HttResponse;

export const createApiGatewayProxyLambdaHandler =
  (params: { processor: ApiProxyProcessor }): APIGatewayProxyHandlerV2 =>
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
