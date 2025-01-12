import {
  createSQSHandler,
  SQSProcessor,
  SQSRecordParser,
} from '@src/utils/cloud/createSQSHandler';

import {
  GetIngredientsEvent,
  getIngredientsEventSchema,
} from './types/IngredientEvents';
import { ServiceError } from '@src/errors/ServiceError';
import { DynamoDbService } from '@src/services/DynamoDbService';
import { Ingredient } from '@src/types/Ingredient';
import { NotFoundError } from '@src/errors/NotFoundError';
import { zodValidator } from '@src/helpers/zodValidator';
import { envs } from '@src/config/envs';
import { PurchaseIngredientsEvent } from '../purchases/types/PurchaseEvents';
import { OrderStatus } from '@src/types/Order';
import { SqsService } from '@src/services/SqsService';
import { UpdateOrderStatusEvent } from '../orders/types/OrderEvents';

const sqsService = new SqsService();
const dynamoService = new DynamoDbService();

const processor: SQSProcessor<GetIngredientsEvent> = async (message) => {
  console.log(JSON.stringify(message, null, 2));

  const { orderId, ingredients } = message;

  if (ingredients.length === 0)
    throw new ServiceError(
      'Ingredients not given',
      'Ingredients must be at least 1',
      400
    );

  // Obtenemos los ingredientes y lo restamos el stock
  let hasStock = true;
  const ingredientsToRequest: PurchaseIngredientsEvent[] = [];

  for (const ingredient of message.ingredients) {
    const ingredientDb = await dynamoService.queryDataByPk<Ingredient>({
      key: {
        id: ingredient.id,
      },
      tableName: envs.tables.ingredientsTableName,
    });

    if (!ingredientDb)
      throw new NotFoundError(`Ingredient <${ingredient}> not found`);

    console.log(
      JSON.stringify(
        {
          ingredientDb,
          ingredient,
        },
        null,
        2
      )
    );

    // Si no tenemos stock suficientes debemos comprar
    if (ingredient.quantity > ingredientDb.stock) {
      ingredientsToRequest.push({
        orderId,
        ingredientId: ingredientDb.id,
        ingredientName: ingredientDb.name,
        requiredQuantity: Math.ceil(ingredient.quantity),
      });
      hasStock = false;
    } else {
      await dynamoService.updateData<Ingredient>({
        key: {
          id: ingredient.id,
        },
        tableName: envs.tables.ingredientsTableName,
        updateExpression: 'SET #stock = #stock - :value',
        expressionAttributeNames: { '#stock': 'stock' },
        expressionAttributeValues: {
          ':value': ingredient.quantity,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        ingredientsToRequest,
        hasStock,
      },
      null,
      2
    )
  );

  if (!hasStock) {
    const promises = ingredientsToRequest.map((ingredient) => {
      // send sqs event to buy missing ingredients
      return sqsService.sendMessage<PurchaseIngredientsEvent>({
        data: ingredient,
        queueUrl: envs.queues.purchaseIngredientsQueueUrl,
        messageGroupId: ingredient.orderId,
      });
    });

    await Promise.all(promises);
  } else {
    // send sqs event that orders is ready
    await sqsService.sendMessage<UpdateOrderStatusEvent>({
      data: { orderId, status: OrderStatus.COMPLETE },
      queueUrl: envs.queues.updateOrderStatusQueueUrl,
      messageGroupId: orderId,
    });
  }
};

const recordParser: SQSRecordParser<GetIngredientsEvent> = (event) =>
  zodValidator(event.body, getIngredientsEventSchema);

export const handler = createSQSHandler(
  {
    processor,
    recordParser,
  },
  {
    sequential: true,
  }
);
