const express=require("express");
const app=express();
const amqp=require("amqplib");
const router=express.Router();
const path=require("path");
const WebSocket = require("ws");
const {publishFunction}=require("./publisher")
const { setupOutputListener } = require("./outputListener");
const { consumerFunction } = require("./consumers/consumer_node");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

router.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname+'/page.html'));
});
app.use('/',router);

router.post('/submit-code',async(req,res)=>{
    try{
        const userCode=req.body.code;
        const language=req.body.language;
        console.log(userCode);
        await publishFunction(userCode,language);
         
        
        res.json({ message: 'Code submitted successfully' });
    }catch(e){
        console.log(e);
    }
})

consumerFunction();

setupOutputListener(app);


router.get("/output", (req, res) => {
    const output = req.app.locals.output;
    res.send(output);
  });


// Function to send output to all connected clients

app.listen(3000,()=>{
    console.log('server has started on port 3000');
})