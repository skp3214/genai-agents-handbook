import readlineSync from 'readline-sync';
import { GoogleGenAI, Type } from '@google/genai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
const ai = new GoogleGenAI({ apiKey: "AIzaSyA1kCy96CHkhwNKYYLh7eTWgEO-nCbOiRE" });

let tools = [];
const mcpClient = new Client({
    name: "example-client",
    version: "1.0.0",
})

mcpClient.connect(new SSEClientTransport(new URL("http://localhost:3000/sse")))
    .then(async () => {
        console.log("connected to server")
        tools = (await mcpClient.listTools()).tools.map(tool => {
            return {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: tool.inputSchema.type,
                    properties: tool.inputSchema.properties,
                    required: tool.inputSchema.required
                }
            }
        })
        main();
    })

let runAiAgent = async () => {
    const userPrompt = readlineSync.question("You: ");

    let contents = [
        {
            role: "user",
            parts: [
                {
                    text: userPrompt,
                },
            ],
        },
    ];

    while (true) {
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                tools: [
                    {
                        functionDeclarations: tools
                    }
                ]
            },
        });

        if(result.functionCalls && result.functionCalls.length > 0) {
            const functionCall = result.functionCalls[0];

            const toolResult = await mcpClient.callTool({
                name: functionCall.name,
                arguments: functionCall.args
            });

            contents.push({
                role: "function",
                parts: [{
                    functionResponse: {
                        name: functionCall.name,
                        response: toolResult.content[0]
                    }
                }]
            });
        }
        else{
            const responseText = result.text;
            if (responseText) {
                console.log("AI:", responseText);
                break; 
            }
        }
    }
}


let main = async () => {
    while (true) {
        await runAiAgent();
    }
};
