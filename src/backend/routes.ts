
import express from 'express';
import { openAIRequest } from './openAIRequest';
export const router = express.Router();

router.post("/translate/openai/",async (req,res)=> {
    const { prompt } = req.body;
    const result = await openAIRequest(prompt);
    res.send(result);
});


    

