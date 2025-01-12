import { envs } from '@src/config/envs';
import { DynamoDbService } from '@src/services/DynamoDbService';
import { Purchase } from '@src/types/Purchases';
import {
  ApiProxyProcessor,
  createApiGatewayProxyLambdaHandler,
} from '@src/utils/cloud/createApiGatewayProxyLambdaHandler';
import { HttResponse } from '@src/utils/http/HttpResponse';

const dynamoService = new DynamoDbService();

const processor: ApiProxyProcessor = async (event) => {
  const purchases = await dynamoService.scanData<Purchase>({
    tableName: envs.tables.purchasesTableName,
    limit: 10,
  });

  return HttResponse.ok(purchases);
};

export const handler = createApiGatewayProxyLambdaHandler({
  processor,
});
