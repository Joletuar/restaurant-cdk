import { z } from 'zod';

import { OrderStatus } from '@src/types/Order';

export const createdOrderEventSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(OrderStatus),
  recipeId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export interface CreatedOrderEvent
  extends z.infer<typeof createdOrderEventSchema> {}

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.nativeEnum(OrderStatus),
});

export interface UpdateOrderStatusEvent
  extends z.infer<typeof updateOrderStatusSchema> {}
