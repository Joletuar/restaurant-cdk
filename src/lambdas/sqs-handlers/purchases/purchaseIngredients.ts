import {
  createSQSHandler,
  SQSProcessor,
  SQSRecordParser,
} from '@src/utils/cloud/createSQSHandler';
import {
  PurchaseIngredientsEvent,
  purchaseIngredientsEventSchema,
} from './types/PurchaseEvents';
import { zodValidator } from '@src/helpers/zodValidator';
import { envs } from '@src/config/envs';
import { SqsService } from '@src/services/SqsService';
import { ReplenishIngredientStockEvent } from '../ingredients/types/IngredientEvents';

const getRandomNumber = () => Math.round(10 * Math.random());

const sqsService = new SqsService();

const processor: SQSProcessor<PurchaseIngredientsEvent> = async (message) => {
  const { orderId, ingredientId, ingredientName, requiredQuantity } = message;

  let purchasedQuantity = 0;

  while (requiredQuantity < purchasedQuantity) {
    purchasedQuantity = purchasedQuantity + getRandomNumber();
  }

  await sqsService.sendMessage<ReplenishIngredientStockEvent>({
    data: {
      orderId,
      ingredientId,
      ingredientName,
      purchasedQuantity,
      requiredQuantity,
    },
    queueUrl: envs.queues.replenishIngredientsStockQueueUrl,
    messageGroupId: orderId,
  });
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
