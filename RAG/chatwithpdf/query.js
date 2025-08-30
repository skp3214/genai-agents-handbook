import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import readlineSync from 'readline-sync';

// Load environment variables from .env file
dotenv.config();

// Initialize Google GenAI client
const ai = new GoogleGenAI({});
// Store chat history for context
const History = []

// Rewrites a follow-up question into a standalone question using LLM
async function transformQuery(question) {

    History.push({
        role: 'user',
        parts: [{ text: question }]
    })

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: History,
        config: {
            systemInstruction: `You are a query rewriting expert. Based on the provided chat history, rephrase the "Follow Up user Question" into a complete, standalone question that can be understood without the chat history.
    Only output the rewritten question and nothing else.`,
        },
    });

    History.pop()

    return response.text

}

// Handles the main chat logic: query rewriting, embedding, retrieval, and response generation
async function chatting(question) {

    // Rephrase the user's question to be standalone
    const enhancedQuery = await transformQuery(question)

    // Convert the question into vector embeddings
    const embeddingModel = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: 'text-embedding-004'
    })

    const queryVector = await embeddingModel.embedQuery(enhancedQuery);

    // Connect to Pinecone vector database
    const pinecone = new Pinecone();
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME)

    // Query Pinecone for top 10 most relevant document chunks
    const searchResults = await pineconeIndex.query({
        topK: 10,
        vector: queryVector,
        includeMetadata: true
    })

    // Build context from retrieved document chunks
    const context = searchResults.matches.map(match => match.metadata.text).join("\n\n---\n\n");

    // Add the enhanced user query to chat history
    History.push({
        role: 'user',
        parts: [{ text: enhancedQuery }]
    })

    // Generate answer using LLM, constrained to the retrieved context
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: History,
        config: {
            systemInstruction: `You have to behave like a Data Structure and Algorithm Expert.
    You will be given a context of relevant information and a user question.
    Your task is to answer the user's question based ONLY on the provided context.
    If the answer is not in the context, you must say "I could not find the answer in the provided document."
    Keep your answers clear, concise, and educational.
      
      Context: ${context}
      `,
        },
    });

    // Add model's response to chat history
    History.push({
        role: 'model',
        parts: [{ text: response.text }]
    })

    // Output the answer
    console.log("\n");
    console.log(response.text);
}

// Main loop: prompt user for input and handle chat
async function main() {
    const userProblem = readlineSync.question("Ask me anything --> ");
    await chatting(userProblem);
    main()
}

main();