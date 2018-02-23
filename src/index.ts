import * as AWS from 'aws-sdk';
import * as PromisesAll from 'promises-all';
import * as assert from 'assert';
import getMillisecondsDiff from './getMillisecondsDiff';

export interface IConstructorParams {
  region: string;
  queueURL: string;
  maxNumberOfMessages?: number;
  numParallelJobs?: number;
  includeResponsesAndErros?: boolean;
}

export interface ISQSWorkResult {
  message: string;  // An arbitrary message of what happened
  start: string;    // The date string (ISO)
  end: string;      // The date string (ISO)
  duration: number; // The duration in milliseconds
  extra?: { (k: string): any }; // A custom extra response
  responses?: any[];
  errors?: any[];
}

export class QueueOps {
  numParallelJobs: number;
  maxNumberOfMessages: number;
  queueURL: string;
  region: string;
  processSingleMessage: Function;
  sqsClient: AWS.SQS;
  includeResponsesAndErros: boolean;

  constructor(params: IConstructorParams) {
    this.region = params.region;
    this.queueURL = params.queueURL;
    this.maxNumberOfMessages = params.maxNumberOfMessages || 10;
    this.numParallelJobs = params.numParallelJobs || 1;
    this.includeResponsesAndErros = params.includeResponsesAndErros !== undefined ? 
      params.includeResponsesAndErros : true;

    // Create the SQS client
    this.sqsClient = new AWS.SQS({ 
      region: this.region, 
      endpoint: this.queueURL, 
    });

    this.readQueueAndProcess = this.readQueueAndProcess.bind(this);
    this.processSQSBatch = this.processSQSBatch.bind(this);
    this.processSQSMessageAndDelete = this.processSQSMessageAndDelete.bind(this);
    this.deleteMessage = this.deleteMessage.bind(this);
  }

  /** 
   * Starts to read the queue in AWS in X groups of Y messages,
   * where X is numParallelJobs and Y is maxNumberOfMessages.
  */
  async readQueueAndProcess(): Promise<ISQSWorkResult> {
    // Start the process
    const start = new Date();

    let promises = [];

    for (let i = 0; i < this.numParallelJobs; i += 1) {
      // Process all the promos
      const messagesPromises = this.processSQSBatch();
      promises = promises.concat(messagesPromises);
    }

    
    // Wait for all of them to be finished
    const { resolve, reject } = await PromisesAll.all(promises);

    // Calculate the end
    const end = new Date();

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      duration: getMillisecondsDiff(start, end),
      // tslint:disable-next-line
      message: `Processed the SQS in ${this.numParallelJobs} groups of ${this.maxNumberOfMessages} messages`,
      responses: this.includeResponsesAndErros && resolve,
      errors: this.includeResponsesAndErros && reject,
    };
  }

  /** 
   * Processes one batch of X results from SQS, where X
   * is defined by maxNumberOfMessages
  */
  async processSQSBatch (): Promise<ISQSWorkResult> {
    // Start the process
    const start = new Date();
    
    // Get the data from SQS    
    const data = await this.sqsClient
      .receiveMessage({
        QueueUrl: this.queueURL,
        WaitTimeSeconds: 1,
        VisibilityTimeout: 30,
        MaxNumberOfMessages: this.maxNumberOfMessages,
      })
      .promise();
    
    // If the queue is empty
    if (!data.Messages) {
      const end = new Date();

      return {
        start: start.toISOString(),
        end: end.toISOString(),
        message: 'The queue is empty',
        duration: getMillisecondsDiff(start, end),
        responses: [],
        errors: [],
      };
    }

    // Do all the processes
    const promises = data.Messages.map(m => this.processSQSMessageAndDelete(m));

    // Wait for all of them to be finished
    const { resolve, reject } = await PromisesAll.all(promises);

    // Calculate the end
    const end = new Date();

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      duration: getMillisecondsDiff(start, end),
      message: `Processed batch of ${data.Messages.length} messages`,
      responses: this.includeResponsesAndErros && resolve,
      errors: this.includeResponsesAndErros && reject,
    };
  }


  /**
   * Processes one SQS Message from the queue
   * @param message
   */
  async processSQSMessageAndDelete(message: AWS.SQS.Message): Promise<any> {
    // Tell the users to set the function they
    // want to execute
    assert.ok(
      this.processSingleMessage, 
      'Please set your processSingleMessage function to the instance.',
    );
    
    const body = JSON.parse(message.Body);
    const result = await this.processSingleMessage(body);
    await this.deleteMessage(message.ReceiptHandle);
    return result;
  }

  /**
   * Delets one message from SQS. This should 
   * be called after it was read and processed
   * @param receiptHandle 
   */
  deleteMessage (receiptHandle: string): Promise<{ $response: AWS.Response<{}, AWS.AWSError>; }> {
    return this.sqsClient.deleteMessage({
      QueueUrl: this.queueURL,
      ReceiptHandle: receiptHandle,
    }).promise();
  }

}
