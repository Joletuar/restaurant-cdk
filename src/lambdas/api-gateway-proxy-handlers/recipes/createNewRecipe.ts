import { APIGatewayProxyEventV2 } from 'aws-lambda';

import {
  createRecipeApiProxyEventSchema,
  type CreateRecipeApiProxyEvent,
} from './types/RecipeEvents';
import { Recipe } from '@src/types/Recipe';
import { createApiGatewayProxyLambdaHandler } from '@src/utils/cloud/createApiGatewayProxyLambdaHandler';
import { HttResponse } from '@src/utils/http/HttpResponse';
import { zodValidator } from '@src/helpers/zodValidator';
import { envs } from '@src/config/envs';
import { DynamoDbService } from '@src/services/DynamoDbService';

const dynamodbService = new DynamoDbService();

const processor = async (event: APIGatewayProxyEventV2) => {
  const parsedEventData = zodValidator<CreateRecipeApiProxyEvent>(
    event.body,
    createRecipeApiProxyEventSchema
  );

  const newRecipe: Recipe = {
    ...parsedEventData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: parsedEventData.name,
    ingredients: parsedEventData.ingredients,
  };

  await dynamodbService.putData<Recipe>({
    tableName: envs.tables.recipesTableName,
    data: newRecipe,
  });

  return HttResponse.created();
};

export const handler = createApiGatewayProxyLambdaHandler({
  processor,
});
