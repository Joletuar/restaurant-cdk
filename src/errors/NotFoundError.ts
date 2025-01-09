import { StatusCodes } from 'http-status-codes';
import { ServiceError } from './ServiceError';

export class NotFoundError extends ServiceError {
  constructor(errors: any) {
    super('Resource not found', errors, StatusCodes.NOT_FOUND);

    this.name = 'NotFoundError';
  }
}
