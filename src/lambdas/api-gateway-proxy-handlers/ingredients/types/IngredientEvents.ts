import { z } from 'zod';

export const createIngredientEventSchema = z.object({
  name: z.string().min(3),
  stock: z.number().min(1),
});

export interface CreateIngredientEvent
  extends z.infer<typeof createIngredientEventSchema> {}
