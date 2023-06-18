const amqp=require("amqplib");


async function publishFunction(code,selectedlanguage){
    try {
        const connection=await amqp.connect("amqp://localhost:5672");
        const channel=await connection.createChannel();
        const exchange='code_exchange';
        const queue='code_queue';
        await channel.assertExchange(exchange,'direct',{durable:false});
        await channel.assertQueue(queue);
        await channel.bindQueue(queue,exchange,'');

        const data={
            userCode:code,
            language:selectedlanguage,
        };
        const message=Buffer.from(JSON.stringify(data));
        

        channel.publish(exchange,'',message);

        // setTimeout(()=>{
        //     connection.close();
        //     process.exit(0);

        // },500);

    } catch (e) {
        console.error(e);
    }
}

module.exports={
    publishFunction
}