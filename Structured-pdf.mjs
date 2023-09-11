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
      name: z.string().describe("人类的名字"),
      surname: z.string().describe("人类的姓氏"),
      age: z.number().describe("人类的年龄"),
      appearance: z.string().describe("人类的外形描述"),
      shortBio: z.string().describe("简介"),
      university: z.string().optional().describe("就读大学的名称"),
      gender: z.string().describe("人类的性别"),
      interests: z
        .array(z.string())
        .describe("关于人类兴趣的 json 数组"),
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
    maxTokens: 2000 
});

  const input = await prompt.format({
    inputText: docs[0].pageContent,
  });

const response = await model.call(input);

console.log(response)

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