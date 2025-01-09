import { AppError } from './AppError';

export class ServiceError extends AppError {
  constructor(message: string, errors: any, httpCode: number) {
    super(message, errors, httpCode);

    this.name = 'ServiceError';
  }
}
