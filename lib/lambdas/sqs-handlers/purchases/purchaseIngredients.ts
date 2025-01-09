import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

import {
  createSQSHandler,
  SQSProcessor,
  SQSRecordParser,
} from '@lib/utils/cloud/createSQSHandler';
import {
  PurchaseIngredientsEvent,
  purchaseIngredientsEventSchema,
} from './types/PurchaseEvents';
import { zodValidator } from '@lib/helpers/zodValidator';
import { envs } from '@lib/config/envs';

const getRandomNumber = () => Math.round(10 * Math.random());

const sqsClient = new SQSClient({});

const processor: SQSProcessor<PurchaseIngredientsEvent> = async (message) => {
  const { orderId, ingredientId, ingredientName, requiredQuantity } = message;

  let purchasedQuantity = 0;

  while (requiredQuantity < purchasedQuantity) {
    purchasedQuantity = purchasedQuantity + getRandomNumber();
  }

  const command = new SendMessageCommand({
    MessageBody: JSON.stringify({
      orderId,
      ingredientId,
      ingredientName,
      purchasedQuantity,
    }),
    QueueUrl: envs.queues.replenishIngredientsStockQueueUrl,
    MessageGroupId: orderId,
  });

  await sqsClient.send(command);
};

const recordParser: SQSRecordParser<PurchaseIngredientsEvent> = (event) =>
  zodValidator(event.body, purchaseIngredientsEventSchema);

export const handler = createSQSHandler(
  {
    processor,
    recordParser,
  },
  {
    sequential: true,
  }
);
