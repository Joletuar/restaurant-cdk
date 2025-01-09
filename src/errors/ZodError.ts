import { z } from 'zod';

import { ServiceError } from './ServiceError';

export class ZodError extends ServiceError {
  constructor(errors: z.ZodError) {
    const { _errors, ...rest } = errors.format();

    super('Validation Errors', rest, 400);

    this.name = 'ZodError';
  }
}
