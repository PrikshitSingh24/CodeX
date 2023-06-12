const amqp = require("amqplib");
const { exec } = require('child_process');
const { spawn } = require('child_process');
const { channel } = require("diagnostics_channel");
const fs = require('fs');
const { dirname } = require("path");
const path = require('path');

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

function runJavaScriptCode(userCode) {
  const scriptPath = path.join(__dirname, 'user_code.js');
  fs.writeFileSync(scriptPath, userCode);

  const containerName = `js-exec-container-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  const dockerfilePath = path.join(__dirname, 'Dockerfile');
  const imageName = 'my-custom-image';

  // Generate the Dockerfile dynamically
  const dockerfileContent = `
    FROM node:14
    WORKDIR /app
    COPY consumers/user_code.js /app/user_code.js
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
      }
      
      cleanupContainer();

      fs.unlinkSync(scriptPath);
      fs.unlinkSync(dockerfilePath);
      

    });


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

module.exports = {
  consumerFunction
};

