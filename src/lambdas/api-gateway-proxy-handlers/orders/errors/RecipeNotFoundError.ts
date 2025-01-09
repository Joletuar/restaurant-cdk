import { NotFoundError } from '@src/errors/NotFoundError';

export class RecipeNotFoundError extends NotFoundError {
  constructor(param: string) {
    super(`The recipe <${param}> is not found`);

    this.name = 'RecipeNotFoundError';
  }
}
