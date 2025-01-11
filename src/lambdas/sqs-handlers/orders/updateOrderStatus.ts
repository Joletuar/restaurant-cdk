import { zodValidator } from '@src/helpers/zodValidator';
import {
  type UpdateOrderStatusEvent,
  updateOrderStatusSchema,
} from './types/OrderEvents';
import {
  createSQSHandler,
  SQSProcessor,
  SQSRecordParser,
} from '@src/utils/cloud/createSQSHandler';

import { DynamoDbService } from '@src/services/DynamoDbService';
import { envs } from '@src/config/envs';

const service = new DynamoDbService();

const processor: SQSProcessor<UpdateOrderStatusEvent> = async (message) => {
  await service.updateData({
    tableName: envs.tables.ordersTableName,
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
