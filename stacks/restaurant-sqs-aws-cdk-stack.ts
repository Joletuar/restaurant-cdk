import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apiGatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apiGatewayv2Integration from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as awsLambda from 'aws-cdk-lib/aws-lambda';
import * as sources from 'aws-cdk-lib/aws-lambda-event-sources';

import * as path from 'path';
import { Enviroment } from '../global';

interface Props extends cdk.StackProps {}

export class RestaurantSQSAwsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: Props) {
    super(scope, id, props);

    // tables

    const recipesTable = new dynamodb.Table(this, 'RecipesTable', {
      tableName: 'RecipesTable',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: 'OrdersTable',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const ingredientsTable = new dynamodb.Table(this, 'IngredientsTable', {
      tableName: 'IngredientsTable',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const purchaseTable = new dynamodb.Table(this, 'PurchaseTable', {
      tableName: 'PurchaseTable',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // queues

    const defaultFifoQueueProps: sqs.QueueProps = {
      fifo: true,
      contentBasedDeduplication: true,
      deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
      retentionPeriod: cdk.Duration.days(1),
      visibilityTimeout: cdk.Duration.minutes(3),
      fifoThroughputLimit: sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
    };

    const processOrdersQueue = new sqs.Queue(this, 'ProcessOrdersQueue', {
      ...defaultFifoQueueProps,
      queueName: 'ProcessOrdersQueue',
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: new sqs.Queue(this, 'ProcessOrdersDeadLetterQueue', {
          queueName: 'ProcessOrdersDeadLetterQueue',
          fifo: true,
          retentionPeriod: cdk.Duration.days(7),
        }),
      },
    });

    const getIngredientsQueue = new sqs.Queue(this, 'GetIngredientsQueue', {
      ...defaultFifoQueueProps,
      queueName: 'GetIngredientsQueue',
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: new sqs.Queue(this, 'GetIngredientsQueueDeadLetterQueue', {
          queueName: 'GetIngredientsQueueDeadLetterQueue',
          fifo: true,
          retentionPeriod: cdk.Duration.days(7),
        }),
      },
    });

    const updateOrderStatusQueue = new sqs.Queue(
      this,
      'UpdateOrderStatusQueue',
      {
        ...defaultFifoQueueProps,
        queueName: 'UpdateOrderStatusQueue',
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: new sqs.Queue(this, 'UpdateOrderStatusQueueDeadLetterQueue', {
            queueName: 'UpdateOrderStatusQueueDeadLetterQueue',
            fifo: true,
            retentionPeriod: cdk.Duration.days(7),
          }),
        },
      }
    );

    const purchaseIngredientsQueue = new sqs.Queue(
      this,
      'PurchaseIngredientsQueue',
      {
        ...defaultFifoQueueProps,
        queueName: 'PurchaseIngredientsQueue',
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: new sqs.Queue(
            this,
            'PurchaseIngredientsQueueDeadLetterQueue',
            {
              queueName: 'PurchaseIngredientsQueueDeadLetterQueue',
              fifo: true,
              retentionPeriod: cdk.Duration.days(7),
            }
          ),
        },
      }
    );

    const replenishIngredientStockQueue = new sqs.Queue(
      this,
      'ReplenishIngredientStockQueue',
      {
        ...defaultFifoQueueProps,
        queueName: 'ReplenishIngredientStockQueue',
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: new sqs.Queue(
            this,
            'ReplenishIngredientStockQueueDeadLetterQueue',
            {
              queueName: 'ReplenishIngredientStockQueueDeadLetterQueue',
              fifo: true,
              retentionPeriod: cdk.Duration.days(7),
            }
          ),
        },
      }
    );

    // api gw

    const apiGateway = new apiGatewayv2.HttpApi(this, 'HttpApiGateway', {
      corsPreflight: {
        allowHeaders: ['*'],
        allowOrigins: ['*'],
        allowMethods: [apiGatewayv2.CorsHttpMethod.ANY],
      },
    });

    // lambdas

    const nodeJsDefaultProps: lambdaNodeJs.NodejsFunctionProps = {
      deadLetterQueueEnabled: false,
      memorySize: 256,
      runtime: awsLambda.Runtime.NODEJS_20_X,
      environment: {
        RECIPES_TABLE_NAME: recipesTable.tableName,
        ORDERS_TABLE_NAME: ordersTable.tableName,
        INGREDIENTS_TABLE_NAME: ingredientsTable.tableName,
        PURCHASES_TABLE_NAME: purchaseTable.tableName,
        PROCESS_ORDERS_QUEUE_URL: processOrdersQueue.queueUrl,
        GET_INGREDIENTS_QUEUE_URL: getIngredientsQueue.queueUrl,
        UPDATE_ORDERS_STATUS_QUEUE_URL: updateOrderStatusQueue.queueUrl,
        PURCHASE_INGREDIENTS_QUEUE_URL: purchaseIngredientsQueue.queueUrl,
        REPLENISH_INGREDIENTS_STOCK_QUEUE_URL:
          replenishIngredientStockQueue.queueUrl,
      } satisfies Enviroment,
    };

    const createNewOrderLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'CreateNewOrderLambda',
      {
        ...nodeJsDefaultProps,
        entry: path.join(
          __dirname,
          '..',
          'lambdas',
          'api-gateway-proxy-handlers',
          'orders',
          'createNewOrder.ts'
        ),
      }
    );

    const processNewOrderLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'ProcessNewOrderLambda',
      {
        ...nodeJsDefaultProps,
        entry: path.join(
          __dirname,
          '..',
          'lambdas',
          'sqs-handlers',
          'orders',
          'processNewOrder.ts'
        ),
      }
    );

    const createNewRecipeLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'CreateNewRecipeLambda',
      {
        ...nodeJsDefaultProps,
        entry: path.join(
          __dirname,
          '..',
          'lambdas',
          'api-gateway-proxy-handlers',
          'recipes',
          'createNewRecipe.ts'
        ),
      }
    );

    const getAllRecipesLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'GetAllRecipesLambda',
      {
        ...nodeJsDefaultProps,
        entry: path.join(
          __dirname,
          '..',
          'lambdas',
          'api-gateway-proxy-handlers',
          'recipes',
          'getAllRecipes.ts'
        ),
      }
    );

    // integrations

    processNewOrderLambda.addEventSource(
      new sources.SqsEventSource(processOrdersQueue, {
        batchSize: 5, // total de mensajes procesados por una lambda
        maxConcurrency: 3, // total de lambdas concurrentes
        reportBatchItemFailures: true,
      })
    );

    apiGateway.addRoutes({
      path: '/orders',
      methods: [apiGatewayv2.HttpMethod.POST],
      integration: new apiGatewayv2Integration.HttpLambdaIntegration(
        'CreateNewOrderLambdaIntegration',
        createNewOrderLambda
      ),
    });

    apiGateway.addRoutes({
      path: '/kitchen/recipes',
      methods: [apiGatewayv2.HttpMethod.POST],
      integration: new apiGatewayv2Integration.HttpLambdaIntegration(
        'CreateNewRecipeLambdaIntegration',
        createNewRecipeLambda
      ),
    });

    apiGateway.addRoutes({
      path: '/kitchen/recipes',
      methods: [apiGatewayv2.HttpMethod.GET],
      integration: new apiGatewayv2Integration.HttpLambdaIntegration(
        'GetAllRecipesLambdaIntegration',
        getAllRecipesLambda
      ),
    });

    // policies

    recipesTable.grantReadWriteData(createNewOrderLambda);
    recipesTable.grantReadWriteData(getAllRecipesLambda);
    recipesTable.grantReadWriteData(createNewRecipeLambda);

    ordersTable.grantReadWriteData(createNewOrderLambda);

    processOrdersQueue.grantSendMessages(createNewOrderLambda);
    processOrdersQueue.grantConsumeMessages(processNewOrderLambda);

    new cdk.CfnOutput(this, 'ApiGatewayUrl', { value: apiGateway.url! });
  }
}
