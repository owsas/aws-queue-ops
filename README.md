# AWS Queue Ops

Amazon AWS SQS processing made easy

![](https://travis-ci.org/jcguarinpenaranda/aws-queue-ops.svg?branch=master)


<!-- TOC -->

- [AWS Queue Ops](#aws-queue-ops)
  - [Installation](#installation)
  - [Why?](#why)
  - [Setup](#setup)
  - [Usage](#usage)
    - [Process the queue](#process-the-queue)
    - [Process every single message in the queue](#process-every-single-message-in-the-queue)
  - [Contributing](#contributing)
  - [Dev Features](#dev-features)
  - [Credits](#credits)
  - [License](#license)

<!-- /TOC -->

## Installation

```
npm i -S aws-queue-ops
```

## Why?

I created this library because I need to process high volumes of data from SQS in AWS Lambda.

## Setup

Each minute, hour, or day, you may want to read the enqueued messages in your SQS queue, so you can process them. This is easily done in AWS Lambda by setting the [Scheduled Events](https://docs.aws.amazon.com/lambda/latest/dg/with-scheduled-events.html).

## Usage

You must first create a new instance: 

```js
import { QueueOps } from 'aws-queue-ops'

const instance = new QueueOps({ 
  queueURL: 'test',
  region: 'testRegion',
  maxNumberOfMessages: 5,
  numParallelJobs: 10,
  includeResponsesAndErros: false,
});
```

* `queueURL`: The url for the queue in AWS
* `region`: The region to use in AWS
* `maxNumberOfMessages`: The maximum number of messages to process from SQS on each parallel job
* `numParallelJobs`: The number of concurrent jobs to execute
* `includeResponsesAndErros`: Wether or not to include the responses and errors after `readQueueAndProcess` has been executed. Beware that including them may increase the outgoing traffic.

**Example:**
* You want to process 100 messages every single time your code runs. So, you can set the `numParallelJobs` to 10 and `maxNumberOfMessages` to 10. After this is run, your SQS queue will display that 100 messages were processed.

### Process the queue

`readQueueAndProcess` can be executed whenever you want to process all the messages in SQS.

```js
instance.readQueueAndProcess()
  .then((result) => {
    /*
      result: {
        start: '2018-02-23T15:59:39.787Z', // iso start string
        end: '2018-02-23T15:59:46.513Z', // iso end string
        duartion: 113, // in milliseconds,
        responses: any[], // The responses from each concurrent process executed
        errors: any[], // The errors from each concurrent process executed,
        message: string, // What happened
      }   
    */
  });
```


### Process every single message in the queue

You must specify how you want to process every single message Body from the SQS queue. This function must be asynchronous or return a promise.

```js
const instance = new QueueOps({ 
  queueURL: 'test',
  region: 'testRegion',
  maxNumberOfMessages: 5,
  numParallelJobs: 10,
  includeResponsesAndErros: false,
});

// Say how you want to process every message (async)
instance.processSingleMessage = async (messageBody) => {
  // do something here
}

// Say how you want to process every message (Promise)
instance.processSingleMessage = (messageBody) => {
  return new Promise((resolve,reject) => {
    /// ... do something here
  });
}

// Start processing all the messages in SQS
instance.readQueueAndProcess().then(() => {

});
```

Usually, the messages in SQS are strings. The `messageBody` that is passed to this function is previously JSON parsed.

## Contributing

Clone this repo, and start adding your code in the `index.ts` file.  
When you are done, write the tests in the `index.test.ts` file. For testing, this repo works with [Jest](https://facebook.github.io/jest/).


## Dev Features
* Testing with Jest
* Linting out of the box (checks the style of your code), with TSLint
* Build, prepublish and other scripts to help you to develop
* Works with Typescript: Static typing for your JS Applications, reducing amount of runtime errors
* Coverage out of the box, thanks to Jest
* Uses deterministic module resolving, with Yarn

## Credits

Developed by Juan Camilo Guarín Peñaranda,  
Otherwise SAS, Colombia  
2017

## License 

MIT :)
