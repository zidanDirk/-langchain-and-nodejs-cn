import dotenv from 'dotenv'
import { z } from "zod";
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import {
  StructuredOutputParser,
  OutputFixingParser,
} from "langchain/output_parsers";


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
      `生成虚拟人物的详细信息.\n{format_instructions}
       人物描述: {description}`,
    inputVariables: ["description"],
    partialVariables: { format_instructions: formatInstructions },
});


const model = new OpenAI({ 
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.5, 
    model: "gpt-3.5-turbo"
});

const input = await prompt.format({
 description: "一个男人，生活在英国",
});
const response = await model.call(input);

// console.log('生成的结果：', response)

try {

  console.log(await parser.parse(response));
 
 } catch (e) {
 
  console.error("解析失败，错误是: ", e);
 
  const fixParser = OutputFixingParser.fromLLM(
    new OpenAI({ 
      temperature: 0,
      model: "gpt-3.5-turbo",
      openAIApiKey: process.env.OPENAI_API_KEY,
    }),
    parser
  );
  const output = await fixParser.parse(response);
  console.log("修复后的输出是: ", output);
 
 }