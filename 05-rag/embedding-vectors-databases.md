# Embeddings and Vector Databases for RAG

## Agenda

This guide introduces **Retrieval-Augmented Generation (RAG)** using Gemini embeddings and ChromaDB — a simple yet powerful way to let LLMs answer questions based on your private documents.

**Why use RAG?**  
Large language models have two major limitations:
- They only know what was in their training data (no up-to-date or proprietary knowledge)
- They have limited context windows

RAG solves both by combining:
- **Retrieval**: Quickly find relevant documents from a large collection
- **Generation**: Feed those documents to the LLM to produce accurate, grounded answers

You'll build a small Q&A system over Googlecar user manual excerpts.

**What you will learn:**
- Setting up Gemini and ChromaDB
- Generating embeddings with Gemini
- Building and querying a vector database
- Implementing a complete RAG pipeline (retrieve → augment prompt → generate)

## Table of Contents

1. [What is RAG?](#what-is-rag)
2. [Project Setup](#project-setup)
3. [Project: Document Q&A System](#project-document-qa-system)

## What is RAG?

**Retrieval-Augmented Generation (RAG)** has three stages:

1. **Indexing** (done once): Convert documents into embeddings and store in a vector database
2. **Retrieval** (at query time): Find the most relevant document chunks for the user's question
3. **Generation**: Combine the retrieved passages with the question and send to the LLM

This enables accurate answers on private or up-to-date data without retraining the model.

## Project Setup

### Install Required Packages
```bash
pip install -qU "google-genai==1.7.0" "chromadb==0.6.3"
```

### Import Modules
```python
from google import genai
from google.genai import types
from chromadb import Documents, EmbeddingFunction, Embeddings
from google.api_core import retry
import chromadb

from IPython.display import HTML, Markdown, display
```

### Configure API Key
```python
client = genai.Client(api_key="YOUR_GOOGLE_API_KEY")
```

## Project: Document Q&A System

### Sample Documents
```python
DOCUMENT1 = """Operating the Climate Control System  Your Googlecar has a climate control system that allows you to adjust the temperature and airflow in the car. 
To operate the climate control system, use the buttons and knobs located on the center console.
Temperature: The temperature knob controls the temperature inside the car. 
Turn the knob clockwise to increase the temperature or counterclockwise to decrease the temperature. Airflow: The airflow knob controls the amount of airflow inside the car. 
Turn the knob clockwise to increase the airflow or counterclockwise to decrease the airflow. Fan speed: The fan speed knob controls the speed of the fan. 
Turn the knob clockwise to increase the fan speed or counterclockwise to decrease the fan speed. Mode: The mode button allows you to select the desired mode. 
The available modes are: 
Auto: The car will automatically adjust the temperature and airflow to maintain a comfortable level. 
Cool: The car will blow cool air into the car. 
Heat: The car will blow warm air into the car. 
Defrost: The car will blow warm air onto the windshield to defrost it."""

DOCUMENT2 = '''Your Googlecar has a large touchscreen display that provides access to a variety of features, including navigation, entertainment, and climate control. 
To use the touchscreen display, simply touch the desired icon.  
For example, you can touch the "Navigation" icon to get directions to your destination or touch the "Music" icon to play your favorite songs.'''

DOCUMENT3 = """Shifting Gears Your Googlecar has an automatic transmission. 
To shift gears, simply move the shift lever to the desired position.  
Park: This position is used when you are parked. The wheels are locked and the car cannot move. 
Reverse: This position is used to back up. Neutral: This position is used when you are stopped at a light or in traffic. 
The car is not in gear and will not move unless you press the gas pedal. 
Drive: This position is used to drive forward. 
Low: This position is used for driving in snow or other slippery conditions."""

documents = [DOCUMENT1, DOCUMENT2, DOCUMENT3]
```

### Create Gemini Embedding Function

```python
is_retriable = lambda e: (isinstance(e, genai.errors.APIError) and e.code in {429, 503})

class GeminiEmbeddingFunction(EmbeddingFunction):
    document_mode = True  # Toggle between document and query mode

    @retry.Retry(predicate=is_retriable)
    def __call__(self, input: Documents) -> Embeddings:
        task = "retrieval_document" if self.document_mode else "retrieval_query"
        
        response = client.models.embed_content(
            model="models/text-embedding-004",  # Check for latest version if needed
            contents=input,
            config=types.EmbedContentConfig(task_type=task),
        )
        return [e.values for e in response.embeddings]
```

### Build the Vector Database (Indexing)

```python
DB_NAME = "googlecar_db"

embed_fn = GeminiEmbeddingFunction()
embed_fn.document_mode = True  # Use document mode for indexing

chroma_client = chromadb.Client()
db = chroma_client.get_or_create_collection(name=DB_NAME, embedding_function=embed_fn)

db.add(documents=documents, ids=[str(i) for i in range(len(documents))])
print(f"Indexed {len(documents)} documents")
```

### Retrieval: Find Relevant Documents

```python
embed_fn.document_mode = False  # Switch to query mode

query = "How do you use the touchscreen to play music?"

result = db.query(query_texts=[query], n_results=1)
[relevant_passages] = result["documents"]

print("Retrieved passage:")
print(relevant_passages[0])
```

### Augmented Generation: Answer Using Retrieved Context

```python
query_clean = query.replace("\n", " ")

prompt = f"""
You are a helpful and informative bot that answers questions using text from the reference passage included below.
Be sure to respond in complete sentences with a friendly, conversational tone. 
Include all relevant background information while being comprehensive yet concise.
If the passage is irrelevant, you may ignore it.

QUESTION: {query_clean}
"""

for passage in relevant_passages:
    passage_clean = passage.replace("\n", " ")
    prompt += f"PASSAGE: {passage_clean}\n"

print("Generated prompt sent to model:")
print(prompt)
print("\n" + "="*60 + "\n")

# Generate final answer
response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents=prompt
)

print("Final Answer:")
print(response.text)
```

**You're now running a complete RAG system!**  
You can scale this by adding more documents, chunking large texts, or using persistent Chroma storage.

This pattern is the foundation for chatbots with private knowledge bases, document search tools, and up-to-date Q&A systems.
