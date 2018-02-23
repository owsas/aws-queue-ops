import * as AWS from 'aws-sdk';

import { QueueOps } from '../src/index';

describe('#constructor', () => {
  test('should set the default values', () => {
    const instance = new QueueOps({ 
      queueURL: 'test',
      region: 'testRegion',
    });

    expect(instance.maxNumberOfMessages).toEqual(10);
    expect(instance.numParallelJobs).toEqual(1);
    expect(instance.queueURL).toEqual('test');
    expect(instance.region).toEqual('testRegion');
    expect(instance.includeResponsesAndErros).toEqual(true);
  });

  test('should set the default values', () => {
    const instance = new QueueOps({ 
      queueURL: 'test',
      region: 'testRegion',
      maxNumberOfMessages: 5,
      numParallelJobs: 10,
      includeResponsesAndErros: false,
    });

    expect(instance.maxNumberOfMessages).toEqual(5);
    expect(instance.numParallelJobs).toEqual(10);
    expect(instance.queueURL).toEqual('test');
    expect(instance.region).toEqual('testRegion');
    expect(instance.includeResponsesAndErros).toEqual(false);
  });

  test('should initialize the sqs client', () => {
    const instance = new QueueOps({ 
      queueURL: 'test',
      region: 'test',
    });

    expect(instance.sqsClient instanceof AWS.SQS).toBeTruthy();
  });
});


describe('#readQueueAndProcess', () => {
  test('should process the right number of SQS batches', async () => {
    const maxNumberOfMessages = 5;
    const numParallelJobs = 10;

    const instance = new QueueOps({ 
      queueURL: 'test',
      region: 'testRegion',
      maxNumberOfMessages,
      numParallelJobs,
    });

    const spyProcess = jest.spyOn(instance, 'processSQSBatch');
    spyProcess.mockImplementation(async () => true);

    const result = await instance.readQueueAndProcess();

    // Should process X number of batches from SQS, being
    // X the number of parallel jobs  
    expect(spyProcess).toHaveBeenCalledTimes(numParallelJobs);

    // Test the message
    expect(result.message)
      .toEqual(`Processed the SQS in ${numParallelJobs} groups of ${maxNumberOfMessages} messages`);

    // Expect all responses to be there
    expect(result.responses).toEqual(
      [true, true, true, true, true, true, true, true, true, true]
    );

    // Expect no errors
    expect(result.errors).toEqual([]);
  });
});


describe('#processSQSBatch', () => {
  test('should not do anything if the queue is empty', async () => {
    const instance = new QueueOps({ 
      queueURL: 'test',
      region: 'testRegion',
      maxNumberOfMessages: 1,
      numParallelJobs: 1,
    });

    const promise = jest.fn(async () => ({}));
    const receiveMessage = jest.fn(() => ({ promise }));

    (instance.sqsClient as any) = { receiveMessage };

    const result = await instance.processSQSBatch();

    expect(result.message).toEqual('The queue is empty');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });


  test('should process all the SQS Messages and import the promos', async () => {
    const instance = new QueueOps({ 
      queueURL: 'test',
      region: 'testRegion',
    });

    const messages = [{ a: 1 }, { b: 2 }];
    const promise = jest.fn(async () => ({ Messages: messages }));

    const receiveMessage = jest.fn(() => ({ promise }));

    (instance.sqsClient as any) = { receiveMessage };

    const spyProcess = jest.spyOn(instance, 'processSQSMessageAndDelete');
    spyProcess.mockImplementation(async () => true);

    const result = await instance.processSQSBatch();

    expect(result.message).toEqual(`Processed batch of ${messages.length} messages`);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});


describe('#processSQSMessageAndDelete', () => {
  test('should run the instance\'s processSingleMessage and delete the message from SQS after', async () => {
    const messageBody = { test: 'ok' };

    const instance = new QueueOps({ 
      queueURL: 'test',
      region: 'testRegion',
    });
    instance.processSingleMessage = jest.fn(async () => messageBody);

    const message: AWS.SQS.Message = {
      ReceiptHandle: '123',
      Body: JSON.stringify(messageBody),
    } 

    const spyDelete = jest.spyOn(instance, 'deleteMessage');
    spyDelete.mockImplementation(async () => true);

    const result = await instance.processSQSMessageAndDelete(message);

    expect(instance.processSingleMessage).toHaveBeenCalledWith({ test: 'ok' });
    expect(spyDelete).toHaveBeenCalledWith('123');

    expect(result).toEqual(messageBody);
  });
});


describe('#deleteMessage', () => {
  test('should return the promise of the deletion', async () => {
    const instance = new QueueOps({ 
      queueURL: 'test',
      region: 'testRegion',
    });

    const promise = jest.fn(async () => true);
    const deleteMessage = jest.fn(() => ({ promise }));
    (instance.sqsClient as any) = { deleteMessage };

    const result = await instance.deleteMessage('123');
    
    expect(result).toBe(true);
    expect(deleteMessage).toHaveBeenCalledTimes(1);
    expect(deleteMessage).toHaveBeenCalledWith({
      QueueUrl: instance.queueURL,
      ReceiptHandle: '123',
    }); 
  });
});
