import { z } from 'zod';

export const getIngredientsEventSchema = z.object({
  orderId: z.string().uuid(),
  ingredients: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().min(1),
    })
  ),
});

export interface GetIngredientsEvent
  extends z.infer<typeof getIngredientsEventSchema> {}

export const replenishStockIngredientSchema = z.object({
  orderId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  ingredientName: z.string().min(1),
  purchasedQuantity: z.number().min(1),
  requiredQuantity: z.number().min(1),
});

export interface ReplenishIngredientStockEvent
  extends z.infer<typeof replenishStockIngredientSchema> {}
