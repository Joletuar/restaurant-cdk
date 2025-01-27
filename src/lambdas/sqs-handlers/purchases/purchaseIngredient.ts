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
import { DynamoDbService } from '@src/services/DynamoDbService';
import { Purchase } from '@src/types/Purchases';
import * as crypto from 'crypto';

const getRandomNumber = () => Math.round(10 * Math.random());

const sqsService = new SqsService();
const dynamoService = new DynamoDbService();

const processor: SQSProcessor<PurchaseIngredientsEvent> = async (message) => {
  const { orderId, ingredientId, ingredientName, requiredQuantity } = message;

  let currentQuantity = 0;

  while (requiredQuantity > currentQuantity) {
    const purchasedQuantity = getRandomNumber();

    currentQuantity = purchasedQuantity + getRandomNumber();

    const purchase: Purchase = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ingredientId,
      purchasedQuantity,
    };

    await dynamoService.putData<Purchase>({
      tableName: envs.tables.purchasesTableName,
      data: purchase,
    });
  }

  await sqsService.sendMessage<ReplenishIngredientStockEvent>({
    data: {
      orderId,
      ingredientId,
      ingredientName,
      purchasedQuantity: currentQuantity,
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
