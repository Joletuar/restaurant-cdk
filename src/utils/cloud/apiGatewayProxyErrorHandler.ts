import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

import { AppError } from '@src/errors/AppError';
import { InfraestructureError } from '@src/errors/InfraestructureError';
import { ServiceError } from '@src/errors/ServiceError';

export const apiGatewayProxyErrorHandler = (
  error: unknown
): APIGatewayProxyStructuredResultV2 => {
  const response: APIGatewayProxyStructuredResultV2 = {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Unexpected error, check logs.',
    }),
  };

  if (error instanceof AppError) {
    if (error instanceof InfraestructureError) {
      response.body = JSON.stringify({
        message: 'Error to perform process, check logs.',
      });

      response.statusCode = error.httpCode;
    }

    if (error instanceof ServiceError) {
      response.body = JSON.stringify({
        message: error.message,
        error: error.errors,
      });

      response.statusCode = error.httpCode;
    }
  }

  return response;
};
