import { wrapOpenAI } from "npm:braintrust";
import { OpenAI } from "npm:openai";
import { Eval } from "npm:braintrust";
import { Levenshtein } from "npm:autoevals";
import { readCSV } from "jsr:@vslinko/csv";
import * as dotenv from 'npm:dotenv';
dotenv.config();


interface Data {
  input: string;
  expected: string;
}

const f = await Deno.open("./testdata.csv");
const data_arr: Data[] = [];
for await (const row of readCSV(f)) {
  console.log("row:");
  let concatStr = '';
  for await (const cell of row) {
    concatStr += `\n${cell}`;
    console.log(cell);
  }
  data_arr.push({
    input: concatStr,
    expected: 'true',
  });
}

f.close();

 
async function callModel(
  input: string,
  {
    model,
    apiKey,
    temperature,
    systemPrompt,
  }: {
    model: string;
    apiKey: string;
    temperature: number;
    systemPrompt: string;
  }
) {
  const client = wrapOpenAI(
    new OpenAI({
      baseURL: "https://api.braintrust.dev/v1/proxy",
      apiKey, // Can use OpenAI, Anthropic, Mistral etc. API keys here
    })
  );
 
  const response = await client.chat.completions.create({
    model: model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: input,
      },
    ],
    temperature,
    seed: 123,
  });
  return response.choices[0].message.content || "";
}

Eval(
  "Is Bro a Hoe", // Replace with your project name
  {
    data: () => {
      return data_arr;
    },
    task: async (input) => {
      return (await callModel(
        input, {
          model: 'gpt-4o-mini',
          apiKey: process.env.OPENAI_API_KEY,
          temperature: 0.7,
          systemPrompt: `Hey your job is to determine whether or not the text below was written by an adult content creator. 
          This text is pulled directly from their Instagram Bio. Respond with just True/False. 
          I'm also going to include the results from their link in bio as well -- 
          if there's anything in the website contents which mentions their content being 'sensitive' or 'nsfw' or 'adult', 
          automatically return true.`
        })
        
      ); // Replace with your LLM call
    },
    scores: [Levenshtein],
  }
);


