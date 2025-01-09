import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

import {
  createSQSHandler,
  SQSProcessor,
  SQSRecordParser,
} from '@src/utils/cloud/createSQSHandler';
import {
  replenishStockIngredientSchema,
  ReplenishIngredientStockEvent,
} from './types/IngredientEvents';
import { zodValidator } from '@src/helpers/zodValidator';
import { DynamoDbService } from '@src/services/DynamoDbService';
import { envs } from '@src/config/envs';

const dynamoDbService = new DynamoDbService();
const sqsClient = new SQSClient({});

const processor: SQSProcessor<ReplenishIngredientStockEvent> = async (
  message
) => {
  const { orderId, ingredientId, purchasedQuantity, requiredQuantity } =
    message;

  await dynamoDbService.updateData({
    key: { id: ingredientId },
    tableName: envs.tables.ingredientsTableName,
    updateExpression: 'SET stock = stock + :purchasedQuantity',
    expressionAttributeValues: {
      ':purchasedQuantity': purchasedQuantity.toString(),
    },
  });

  const command = new SendMessageCommand({
    QueueUrl: envs.queues.getIngredientsQueueUrl,
    MessageBody: JSON.stringify({
      orderId,
      ingredientId,
      quantity: requiredQuantity,
    }),
    MessageGroupId: orderId,
  });

  await sqsClient.send(command);
};

const recordParser: SQSRecordParser<ReplenishIngredientStockEvent> = (event) =>
  zodValidator(event.body, replenishStockIngredientSchema);

export const handler = createSQSHandler(
  {
    processor,
    recordParser,
  },
  {
    sequential: true,
  }
);
