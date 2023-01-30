
import express, { response } from 'express';
import { openAIRequest } from './openAIRequest';
import cors from 'cors';

export const router = express.Router();

let corsOptions = {
    origin: [
        'http://localhost:1337', 'https://kollokium.se/', 'https://kollokvium.herokuapp.com/'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}


router.get("/key/openai/", async (req, res) => {
    try{
        res.status(200).send(process.env.OPENAIKEY.length);
    }catch(err){
        res.status(500).send(err);
    }
     
});


router.post("/translate/openai/", cors(corsOptions), async (req, res) => {
    const { prompt } = req.body;
    const result = openAIRequest(prompt);
    result.then(data => {
        res.status(200).send(data);
    }).catch(err => {
        res.status(500).json({ error: err });
    });
});




