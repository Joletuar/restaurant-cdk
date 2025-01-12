import { envs } from '@src/config/envs';
import { DynamoDbService } from '@src/services/DynamoDbService';
import { Ingredient } from '@src/types/Ingredient';
import {
  ApiProxyProcessor,
  createApiGatewayProxyLambdaHandler,
} from '@src/utils/cloud/createApiGatewayProxyLambdaHandler';
import { HttResponse } from '@src/utils/http/HttpResponse';

const dynamoService = new DynamoDbService();

const processor: ApiProxyProcessor = async (event) => {
  const ingredients = await dynamoService.scanData<Ingredient>({
    tableName: envs.tables.ingredientsTableName,
    limit: 10,
  });

  return HttResponse.ok(ingredients);
};

export const handler = createApiGatewayProxyLambdaHandler({
  processor,
});
