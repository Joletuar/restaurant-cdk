import { Base } from './Base';

export interface Ingredient extends Base {
  name: string;

  stock: number;
}
