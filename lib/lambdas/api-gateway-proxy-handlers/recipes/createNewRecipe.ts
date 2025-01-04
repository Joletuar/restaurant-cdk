import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { marshall } from '@aws-sdk/util-dynamodb';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

import {
  createRecipeApiProxyEventSchema,
  type CreateRecipeApiProxyEvent,
} from './types/RecipeEvents';
import { Recipe } from '@lib/types/Recipe';
import { createApiGatewayProxyLambdaHandler } from '@lib/utils/cloud/createApiGatewayProxyLambdaHandler';
import { HttResponse } from '@lib/utils/http/HttpResponse';
import { zodValidator } from '@lib/helpers/zodValidator';

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
  };

  const item = marshall(newRecipe);

  const putCommand = new PutItemCommand({
    TableName: process.env.RECIPES_TABLE_NAME,
    Item: item,
  });

  await dynamodbClient.send(putCommand);

  return HttResponse.created();
};

export const handler = createApiGatewayProxyLambdaHandler({
  processor,
});
