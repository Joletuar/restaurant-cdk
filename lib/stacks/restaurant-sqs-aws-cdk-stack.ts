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
import { Enviroment } from '../../global';

interface Props extends cdk.StackProps {}

export class RestaurantSQSAwsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: Props) {
    super(scope, id, props);

    // tables

    const recipesTable = new dynamodb.Table(this, 'RecipesTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
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
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: new sqs.Queue(this, 'ProcessOrdersDeadLetterQueue', {
          fifo: true,
          retentionPeriod: cdk.Duration.days(7),
        }),
      },
    });

    const storeQueue = new sqs.Queue(this, 'StoreQueue', {
      ...defaultFifoQueueProps,
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: new sqs.Queue(this, 'StoreDeadLetterQueue', {
          fifo: true,
          retentionPeriod: cdk.Duration.days(7),
        }),
      },
    });

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
        PROCESS_ORDERS_QUEUE_URL: processOrdersQueue.queueUrl,
        STORE_QUEUE_URL: storeQueue.queueUrl,
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
