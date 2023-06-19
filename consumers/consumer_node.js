const amqp = require("amqplib");
const { exec } = require('child_process');
const { spawn } = require('child_process');
const { channel } = require("diagnostics_channel");
const fs = require('fs');
const { dirname } = require("path");
const path = require('path');
const { runCplusplusCode } = require("./languages/c++/code");
const {runJavaScriptCode}=require('./languages/javascript/code');
const { runPythonCode } = require("./languages/python/code");

async function consumerFunction() {
  try {
    const connection = await amqp.connect("amqp://localhost:5672");
    const channel = await connection.createChannel();
    const exchange = 'code_exchange';
    const queue = 'code_queue';
    await channel.assertQueue(queue);
    await channel.consume(queue, (message) => {
      const { userCode, language } = JSON.parse(message.content.toString());
      switch(language){
        // Implement additional language support as needed
        case 'javascript':
          runJavaScriptCode(userCode);
          break;
        case 'python':
          runPythonCode(userCode);
          break;  
        case 'c++':
          runCplusplusCode(userCode);
          break;   
        default:
          console.error(`Unsupported language: ${language}`);
          break;
      }
      channel.ack(message);
    });
  } catch (error) {
    console.error('Error consuming code:', error);
  }
}



module.exports = {
  consumerFunction
};

