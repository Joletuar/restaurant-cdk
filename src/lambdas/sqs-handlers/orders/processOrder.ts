import {
  CreatedOrderEvent,
  createdOrderEventSchema,
} from './types/OrderEvents';
import {
  createSQSHandler,
  SQSProcessor,
  SQSRecordParser,
} from '@src/utils/cloud/createSQSHandler';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import { zodValidator } from '@src/helpers/zodValidator';
import { Recipe } from '@src/types/Recipe';
import { DynamoDbService } from '@src/services/DynamoDbService';
import { NotFoundError } from '@src/errors/NotFoundError';
import { envs } from '@src/config/envs';

const sqsClient = new SQSClient({});
const dynamodbService = new DynamoDbService();

const processor: SQSProcessor<CreatedOrderEvent> = async (message) => {
  // 1. Actualizar el estado de la orden a "preparando"
  // TODO: create a service for sqs
  const orderCommand = new SendMessageCommand({
    QueueUrl: envs.queues.updateOrderStatusQueueUrl,
    MessageBody: JSON.stringify({
      orderId: message.id,
      status: message.status,
    }),
    MessageGroupId: message.id,
  });

  await sqsClient.send(orderCommand);

  // 2. Obtener los ingredientes de la receta al inventario
  const recipe = await dynamodbService.queryDataByPk<Recipe>({
    tableName: envs.tables.recipesTableName,
    key: {
      id: message.recipeId,
    },
  });

  if (!recipe) {
    throw new NotFoundError(`Recipe <${message.recipeId}> not found`);
  }

  const ingredientsSendCommand = new SendMessageCommand({
    QueueUrl: envs.queues.getIngredientsQueueUrl,
    MessageBody: JSON.stringify({
      orderId: message.id,
      ingredients: recipe.ingredients,
    }),
    MessageGroupId: recipe.id,
  });

  await sqsClient.send(ingredientsSendCommand);
};

const recordParser: SQSRecordParser<CreatedOrderEvent> = (record) =>
  zodValidator(record.body, createdOrderEventSchema);

export const handler = createSQSHandler<CreatedOrderEvent>(
  {
    processor: processor,
    recordParser,
  },
  {
    sequential: true,
  }
);
