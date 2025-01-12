import { envs } from '@src/config/envs';
import { DynamoDbService } from '@src/services/DynamoDbService';

import { Recipe } from '@src/types/Recipe';
import { createApiGatewayProxyLambdaHandler } from '@src/utils/cloud/createApiGatewayProxyLambdaHandler';
import { HttResponse } from '@src/utils/http/HttpResponse';

const dynamoService = new DynamoDbService();

const processor = async () => {
  const recipes = await dynamoService.scanData<Recipe>({
    tableName: envs.tables.recipesTableName,
    limit: 10,
  });

  return HttResponse.ok(recipes);
};

export const handler = createApiGatewayProxyLambdaHandler({
  processor,
});
