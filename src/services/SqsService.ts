import {
  MessageAttributeValue,
  SendMessageCommand,
  SQSClient,
  SQSClientConfig,
} from '@aws-sdk/client-sqs';

import * as crypto from 'crypto';

export class SqsService {
  sqsClient: SQSClient;

  constructor(public config?: SQSClientConfig) {
    if (config) this.sqsClient = new SQSClient(config);
    else this.sqsClient = new SQSClient({});
  }

  async sendMessage<T>(params: {
    data: T;
    queueUrl: string;
    messageGroupId?: string;
    messageAttributes?: Record<string, MessageAttributeValue>;
  }) {
    const {
      data,
      queueUrl,
      messageGroupId = crypto.randomUUID(),
      messageAttributes,
    } = params;

    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageGroupId: messageGroupId,
        MessageAttributes: messageAttributes,
        MessageBody: JSON.stringify(data),
        MessageDeduplicationId: crypto.randomUUID(),
      })
    );
  }
}
