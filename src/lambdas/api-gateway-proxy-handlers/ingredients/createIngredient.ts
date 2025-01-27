import { zodValidator } from '@src/helpers/zodValidator';
import { DynamoDbService } from '@src/services/DynamoDbService';
import {
  ApiProxyProcessor,
  createApiGatewayProxyLambdaHandler,
} from '@src/utils/cloud/createApiGatewayProxyLambdaHandler';
import {
  CreateIngredientEvent,
  createIngredientEventSchema,
} from './types/IngredientEvents';
import { Ingredient } from '@src/types/Ingredient';
import { envs } from '@src/config/envs';
import { HttResponse } from '@src/utils/http/HttpResponse';
import * as crypto from 'crypto';

const dynamoService = new DynamoDbService();

const processor: ApiProxyProcessor = async (event) => {
  const parsedData = zodValidator<CreateIngredientEvent>(
    event.body,
    createIngredientEventSchema
  );

  const ingredient: Ingredient = {
    ...parsedData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dynamoService.putData<Ingredient>({
    tableName: envs.tables.ingredientsTableName,
    data: ingredient,
  });

  return HttResponse.created();
};

export const handler = createApiGatewayProxyLambdaHandler({
  processor,
});
