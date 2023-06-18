const amqp = require("amqplib");
const { exec } = require('child_process');
const { spawn } = require('child_process');
const { channel } = require("diagnostics_channel");
const fs = require('fs');
const { dirname } = require("path");
const path = require('path');


function runJavaScriptCode(userCode) {
    const scriptPath = path.join(__dirname, 'user_code.js');
    fs.writeFileSync(scriptPath, userCode);
  
    const containerName = `javascript-exec-container-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const dockerfilePath = path.join(__dirname, 'Dockerfile');
    const imageName = 'my-custom-image';
  
    // Generate the Dockerfile dynamically
    const dockerfileContent = `
      FROM node:14
      WORKDIR /app
      COPY consumers/languages/javascript/user_code.js /app/user_code.js
      USER nobody
      CMD ["node", "user_code.js"]
    `;
  
    fs.writeFileSync(dockerfilePath, dockerfileContent);
  
    const buildProcess = spawn('docker', ['build', '-t', imageName, '-f', dockerfilePath, '.']);
  
    buildProcess.stdout.on('data', (data) => {
      console.log(data.toString());
    });
  
    buildProcess.stderr.on('data', (data) => {
      console.error(data.toString());
    });
  
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Docker Image Built Successfully');
        runDockerContainer();
      }
    });
  
    function runDockerContainer() {
      const scriptDirectory = path.resolve(__dirname).replace(/\\/g, '/');
      const volumeMount = `"${scriptDirectory}:/app"`;
      const command = `docker run --rm --name ${containerName} -v ${volumeMount} --user node ${imageName}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`JavaScript Error: ${error.message}`);
        } else if (stderr) {
          console.error(`JavaScript Error: ${stderr}`);
        } else {
          console.log(`JavaScript Output: \n ${stdout}`);
          publishOutput(stdout,channel);
        }
        
        cleanupContainer();
  
        fs.unlinkSync(scriptPath);
        fs.unlinkSync(dockerfilePath);
        
  
      });
  
      async function publishOutput(output) {
        try {
          const connection = await amqp.connect('amqp://localhost:5672');
          const channel = await connection.createChannel();
          const outputExchange = 'output_exchange'; // Specify the name of the output exchange
          const queue = 'output_queue'; // Specify the name of the output queue
      
          await channel.assertExchange(outputExchange, 'direct', { durable: false });
          await channel.assertQueue(queue);
          await channel.bindQueue(queue, outputExchange, '');
      
          const message = Buffer.from(output);
          channel.publish(outputExchange, '', message);
          console.log('Output published successfully');
        } catch (error) {
          console.error('Error publishing output:', error);
        }
      }
  
  
      function cleanupContainer() {
        const cleanupCommand = `docker rm ${containerName}`;
        exec(cleanupCommand, (cleanupError, stdout, stderr) => {
          if (cleanupError && cleanupError.code !== 1 && cleanupError.code !== 125) {
            console.error(`Error cleaning up container: ${cleanupError.message}`);
          }
        });
      }
       
    }
  }


  module.exports={
    runJavaScriptCode
  }