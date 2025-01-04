import { z } from 'zod';

export const createNewOrderApiProxyEventSchema = z.object({
  recipeId: z.string().uuid(),
});

export type CreateNewOrderApiProxyEvent = z.infer<
  typeof createNewOrderApiProxyEventSchema
>;
