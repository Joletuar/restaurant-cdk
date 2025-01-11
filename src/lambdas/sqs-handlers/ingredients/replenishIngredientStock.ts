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
import { NotFoundError } from '@src/errors/NotFoundError';
import { SqsService } from '@src/services/SqsService';
import { Order } from '@src/types/Order';

const dynamoDbService = new DynamoDbService();
const sqsService = new SqsService();

const processor: SQSProcessor<ReplenishIngredientStockEvent> = async (
  message
) => {
  const { orderId, ingredientId, purchasedQuantity } = message;

  await dynamoDbService.updateData({
    key: { id: ingredientId },
    tableName: envs.tables.ingredientsTableName,
    updateExpression: 'SET stock = stock + :purchasedQuantity',
    expressionAttributeValues: {
      ':purchasedQuantity': purchasedQuantity.toString(),
    },
  });

  const order = await dynamoDbService.queryDataByPk<Order>({
    key: {
      id: orderId,
    },
    tableName: envs.tables.ordersTableName,
  });

  if (!order) throw new NotFoundError(`Order <${orderId}> not found`);

  await sqsService.sendMessage<Order>({
    data: order,
    queueUrl: envs.queues.getIngredientsQueueUrl,
    messageGroupId: orderId,
  });
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
