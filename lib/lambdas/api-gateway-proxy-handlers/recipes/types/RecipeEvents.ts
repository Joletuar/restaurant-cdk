import { z } from 'zod';

export const createRecipeApiProxyEventSchema = z.object({
  name: z.string().nonempty(),
  ingredients: z.array(z.string().nonempty()),
});

export type CreateRecipeApiProxyEvent = z.infer<
  typeof createRecipeApiProxyEventSchema
>;
