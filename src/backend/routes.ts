
import express from 'express';
import { openAIRequest } from './openAIRequest';
export const router = express.Router();

router.post("/translate/openai/", async (req, res) => {
    const { prompt } = req.body;
    const request = openAIRequest(prompt);
    request.then(aiResponse => {
        res.send(aiResponse);
    }).catch(err => {
        res.status(500);
        res.send(err);
    });

});




