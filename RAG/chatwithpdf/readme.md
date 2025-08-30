# Chat with PDF 🤖📄

A sophisticated RAG (Retrieval-Augmented Generation) application that enables interactive conversations with PDF documents using LangChain, Google Gemini AI, and Pinecone vector database.

# [About RAG in Details : Click Here](https://certain-mechanic-42c.notion.site/RAG-System-23c3a78e0e22801caa04d16f95df1825)

## 🌟 Features

- **PDF Document Processing**: Automatically loads and processes PDF documents
- **Intelligent Text Chunking**: Splits documents into optimized chunks for better retrieval
- **Vector Embeddings**: Uses Google's text-embedding-004 model for semantic understanding
- **Conversational Memory**: Maintains chat history for contextual follow-up questions
- **Query Enhancement**: Automatically rewrites follow-up questions for better standalone understanding
- **Semantic Search**: Leverages Pinecone vector database for efficient similarity search
- **Interactive CLI**: Simple command-line interface for real-time conversations

## 🏗️ Architecture

The application follows a two-phase architecture:

1. **Document Ingestion Phase** (`index.js`):
   - Loads PDF documents
   - Splits text into manageable chunks
   - Generates embeddings using Google Gemini
   - Stores vectors in Pinecone database

2. **Query Phase** (`query.js`):
   - Processes user questions
   - Enhances queries using chat history
   - Retrieves relevant document chunks
   - Generates contextual responses

## 🛠️ Technology Stack

- **LangChain**: Document processing and text splitting
- **Google Gemini AI**: Embeddings and text generation
- **Pinecone**: Vector database for similarity search
- **Node.js**: Runtime environment
- **PDF-Parse**: PDF document processing

## 📋 Prerequisites

- Node.js (v14 or higher)
- Google Gemini API key
- Pinecone account and API key
- PDF document to chat with

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chatwithpdf
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Copy the sample environment file:
   ```bash
   cp .env.sample .env
   ```
   
   Update the `.env` file with your API keys:
   ```env
   PINECONE_API_KEY=your_pinecone_api_key
   GEMINI_API_KEY=your_gemini_api_key
   PINECONE_INDEX_NAME=your_index_name
   PINECONE_ENVIRONMENT=your_pinecone_environment
   ```

## 📖 Usage

### Step 1: Document Ingestion

First, update the PDF path in `index.js` to point to your document:

```javascript
const PDF_PATH = 'path/to/your/document.pdf';
```

Then run the ingestion script:

```bash
node index.js
```

This will:
- Load your PDF document
- Split it into chunks
- Generate embeddings
- Store vectors in Pinecone

### Step 2: Start Chatting

Once the document is processed, start the interactive chat:

```bash
node query.js
```

The application will prompt you with:
```
Ask me anything -->
```

Type your questions and press Enter. The AI will respond based on the content of your PDF document.

### Example Conversation

```
Ask me anything --> What is a binary search tree?

A binary search tree (BST) is a hierarchical data structure where each node has at most two children, referred to as the left child and right child. The key property is that for any node, all values in the left subtree are less than the node's value, and all values in the right subtree are greater than the node's value...

Ask me anything --> How does insertion work in BST?

Insertion in a BST follows the search property. Starting from the root, if the new value is less than the current node, we go left; if greater, we go right. This process continues until we find an empty spot where we can insert the new node...
```

## 📁 Project Structure

```
chatwithpdf/
├── index.js           # Document ingestion script
├── query.js           # Interactive chat interface
├── package.json       # Project dependencies
├── .env.sample        # Environment variables template
├── .env              # Your API keys (not tracked)
├── .gitignore        # Git ignore rules
├── Dsa.pdf           # Sample PDF document
└── readme.md         # This file
```

## 🔧 Configuration

### Chunk Settings

You can adjust the text chunking parameters in `index.js`:

```javascript
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,      // Size of each chunk
    chunkOverlap: 200     // Overlap between chunks
});
```

### Retrieval Settings

Modify the number of relevant chunks retrieved in `query.js`:

```javascript
const searchResults = await pineconeIndex.query({
    topK: 10,             // Number of chunks to retrieve
    vector: queryVector,
    includeMetadata: true
});
```

## 🚨 Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure your `.env` file contains valid API keys
2. **Pinecone Connection**: Verify your Pinecone index name and environment
3. **PDF Path**: Check that the PDF path in `index.js` is correct
4. **Memory Issues**: For large PDFs, consider reducing chunk size

### Error Messages

- `"I could not find the answer in the provided document."` - The AI couldn't find relevant information in your PDF
- Connection errors - Check your internet connection and API keys


