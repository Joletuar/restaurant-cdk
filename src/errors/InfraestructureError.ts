import { AppError } from './AppError';

export class InfraestructureError extends AppError {
  constructor(message: string, errors: any) {
    super(message, errors, 500);

    this.name = 'InfraestructureError';
  }
}
