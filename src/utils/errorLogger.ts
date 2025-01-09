import { Context } from 'aws-lambda';

import { AppError } from '@src/errors/AppError';

export const errorLogger = (error: unknown, context: Context) => {
  const format = {
    context: {
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      invokedFunctionArn: context.invokedFunctionArn,
      awsRequestId: context.awsRequestId,
    },
    error: {},
    timestamp: new Date().toISOString(),
  };

  if (error instanceof AppError) {
    format.error = {
      message: error.message,
      name: error.name,
      cause: JSON.stringify(error.errors, null, 2),
      stack: error.stack,
    };

    console.error(format);

    return;
  }

  format.error = {
    message: (error as Error).message,
    name: (error as Error).name,
    stack: (error as Error).stack,
  };

  console.error(format);
};
