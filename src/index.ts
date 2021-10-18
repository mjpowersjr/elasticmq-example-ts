import process from 'process';
import { 
    SQSClient,
    GetQueueUrlCommand, 
    SendMessageCommand,
    ReceiveMessageCommand,
    DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

const config = {
    queue: {
        region: 'us-east-1',
        name: 'test-queue',
        endpoint: 'http://localhost:9324',
    }
} as const;

console.log({
    msg: 'configuring client',
    endpoint: config.queue.endpoint,
})
const client = new SQSClient({
    region: config.queue.region,
    endpoint: config.queue.endpoint
})


async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getQueueUrl(name: string) { 
    const response = await client.send(new GetQueueUrlCommand({
        QueueName: config.queue.name,
    }));

    return response.QueueUrl;
}

async function sendMessage(queueUrl, messageBody) {
    // Set the parameters
    const command = new SendMessageCommand({
        DelaySeconds: 10,
        MessageBody: messageBody,
        QueueUrl: queueUrl,
    });

    return client.send(command);
}

async function readMessages(queueUrl: string) {
    const data = await client.send(new ReceiveMessageCommand({
        AttributeNames: ["SentTimestamp"],
        MaxNumberOfMessages: 10,
        MessageAttributeNames: ["All"],
        QueueUrl: queueUrl,
        VisibilityTimeout: 20,
        WaitTimeSeconds: 0,
    }));

    return data.Messages || [];
}

async function deleteMessage(queueUrl: string, receiptHandle) {
    await client.send(new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      }));
}

async function runReadLoop(queueUrl) {
    while(true) {
        const messages = await readMessages(queueUrl);
        for(const message of messages) {
            
            console.log({
                msg: 'received message',
                message,
            });

            console.log({
                msg: 'deleting message',
                handle: message.ReceiptHandle,
            });
            await deleteMessage(queueUrl, message.ReceiptHandle);

        }

    }
}

async function runSendLoop(queueUrl) {
    while(true) {
        const messageBody = "test message " + Date.now()
        await sendMessage(queueUrl, messageBody);
        await sleep(5 * 1000);
    }
}

async function main(args) {
    const queueUrl = await getQueueUrl(config.queue.name);
    console.log({
        msg: 'discovered queue url',
        queueUrl,
    })
    runSendLoop(queueUrl);
    runReadLoop(queueUrl);
}


const args = process.argv.slice(2);

main(args).catch((e) => {
    console.error(e);
    process.exit(1);
})
