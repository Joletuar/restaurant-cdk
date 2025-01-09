#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RestaurantSQSAwsCdkStack } from '../stacks/restaurant-sqs-aws-cdk-stack';

const app = new cdk.App();
new RestaurantSQSAwsCdkStack(app, 'RestaurantSQSAwsCdkStack', {});
