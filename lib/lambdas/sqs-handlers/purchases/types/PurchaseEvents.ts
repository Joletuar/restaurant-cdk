import { z } from 'zod';

export const purchaseIngredientsEventSchema = z.object({
  orderId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  ingredientName: z.string().min(1),
  requiredQuantity: z.number().min(1),
});

export interface PurchaseIngredientsEvent
  extends z.infer<typeof purchaseIngredientsEventSchema> {}
