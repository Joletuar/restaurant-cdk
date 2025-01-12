import { envs } from '@src/config/envs';
import { DynamoDbService } from '@src/services/DynamoDbService';
import { Order } from '@src/types/Order';
import {
  ApiProxyProcessor,
  createApiGatewayProxyLambdaHandler,
} from '@src/utils/cloud/createApiGatewayProxyLambdaHandler';
import { HttResponse } from '@src/utils/http/HttpResponse';

const dynamoService = new DynamoDbService();

const processor: ApiProxyProcessor = async (event) => {
  const orders = await dynamoService.scanData<Order>({
    tableName: envs.tables.ordersTableName,
    limit: 10,
  });

  return HttResponse.ok(orders);
};

export const handler = createApiGatewayProxyLambdaHandler({
  processor,
});
