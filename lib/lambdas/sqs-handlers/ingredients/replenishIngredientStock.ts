import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

import {
  createSQSHandler,
  SQSProcessor,
  SQSRecordParser,
} from '@lib/utils/cloud/createSQSHandler';
import {
  replenishStockIngredientSchema,
  ReplenishIngredientStock,
} from './types/IngredientEvents';
import { zodValidator } from '@lib/helpers/zodValidator';
import { DynamoDbService } from '@lib/services/DynamoDbService';
import { envs } from '@lib/config/envs';

const dynamoDbService = new DynamoDbService();
const sqsClient = new SQSClient({});

const processor: SQSProcessor<ReplenishIngredientStock> = async (message) => {
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

const recordParser: SQSRecordParser<ReplenishIngredientStock> = (event) =>
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
