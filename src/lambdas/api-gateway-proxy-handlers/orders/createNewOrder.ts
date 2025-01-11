import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import * as crypto from 'node:crypto';

import {
  createNewOrderApiProxyEventSchema,
  type CreateNewOrderApiProxyEvent,
} from './types/OrderEvents';
import { Recipe } from '@src/types/Recipe';
import { RecipeNotFoundError } from './errors/RecipeNotFoundError';
import { Order, OrderStatus } from '@src/types/Order';
import { createApiGatewayProxyLambdaHandler } from '@src/utils/cloud/createApiGatewayProxyLambdaHandler';
import { HttResponse } from '@src/utils/http/HttpResponse';
import { zodValidator } from '@src/helpers/zodValidator';
import { DynamoDbService } from '@src/services/DynamoDbService';
import { envs } from '@src/config/envs';
import { SqsService } from '@src/services/SqsService';

const sqsService = new SqsService();
const dynamoDbService = new DynamoDbService();

const processor = async (event: APIGatewayProxyEventV2) => {
  // Validamos la data del evento
  const parsedEventData = zodValidator<CreateNewOrderApiProxyEvent>(
    event.body,
    createNewOrderApiProxyEventSchema
  );

  // Validamos que sea una receta válida
  const recipe = await dynamoDbService.queryDataByPk<Recipe>({
    tableName: envs.tables.recipesTableName,
    key: {
      id: parsedEventData.recipeId,
    },
  });

  if (!recipe) throw new RecipeNotFoundError(parsedEventData.recipeId);

  const order: Order = {
    id: crypto.randomUUID(),
    recipeId: recipe.id,
    status: OrderStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dynamoDbService.putData<Order>({
    tableName: envs.tables.ordersTableName,
    data: order,
  });

  // Emitimos el evento de la orden creada en la cola
  await sqsService.sendMessage<Order>({
    data: order,
    queueUrl: envs.queues.processOrdersQueueUrl,
    messageGroupId: order.id,
  });

  return HttResponse.created();
};

export const handler = createApiGatewayProxyLambdaHandler({
  processor,
});
