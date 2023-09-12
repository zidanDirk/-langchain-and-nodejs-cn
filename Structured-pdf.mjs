import dotenv from 'dotenv'
import { z } from "zod";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { PromptTemplate } from "langchain/prompts";
import { OpenAI } from "langchain/llms/openai";
import {
    StructuredOutputParser,
    OutputFixingParser,
  } from "langchain/output_parsers";

const loader = new PDFLoader("./elon.pdf");
const docs = await loader.load();
dotenv.config()


const parser = StructuredOutputParser.fromZodSchema(
    z.object({
      name: z.string().describe("Human name"),
      surname: z.string().describe("Human surname"),
      age: z.number().describe("Human age"),
      appearance: z.string().describe("Human appearance description"),
      shortBio: z.string().describe("Short bio secription"),
      university: z.string().optional().describe("University name if attended"),
      gender: z.string().describe("Gender of the human"),
      interests: z
        .array(z.string())
        .describe("json array of strings human interests"),
    })
);

const formatInstructions = parser.getFormatInstructions();


const prompt = new PromptTemplate({
    template:
      "Extract information from the person description.\n{format_instructions}\nThe response should be presented in a markdown JSON codeblock.\nPerson description: {inputText}",
    inputVariables: ["inputText"],
    partialVariables: { format_instructions: formatInstructions },
  });

  const model = new OpenAI({ 
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.5, 
    model: "gpt-3.5-turbo", 
    reduce_k_below_max_tokens: true,
    maxTokens: 2000
});

  const input = await prompt.format({
    inputText: docs[0].pageContent,
  });

const response = await model.call(input);

try {
    console.log(await parser.parse(response));
   } catch (e) {
    console.error("解析失败，错误是: ", e);

    const fixParser = OutputFixingParser.fromLLM(
    new OpenAI({ 
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0, model: "gpt-3.5-turbo", maxTokens: 2000 }),
        parser
    );
    const output = await fixParser.parse(response);
    console.log("Fixed output: ", output);

}