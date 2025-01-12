import {
  DynamoDBClient,
  DynamoDBClientConfig,
  GetItemCommand,
  PutItemCommand,
  ReturnValue,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export class DynamoDbService {
  dynamoDbClient: DynamoDBClient;

  constructor(config?: DynamoDBClientConfig) {
    if (config) this.dynamoDbClient = new DynamoDBClient(config);
    else this.dynamoDbClient = new DynamoDBClient();
  }

  async queryDataByPk<T>(params: {
    tableName: string;
    key: Record<string, string>;
    consistentRead?: boolean;
  }) {
    const { tableName, key, consistentRead = false } = params;

    const command = new GetItemCommand({
      TableName: tableName,
      Key: marshall(key),
      ConsistentRead: consistentRead,
    });

    const result = await this.dynamoDbClient.send(command);

    if (!result.Item) return undefined;

    return unmarshall(result.Item) as T;
  }

  async updateData<T>(params: {
    tableName: string;
    key: Record<string, string>;
    updateExpression: string;
    expressionAttributeNames: Record<string, string>;
    expressionAttributeValues: Record<string, unknown>;
    returnValues?: ReturnValue;
  }) {
    const {
      tableName,
      key,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues,
      returnValues = 'NONE',
    } = params;

    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: marshall(key),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ReturnValues: returnValues,
    });

    const result = await this.dynamoDbClient.send(command);

    switch (returnValues) {
      case 'NONE':
        return;

      default:
        return unmarshall(result.Attributes!) as T;
    }
  }

  async putData<T>(params: {
    tableName: string;
    data: T;
    returnValues?: 'ALL_OLD' | 'NONE';
  }) {
    const { tableName, data, returnValues = 'NONE' } = params;

    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(data),
      ReturnValues: returnValues,
    });

    const result = await this.dynamoDbClient.send(command);

    switch (returnValues) {
      case 'NONE':
        return;

      default:
        return unmarshall(result.Attributes!) as T;
    }
  }

  async scanData<T>(params: {
    tableName: string;
    limit: number;
    lastKeyValue?: Record<string, unknown>;
  }): Promise<{ data: T[]; lastKeyValue?: Record<string, unknown> }> {
    const { tableName, limit, lastKeyValue } = params;

    const command = new ScanCommand({
      TableName: tableName,
      Limit: limit,
      ExclusiveStartKey: lastKeyValue ? marshall(lastKeyValue) : undefined,
    });

    const result = await this.dynamoDbClient.send(command);

    if (result.Items === undefined)
      return {
        data: [],
      };

    return {
      data: result.Items.map((item) => unmarshall(item)) as T[],
      lastKeyValue: result.LastEvaluatedKey
        ? unmarshall(result.LastEvaluatedKey)
        : undefined,
    };
  }
}
