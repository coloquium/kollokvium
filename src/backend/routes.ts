
import express, { response } from 'express';
import { openAIRequest } from './openAIRequest';
export const router = express.Router();

router.post("/translate/openai/", async (req, res) => {
    const { prompt } = req.body;
    const result = openAIRequest(prompt);
    result.then(data => {
        res.status(200).send(data);
    }).catch(err => {
        res.status(500).json({ error: err});
    });
});




