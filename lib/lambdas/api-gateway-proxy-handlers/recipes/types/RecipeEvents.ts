import { z } from 'zod';

export const createRecipeApiProxyEventSchema = z.object({
  name: z.string().nonempty(),
  ingredients: z.array(
    z.object({
      id: z.string().uuid(),
      quantity: z.number().min(1),
    })
  ),
});

export type CreateRecipeApiProxyEvent = z.infer<
  typeof createRecipeApiProxyEventSchema
>;
