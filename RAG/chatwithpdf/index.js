import {PDFLoader} from '@langchain/community/document_loaders/fs/pdf';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv'
dotenv.config();

async function saveDocumentIntoVectorDatabase(){

    // Load the PDF and extract its raw data.
    const PDF_PATH = 'D:\\Lovely Professional University\\Educational\\GenAI Program By Google Cloud\\RAG\\chatwithpdf\\Dsa.pdf';
    const pdfLoader = new PDFLoader(PDF_PATH);
    const rawDocs = await pdfLoader.load();
    

    // Split the data into chunks.
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize:1000,
        chunkOverlap:200
    })

    const chunkDocs = await textSplitter.splitDocuments(rawDocs);

    // Create an embedding model.
    const embeddingModel=new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model:'text-embedding-004'
    })


    // Connect to the vector database.
    const pinecone = new Pinecone();
    const pineconeIndex=pinecone.Index(process.env.PINECONE_INDEX_NAME)


    // Save the data into the vector database.
    await PineconeStore.fromDocuments(chunkDocs,embeddingModel,{
        pineconeIndex,
        maxConcurrency:5,
    })

}

saveDocumentIntoVectorDatabase();