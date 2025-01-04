import { z } from 'zod';

export const getIngredientsEventSchema = z.object({
  ingredients: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().min(1),
    })
  ),
});

export interface GetIngredientsEvent
  extends z.infer<typeof getIngredientsEventSchema> {}
