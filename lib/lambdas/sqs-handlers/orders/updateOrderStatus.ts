import { zodValidator } from '@lib/helpers/zodValidator';
import {
  type UpdateOrderStatusEvent,
  updateOrderStatusSchema,
} from './types/OrderEvents';
import {
  createSQSHandler,
  SQSProcessor,
  SQSRecordParser,
} from '@lib/utils/cloud/createSQSHandler';

import { DynamoDbService } from '@lib/services/DynamoDbService';

const processor: SQSProcessor<UpdateOrderStatusEvent> = async (message) => {
  const service = new DynamoDbService();

  await service.updateData({
    tableName: process.env.ORDERS_TABLE_NAME,
    key: {
      id: message.orderId,
    },
    updateExpression: 'SET status = :status',
    expressionAttributeValues: { ':status': message.status },
  });

  // TODO: add custom logger
};

const recordParser: SQSRecordParser<UpdateOrderStatusEvent> = (event) =>
  zodValidator<UpdateOrderStatusEvent>(event.body, updateOrderStatusSchema);

export const handler = createSQSHandler(
  {
    processor,
    recordParser,
  },
  {
    sequential: true,
  }
);
