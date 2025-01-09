import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { envs } from '@lib/config/envs';

import { Recipe } from '@lib/types/Recipe';
import { createApiGatewayProxyLambdaHandler } from '@lib/utils/cloud/createApiGatewayProxyLambdaHandler';
import { HttResponse } from '@lib/utils/http/HttpResponse';

const dynamodbClient = new DynamoDBClient({});

const processor = async () => {
  const command = new ScanCommand({
    TableName: envs.tables.recipesTableName,
    Limit: 10, // TODO: sacar esto del query param (implement criteria pattern)
  });

  const result = await dynamodbClient.send(command);

  if (result.Items === undefined)
    return HttResponse.ok({
      data: [],
    });

  if (result.Items !== undefined && result.Items.length === 0)
    return HttResponse.ok({
      data: [],
    });

  const parsedItems: Array<Recipe> = [];

  for (const item of result.Items) {
    parsedItems.push(unmarshall(item) as Recipe);
  }

  return HttResponse.ok({
    data: parsedItems,
    meta:
      result.LastEvaluatedKey === undefined
        ? undefined
        : unmarshall(result.LastEvaluatedKey),
  });
};

export const handler = createApiGatewayProxyLambdaHandler({
  processor,
});
