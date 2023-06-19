const amqp = require("amqplib");

async function setupOutputListener(app) {
  try {
    const connection = await amqp.connect("amqp://localhost:5672");
    const channel = await connection.createChannel();
    const outputExchange = "output_exchange"; // Specify the name of the output exchange
    const queue = "output_queue"; // Specify the name of the output queue

    await channel.assertExchange(outputExchange, "direct", { durable: false });
    await channel.assertQueue(queue);
    await channel.bindQueue(queue, outputExchange, "");
    channel.consume(queue, (message) => {
      const output = message.content.toString();
      console.log("the output is retrieved!!");
      console.log(`Output: ${output}`);
      app.locals.output = output; // Store the output in app.locals for later retrieval
       channel.ack(message);
    });
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  setupOutputListener,
};
