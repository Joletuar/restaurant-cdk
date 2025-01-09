import {
  DynamoDBClient,
  DynamoDBClientConfig,
  GetItemCommand,
  PutItemCommand,
  ReturnValue,
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
    expressionAttributeValues: Record<string, string>;
    returnValues?: ReturnValue;
  }) {
    const {
      tableName,
      key,
      updateExpression,
      expressionAttributeValues,
      returnValues = 'ALL_NEW',
    } = params;

    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: marshall(key),
      UpdateExpression: updateExpression,
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
    returnValues?: ReturnValue;
  }) {
    const { tableName, data, returnValues = 'ALL_NEW' } = params;

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
}
