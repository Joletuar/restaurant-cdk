import { Base } from './Base';

export interface Recipe extends Base {
  name: string;
  ingredients: { id: string; quantity: number }[];
}
