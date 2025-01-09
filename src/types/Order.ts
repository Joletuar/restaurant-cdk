import { Base } from './Base';

export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  COMPLETE = 'completed',
}

export interface Order extends Base {
  recipeId: string;
  status: OrderStatus;
}
