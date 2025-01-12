import { Base } from './Base';

export interface Purchase extends Base {
  purchasedQuantity: number;
  ingredientId: string;
}
