import { Context, SQSBatchResponse, SQSHandler, SQSRecord } from 'aws-lambda';

export type SQSRecordParser<TData> = (record: SQSRecord) => TData;
export type SQSProcessor<TData> = (
  data: TData,
  context: Context
) => Promise<void> | void;

export const createSQSHandler =
  <TData>(
    params: {
      processor: SQSProcessor<TData>;
      recordParser: SQSRecordParser<TData>;
    },
    options?: {
      sequential?: boolean;
    }
  ): SQSHandler =>
  async (event, context) => {
    const { processor, recordParser } = params;

    const { Records: records } = event;

    if (options?.sequential) {
      return await performSequentialProcess({
        records,
        processor,
        recordParser,
        context,
      });
    } else {
      return await performParallelProcess({
        records,
        processor,
        recordParser,
        context,
      });
    }
  };

const performParallelProcess = async <TData>({
  records,
  processor,
  recordParser,
  context,
}: {
  records: SQSRecord[];
  processor: SQSProcessor<TData>;
  recordParser: SQSRecordParser<TData>;
  context: Context;
}): Promise<SQSBatchResponse> => {
  const sQsBatchResponse: SQSBatchResponse = {
    batchItemFailures: [],
  };

  const promises = [];

  for (const record of records) {
    const parsedBody = recordParser(record);
    promises.push(processor(parsedBody, context));
  }

  const results = await Promise.allSettled(promises);

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      sQsBatchResponse.batchItemFailures.push({
        itemIdentifier: records[i].messageId,
      });
    }
  });

  return sQsBatchResponse;
};

const performSequentialProcess = async <TData>({
  records,
  processor,
  recordParser,
  context,
}: {
  records: SQSRecord[];
  processor: SQSProcessor<TData>;
  recordParser: SQSRecordParser<TData>;
  context: Context;
}): Promise<SQSBatchResponse> => {
  const sQsBatchResponse: SQSBatchResponse = {
    batchItemFailures: [],
  };

  for (const record of records) {
    const parsedBody = recordParser(record);

    try {
      await processor(parsedBody, context);
    } catch (error) {
      console.error(JSON.stringify(error, null, 2));

      sQsBatchResponse.batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  return sQsBatchResponse;
};
