import {
  CreatedOrderEvent,
  createdOrderEventSchema,
} from './types/OrderEvents';
import {
  createSQSHandler,
  SQSProcessor,
  SQSRecordParser,
} from '@lib/utils/cloud/createSQSHandler';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import { zodValidator } from '@lib/helpers/zodValidator';
import { Recipe } from '@lib/types/Recipe';
import { DynamoDbService } from '@lib/services/DynamoDbService';
import { NotFoundError } from '@lib/errors/NotFoundError';

const sqsClient = new SQSClient({});
const dynamodbService = new DynamoDbService();

const processor: SQSProcessor<CreatedOrderEvent> = async (message) => {
  // 1. Actualizar el estado de la orden a "preparando"
  // TODO: create a service for sqs
  const orderCommand = new SendMessageCommand({
    QueueUrl: process.env.ORDER_EVENTS_QUEUE_URL,
    MessageBody: JSON.stringify({
      orderId: message.id,
      status: message.status,
    }),
    MessageGroupId: message.id,
  });

  await sqsClient.send(orderCommand);

  // 2. Obtener los ingredientes de la receta al inventario
  const recipe = await dynamodbService.queryDataByPk<Recipe>({
    tableName: process.env.RECIPES_TABLE_NAME,
    key: {
      id: message.recipeId,
    },
  });

  if (!recipe) {
    throw new NotFoundError(`Recipe <${message.recipeId}> not found`);
  }

  const storeSendCommand = new SendMessageCommand({
    QueueUrl: process.env.STORE_QUEUE_URL,
    MessageBody: JSON.stringify(recipe.ingredients),
    MessageGroupId: recipe.id,
  });

  await sqsClient.send(storeSendCommand);
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
