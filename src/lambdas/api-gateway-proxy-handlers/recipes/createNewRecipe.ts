import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { marshall } from '@aws-sdk/util-dynamodb';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

import {
  createRecipeApiProxyEventSchema,
  type CreateRecipeApiProxyEvent,
} from './types/RecipeEvents';
import { Recipe } from '@src/types/Recipe';
import { createApiGatewayProxyLambdaHandler } from '@src/utils/cloud/createApiGatewayProxyLambdaHandler';
import { HttResponse } from '@src/utils/http/HttpResponse';
import { zodValidator } from '@src/helpers/zodValidator';
import { envs } from '@src/config/envs';

const dynamodbClient = new DynamoDBClient({});

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

  const item = marshall(newRecipe);

  const putCommand = new PutItemCommand({
    TableName: envs.tables.recipesTableName,
    Item: item,
  });

  await dynamodbClient.send(putCommand);

  return HttResponse.created();
};

export const handler = createApiGatewayProxyLambdaHandler({
  processor,
});
