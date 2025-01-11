import {
  CreatedOrderEvent,
  createdOrderEventSchema,
  UpdateOrderStatusEvent,
} from './types/OrderEvents';
import {
  createSQSHandler,
  SQSProcessor,
  SQSRecordParser,
} from '@src/utils/cloud/createSQSHandler';

import { zodValidator } from '@src/helpers/zodValidator';
import { Recipe } from '@src/types/Recipe';
import { DynamoDbService } from '@src/services/DynamoDbService';
import { NotFoundError } from '@src/errors/NotFoundError';
import { envs } from '@src/config/envs';
import { SqsService } from '@src/services/SqsService';
import { GetIngredientsEvent } from '../ingredients/types/IngredientEvents';

const sqsService = new SqsService();
const dynamodbService = new DynamoDbService();

const processor: SQSProcessor<CreatedOrderEvent> = async (message) => {
  // 1. Actualizar el estado de la orden a "preparando"
  await sqsService.sendMessage<UpdateOrderStatusEvent>({
    data: {
      orderId: message.id,
      status: message.status,
    },
    queueUrl: envs.queues.updateOrderStatusQueueUrl,
    messageGroupId: message.id,
  });

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

  // 3. Obtenemos los ingredientes para prepar la receta
  await sqsService.sendMessage<GetIngredientsEvent>({
    data: {
      orderId: message.id,
      ingredients: recipe.ingredients,
    },
    queueUrl: envs.queues.getIngredientsQueueUrl,
    messageGroupId: message.id,
  });
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
