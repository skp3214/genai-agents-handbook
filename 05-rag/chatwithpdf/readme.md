# Embeddings and Vector Stores/Databases

## Table of Contents

1. [Document Q&A with RAG using Chroma](#document-qa-with-rag-using-chroma)
2. [Project Setup](#project-setup)
3. [Project](#project)

## Document Q&A with RAG using Chroma

### RAG
Two big limitations of LLMs are that they:

- only `know` the information they were trained on.
- have limited input context windows.

A way to address both of these limitations is to use a technique called **Retrieval Augmented Generation**, or `RAG`.

A `RAG` system has three stages:

- Indexing
- Retrieval
- Generation

Indexing happens ahead of time, and allows you to quickly look up relevant information at query-time. When a query comes in -> you retrieve relevant documents -> combine them with your instructions + user's query, -> and have the LLM generate a tailored answer in natural language using supplied answer.

This allows you to provide information that the model hasn't seen before, such as product-specific knowledge or live weather updates.

## Project Setup

### Install the SDK
```bash
pip install -qU "google-genai==1.7.0" "chromadb==0.6.3"
```

### Import the SDK and some helpers for rendering text
```py
from google import genai
from google.genai import types

from IPython.display import HTMl, Markdown, display
```

### Setup Your API Key
```py
client = genai.Client(api_key = "Google API Key")
```

## Project

### Data
Here is a small set of documents you will use to create an embedding database.
```py
DOCUMENT1 = """ Operating the Climate Control System  Your Googlecar has a climate control system that allows you to adjust the temperature and airflow in the car. 
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

### Creating the embedding database with ChromaDB

#### Embedding Function
Create a `custom function` to generate embeddings with the Gemini API.
In this task, you are implementing a retrieval system, so the task_type for generating the document embeddings is `retrieval_document`.
Later, you will use `retrieval_query` for the query embeddings

```py
from chromadb import Documents, EmbeddingFunction, Embeddings
from google.api_core import retry

from google.genai import types

is_retriable = lambda e: (isinstance(e, genai.errors.APIError) and e.code in {429, 503})

class GeminiEmbeddingFunction(EmbeddingFunction):
    # Specify whether to generate embeddings for documents, or queries.

    document_mode = True

    @retry.Retry(predicate = is_retriable)
    def __call__(self, input:Documents)->Embeddings:

        if self.document_mode:
            embedding_task = "retrieval_document"
        else:
            embedding_task = "retrieval_query"

        
        response = client.models.embed_content(
            model = "models/text-embedding-004" # it keeps changing, so use updated one. 
            contents = input,
            config = types.EmbedContentConfig(
                task_type = embedding_task,
            ),
        )

        return [e.values for e in response.embeddings]
```

#### Storing in the Vector Database
```py
import chromadb

DB_NAME = "googlecardb"

embed_fn = GeminiEmbeddingFunction()
embed_fn.document_mode = True

chroma_client = chromadb.Client()

db = chroma_client.get_or_create_collection(name = DB_NAME, embedding_function = embed_fn)

db.add(documents=documents, ids=[str(i) for i in range(len(documents))])
```

### Retrieval: Find relevant documents
To search the chroma database, you need your queries to be in embedding form. 
Note that you also switch to the retrieval_query mode of embedding generation.

```py
# Switch to the query mode when generating embeddings.

embed_fn.document_mode = False

query = "How do you use the touchscreen to play music?"

result = db.query(query_texts=[query], n_results=1)

[all_passages] = result["documents"]

print(all_passages[0])
```

### Augmented generation: Answer the question
Now that you have found a relevant passage from the set of documents (the retrieval step), you can now assemble a generation prompt to have the Gemini API generate a final answer. 

```py
query_oneline = query.replace("\n"," ")

prompt = f"""
You are a helpful and informative bot that answers questions using text from the reference passage included below.
Be sure to respond in a complete sentence, being comprehensive tone, including all relevant background information. 
However, you are talking to a non-technical audience, so be sure to break down complicated concepts and strike a friendly and conversational tone. If the passage is irrelevant to the answer you may ignore it.

QUESTION: {query_oneline}
"""

for passage in all_passages:
    passage_oneline  = passage.replace("\n"," ")
    prompt += f"PASSAGE: {passage_oneline}\n"

print(prompt)
```

#### Content Generation
```py
answer = client.models.generate_content(
    model = "gemini-2.0-flash",
    contents = prompt
)

print(answer)
```