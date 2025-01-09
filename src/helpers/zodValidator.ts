import { z } from 'zod';

import { ZodError } from '@src/errors/ZodError';

export const zodValidator = <T>(data: string | undefined, schema: z.Schema) => {
  let parsedData: unknown;

  if (
    typeof data === 'undefined' ||
    data === null ||
    typeof data === 'string'
  ) {
    parsedData = JSON.parse(data ?? '{}');
  } else {
    parsedData = data;
  }

  const { success, data: validatedData, error } = schema.safeParse(parsedData);

  if (!success) {
    throw new ZodError(error);
  }

  return validatedData as T;
};
