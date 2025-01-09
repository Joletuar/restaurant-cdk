export class AppError extends Error {
  constructor(
    public message: string,
    public errors: any,
    public httpCode: number
  ) {
    super(message);

    this.name = 'AppError';
  }
}
