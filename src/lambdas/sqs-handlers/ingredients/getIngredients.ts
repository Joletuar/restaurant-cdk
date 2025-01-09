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
import { Ingredient } from '@src/types/Store';
import { NotFoundError } from '@src/errors/NotFoundError';
import { zodValidator } from '@src/helpers/zodValidator';
import { envs } from '@src/config/envs';
import { PurchaseIngredientsEvent } from '../purchases/types/PurchaseEvents';

const processor: SQSProcessor<GetIngredientsEvent> = async (message) => {
  const { orderId, ingredients } = message;

  if (ingredients.length === 0)
    throw new ServiceError(
      'Ingredients not given',
      'Ingredients must be at least 1',
      400
    );

  // Obtenemos los ingredientes y lo restamos el stock
  const dynamoService = new DynamoDbService();
  let hasStock = true;
  const ingredientsToRequest: PurchaseIngredientsEvent[] = [];

  // TODO:
  // hacer que este proceso sea indempotente, haciendo que la actualizacion del stock
  // solo se haga cuando se tiene todo los ingredientes (OJO)
  for (const ingredient of message.ingredients) {
    const result = await dynamoService.queryDataByPk<Ingredient>({
      key: {
        id: ingredient.id,
      },
      tableName: envs.tables.ingredientsTableName,
    });

    if (!result)
      throw new NotFoundError(`Ingredient <${ingredient}> not found`);

    // Si no tenemos stock suficientes debemos comprar
    if (result.stock < ingredient.quantity) {
      ingredientsToRequest.push({
        orderId,
        ingredientId: result.id,
        ingredientName: result.name,
        requiredQuantity: Math.abs(
          Math.ceil(result.stock - ingredient.quantity)
        ),
      });
      hasStock = false;
    } else {
      await dynamoService.updateData<Ingredient>({
        key: {
          id: ingredient.id,
        },
        tableName: envs.tables.ingredientsTableName,
        updateExpression: 'SET stock = stock - :value',
        expressionAttributeValues: {
          ':value': `${ingredient.quantity}`,
        },
        returnValues: 'NONE',
      });
    }
  }

  if (!hasStock) {
    ingredientsToRequest.forEach((i) => {
      // send sqs event to buy missing ingredients
      // TODO:
      /**
       * 1. crear el handler para manejar la compra de los ingredientes ✅
       * 2. emitir el evento de que la compra se ha hecho con exito ✅
       * 3. crear el handler para actualizar el stock con los nuevos ingredientes
       * 4. emitir el evento de que el stock fue actualizado
       * 4. actualizar el stock con quitanto los ingredientes con que requiere la receta.
       * 5. emitir evento de actualizacion de estado de la receta
       * 6. actualizar el estado de la recta a terminado
       * 7. Opcional: emitir evento de que una receta se ha procesado para que se refleje en tiempo real en el front
       */
    });
  } else {
    // send sqs event that orders is ready
    // TODO:
    /**
     * 1. emitir evento de actualizacion de estado de la receta
     * 2. actualizar el estado de la recta a terminado
     * 3. Opcional: emitir evento de que una receta se ha procesado para que se refleje en tiempo real en el front
     */
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
