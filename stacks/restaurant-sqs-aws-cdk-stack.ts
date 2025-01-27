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
      contentBasedDeduplication: false,
      deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
      retentionPeriod: cdk.Duration.days(1),
      visibilityTimeout: cdk.Duration.seconds(30),
      fifoThroughputLimit: sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
    };

    const processOrdersQueue = new sqs.Queue(this, 'ProcessOrdersQueue', {
      ...defaultFifoQueueProps,
      queueName: 'ProcessOrdersQueue.fifo',
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: new sqs.Queue(this, 'ProcessOrdersDeadLetterQueue', {
          queueName: 'ProcessOrdersDeadLetterQueue.fifo',
          fifo: true,
          retentionPeriod: cdk.Duration.days(7),
        }),
      },
    });

    const getIngredientsQueue = new sqs.Queue(this, 'GetIngredientsQueue', {
      ...defaultFifoQueueProps,
      queueName: 'GetIngredientsQueue.fifo',
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: new sqs.Queue(this, 'GetIngredientsQueueDeadLetterQueue', {
          queueName: 'GetIngredientsQueueDeadLetterQueue.fifo',
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
        queueName: 'UpdateOrderStatusQueue.fifo',
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: new sqs.Queue(this, 'UpdateOrderStatusQueueDeadLetterQueue', {
            queueName: 'UpdateOrderStatusQueueDeadLetterQueue.fifo',
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
        queueName: 'PurchaseIngredientsQueue.fifo',
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: new sqs.Queue(
            this,
            'PurchaseIngredientsQueueDeadLetterQueue',
            {
              queueName: 'PurchaseIngredientsQueueDeadLetterQueue.fifo',
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
        queueName: 'ReplenishIngredientStockQueue.fifo',
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: new sqs.Queue(
            this,
            'ReplenishIngredientStockQueueDeadLetterQueue',
            {
              queueName: 'ReplenishIngredientStockQueueDeadLetterQueue.fifo',
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
        functionName: 'CreateNewOrderLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
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
        functionName: 'ProcessNewOrderLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
          'lambdas',
          'sqs-handlers',
          'orders',
          'processOrder.ts'
        ),
      }
    );

    const createNewRecipeLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'CreateNewRecipeLambda',
      {
        ...nodeJsDefaultProps,
        functionName: 'CreateNewRecipeLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
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
        functionName: 'GetAllRecipesLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
          'lambdas',
          'api-gateway-proxy-handlers',
          'recipes',
          'getAllRecipes.ts'
        ),
      }
    );

    const getIngredientsLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'GetIngredientsLambda',
      {
        ...nodeJsDefaultProps,
        functionName: 'GetIngredientsLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
          'lambdas',
          'sqs-handlers',
          'ingredients',
          'getIngredients.ts'
        ),
      }
    );

    const updateOrderStatusLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'UpdateOrderStatusLambda',
      {
        ...nodeJsDefaultProps,
        functionName: 'UpdateOrderStatusLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
          'lambdas',
          'sqs-handlers',
          'orders',
          'updateOrderStatus.ts'
        ),
      }
    );

    const purchaseIngredientsLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'PurchaseIngredientsLambda',
      {
        ...nodeJsDefaultProps,
        functionName: 'PurchaseIngredientsLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
          'lambdas',
          'sqs-handlers',
          'purchases',
          'purchaseIngredient.ts'
        ),
      }
    );

    const replenishIngredientStockLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'ReplenishIngredientStockLambda',
      {
        ...nodeJsDefaultProps,
        functionName: 'ReplenishIngredientStockLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
          'lambdas',
          'sqs-handlers',
          'ingredients',
          'replenishIngredientStock.ts'
        ),
      }
    );

    const createIngredientLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'CreateIngredientLambda',
      {
        ...nodeJsDefaultProps,
        functionName: 'CreateIngredientLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
          'lambdas',
          'api-gateway-proxy-handlers',
          'ingredients',
          'createIngredient.ts'
        ),
      }
    );

    const getAllIngredientsLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'GetAllIngredientsLambda',
      {
        ...nodeJsDefaultProps,
        functionName: 'GetAllIngredientsLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
          'lambdas',
          'api-gateway-proxy-handlers',
          'ingredients',
          'getAllIngredients.ts'
        ),
      }
    );

    const getAllOrdersLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'GetAllOrdersLambda',
      {
        ...nodeJsDefaultProps,
        functionName: 'GetAllOrdersLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
          'lambdas',
          'api-gateway-proxy-handlers',
          'orders',
          'getAllOrders.ts'
        ),
      }
    );

    const getAllPurchasesLambda = new lambdaNodeJs.NodejsFunction(
      this,
      'GetAllPurchasesLambda',
      {
        ...nodeJsDefaultProps,
        functionName: 'GetAllPurchasesLambda',
        entry: path.join(
          __dirname,
          '..',
          'src',
          'lambdas',
          'api-gateway-proxy-handlers',
          'purchases',
          'getAllPurchases.ts'
        ),
      }
    );

    // integrations

    processNewOrderLambda.addEventSource(
      new sources.SqsEventSource(processOrdersQueue, {
        batchSize: 1, // total de mensajes procesados por una lambda
        maxConcurrency: 2, // total de lambdas concurrentes
        reportBatchItemFailures: true,
      })
    );

    updateOrderStatusLambda.addEventSource(
      new sources.SqsEventSource(updateOrderStatusQueue, {
        batchSize: 1,
        maxConcurrency: 2,
        reportBatchItemFailures: true,
      })
    );

    purchaseIngredientsLambda.addEventSource(
      new sources.SqsEventSource(purchaseIngredientsQueue, {
        batchSize: 1,
        maxConcurrency: 2,
        reportBatchItemFailures: true,
      })
    );

    replenishIngredientStockLambda.addEventSource(
      new sources.SqsEventSource(replenishIngredientStockQueue, {
        batchSize: 1,
        maxConcurrency: 2,
        reportBatchItemFailures: true,
      })
    );

    getIngredientsLambda.addEventSource(
      new sources.SqsEventSource(getIngredientsQueue, {
        batchSize: 1,
        maxConcurrency: 2,
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
      path: '/orders',
      methods: [apiGatewayv2.HttpMethod.GET],
      integration: new apiGatewayv2Integration.HttpLambdaIntegration(
        'GetAllOrdersLambdaIntegration',
        getAllOrdersLambda
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

    apiGateway.addRoutes({
      path: '/kitchen/ingredients',
      methods: [apiGatewayv2.HttpMethod.POST],
      integration: new apiGatewayv2Integration.HttpLambdaIntegration(
        'CreateIngredientLambdaIntegration',
        createIngredientLambda
      ),
    });

    apiGateway.addRoutes({
      path: '/kitchen/ingredients',
      methods: [apiGatewayv2.HttpMethod.GET],
      integration: new apiGatewayv2Integration.HttpLambdaIntegration(
        'GetAllIngredientsLambdaIntegration',
        getAllIngredientsLambda
      ),
    });

    apiGateway.addRoutes({
      path: '/purchases',
      methods: [apiGatewayv2.HttpMethod.GET],
      integration: new apiGatewayv2Integration.HttpLambdaIntegration(
        'GetAllPurchasesLambdaIntegration',
        getAllPurchasesLambda
      ),
    });

    // policies

    recipesTable.grantReadWriteData(createNewOrderLambda);
    recipesTable.grantReadWriteData(getAllRecipesLambda);
    recipesTable.grantReadWriteData(createNewRecipeLambda);
    recipesTable.grantReadWriteData(processNewOrderLambda);

    ordersTable.grantReadWriteData(createNewOrderLambda);
    ordersTable.grantReadWriteData(updateOrderStatusLambda);
    ordersTable.grantReadWriteData(replenishIngredientStockLambda);
    ordersTable.grantReadWriteData(getAllOrdersLambda);

    ingredientsTable.grantReadWriteData(purchaseIngredientsLambda);
    ingredientsTable.grantReadWriteData(replenishIngredientStockLambda);
    ingredientsTable.grantReadWriteData(getIngredientsLambda);
    ingredientsTable.grantReadWriteData(getAllIngredientsLambda);
    ingredientsTable.grantReadWriteData(createIngredientLambda);

    purchaseTable.grantReadWriteData(getAllPurchasesLambda);
    purchaseTable.grantReadWriteData(purchaseIngredientsLambda);

    processOrdersQueue.grantSendMessages(createNewOrderLambda);
    processOrdersQueue.grantConsumeMessages(processNewOrderLambda);
    processOrdersQueue.grantSendMessages(replenishIngredientStockLambda);

    updateOrderStatusQueue.grantConsumeMessages(updateOrderStatusLambda);
    updateOrderStatusQueue.grantSendMessages(getIngredientsLambda);
    updateOrderStatusQueue.grantSendMessages(processNewOrderLambda);

    purchaseIngredientsQueue.grantConsumeMessages(purchaseIngredientsLambda);
    purchaseIngredientsQueue.grantSendMessages(getIngredientsLambda);

    replenishIngredientStockQueue.grantConsumeMessages(
      replenishIngredientStockLambda
    );
    replenishIngredientStockQueue.grantSendMessages(purchaseIngredientsLambda);

    getIngredientsQueue.grantConsumeMessages(getIngredientsLambda);
    getIngredientsQueue.grantSendMessages(processNewOrderLambda);

    // TODO: Add builder patter to create entities

    new cdk.CfnOutput(this, 'ApiGatewayUrl', { value: apiGateway.url! });
  }
}
