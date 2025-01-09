import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import * as sqs from '@aws-sdk/client-sqs';
import * as crypto from 'node:crypto';

import {
  createNewOrderApiProxyEventSchema,
  type CreateNewOrderApiProxyEvent,
} from './types/OrderEvents';
import { Recipe } from '@lib/types/Recipe';
import { RecipeNotFoundError } from './errors/RecipeNotFoundError';
import { Order, OrderStatus } from '@lib/types/Order';
import { createApiGatewayProxyLambdaHandler } from '@lib/utils/cloud/createApiGatewayProxyLambdaHandler';
import { HttResponse } from '@lib/utils/http/HttpResponse';
import { zodValidator } from '@lib/helpers/zodValidator';
import { DynamoDbService } from '@lib/services/DynamoDbService';
import { envs } from '@lib/config/envs';

const sqsClient = new sqs.SQSClient({});
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
  const sqsSendCommand = new sqs.SendMessageCommand({
    QueueUrl: envs.queues.processOrdersQueueUrl,
    MessageBody: JSON.stringify(order),
    MessageGroupId: order.id, // parametro obligatorio para las fifo sqs, para agrupar los mensajes
  });

  await sqsClient.send(sqsSendCommand);

  return HttResponse.created();
};

export const handler = createApiGatewayProxyLambdaHandler({
  processor,
});
