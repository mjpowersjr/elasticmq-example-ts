"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = __importDefault(require("process"));
const client_sqs_1 = require("@aws-sdk/client-sqs");
const config = {
    queue: {
        region: 'us-east-1',
        name: 'test-queue',
        endpoint: 'http://localhost:9324',
    }
};
console.log({
    msg: 'configuring client',
    endpoint: config.queue.endpoint,
});
const client = new client_sqs_1.SQSClient({
    region: config.queue.region,
    endpoint: config.queue.endpoint
});
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function getQueueUrl(name) {
    const response = await client.send(new client_sqs_1.GetQueueUrlCommand({
        QueueName: config.queue.name,
    }));
    return response.QueueUrl;
}
async function sendMessage(queueUrl, messageBody) {
    // Set the parameters
    const command = new client_sqs_1.SendMessageCommand({
        DelaySeconds: 10,
        MessageBody: messageBody,
        QueueUrl: queueUrl,
    });
    return client.send(command);
}
async function readMessages(queueUrl) {
    const data = await client.send(new client_sqs_1.ReceiveMessageCommand({
        AttributeNames: ["SentTimestamp"],
        MaxNumberOfMessages: 10,
        MessageAttributeNames: ["All"],
        QueueUrl: queueUrl,
        VisibilityTimeout: 20,
        WaitTimeSeconds: 0,
    }));
    return data.Messages || [];
}
async function deleteMessage(queueUrl, receiptHandle) {
    await client.send(new client_sqs_1.DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
    }));
}
async function runReadLoop(queueUrl) {
    while (true) {
        const messages = await readMessages(queueUrl);
        for (const message of messages) {
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
    while (true) {
        const messageBody = "test message " + Date.now();
        await sendMessage(queueUrl, messageBody);
        await sleep(5 * 1000);
    }
}
async function main(args) {
    const queueUrl = await getQueueUrl(config.queue.name);
    console.log({
        msg: 'discovered queue url',
        queueUrl,
    });
    runSendLoop(queueUrl);
    runReadLoop(queueUrl);
}
const args = process_1.default.argv.slice(2);
main(args).catch((e) => {
    console.error(e);
    process_1.default.exit(1);
});
//# sourceMappingURL=index.js.map