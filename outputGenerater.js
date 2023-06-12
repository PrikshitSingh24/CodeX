
const amqp = require("amqplib");



async function subscribeToReplyQueue(ws) {
    const connection = await amqp.connect("amqp://localhost:5672"); // Replace with your RabbitMQ connection URL
    const channel = await connection.createChannel();

    const replyQueue = await channel.assertQueue("reply_queue"); // Replace with your reply queue name

    channel.consume(replyQueue.queue, function (message) {
        const content = message.content.toString();
        const data = JSON.parse(content);
        console.log(data); 
        // Send the message through WebSocket to the UI
        ws.send(JSON.stringify(data));
    }, { noAck: true });
}

module.exports={
    subscribeToReplyQueue
}