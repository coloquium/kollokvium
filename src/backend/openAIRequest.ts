import { Configuration, OpenAIApi } from "openai";

export const openAIRequest = async (prompt: string) => {
    const configuration = new Configuration({
        apiKey: process.env.OPENAIKEY || ""
    });
    const openai = new OpenAIApi(configuration);

    console.log(`${prompt} ${process.env.OPENAIKEY}`)

    const completionResponse = await openai.createCompletion({
        echo: false,
        model: "text-davinci-003",
        prompt: prompt,
        temperature: .9,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: false,
        stop: ["{}"],
    });
    return completionResponse.data;
}
