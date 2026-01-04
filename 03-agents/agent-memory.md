# Agent Memory

## Table of Contents

1. [Understanding Memory Management](#understanding-memory-management)
2. [Project Setup](#project-setup)
3. [Implementing Memory in Your Agent](#implementing-memory-in-your-agent)
4. [Automating Memory Storage with Callbacks](#automating-memory-storage-with-callbacks)
5. [Manual Memory Search](#manual-memory-search)
6. [Memory Consolidation](#memory-consolidation)

---

## Understanding Memory Management

**The Problem**


In the previous part, you learned how **Sessions**
 provide short-term memory within a single conversation thread. However, sessions are isolated and temporary—once a conversation ends or a new session begins, the agent loses access to prior interactions.

**Why does this matter**
? Users expect agents to remember key details across multiple conversations, such as preferences, facts, or ongoing tasks. Without long-term storage, agents cannot build cumulative knowledge or provide personalized experiences over time.

In ADK, **Sessions**
 handle short-term context, while **Memory**
 provides long-term, searchable knowledge that persists across conversations.

**What is Memory**

Memory is a persistent knowledge store that allows agents to retain and retrieve important information from past interactions, even across different sessions.

Key characteristics:
- **Cross-conversation recall**
: Access facts from any previous conversation with the same user.
- **Searchable**
: Supports querying stored knowledge (keyword-based in simple implementations, semantic in advanced ones).
- **Persistent**
: Survives application restarts (when using backed storage).
- **Consolidatable**
: Advanced implementations can extract key facts and summarize raw conversations.

In ADK, Memory works alongside Sessions: raw conversations live in Sessions, while extracted or stored knowledge lives in Memory.

---

## Project Setup

**Install the SDK**

```py
pip install google-adk
```

**Import ADK Components**

```py
from google.adk.agents import LlmAgent
from google.adk.models.google_llm import Gemini
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.memory import InMemoryMemoryService
from google.adk.tools import load_memory, preload_memory
from google.genai import types
```

**Helper Functions**

```py
async def run_session(
    runner_instance: Runner, user_queries: list[str] | str, session_id: str = "default"
):
    print(f"\n### Session: {session_id}")

    # Create or retrieve session
    try:
        session = await session_service.create_session(
            app_name=APP_NAME, user_id=USER_ID, session_id=session_id
        )
    except:
        session = await session_service.get_session(
            app_name=APP_NAME, user_id=USER_ID, session_id=session_id
        )

    if isinstance(user_queries, str):
        user_queries = [user_queries]

    for query in user_queries:
        print(f"\nUser > {query}")
        query_content = types.Content(role="user", parts=[types.Part(text=query)])

        async for event in runner_instance.run_async(
            user_id=USER_ID, session_id=session.id, new_message=query_content
        ):
            if event.is_final_response() and event.content and event.content.parts:
                text = event.content.parts[0].text
                if text and text != "None":
                    print(f"Model > {text}")
```

**Configure Retry Options**

```py
retry_config = types.HttpRetryOptions(
    attempts=5,
    exp_base=7,
    initial_delay=1,
    http_status_codes=[429, 500, 503, 504],
)
```

---

## Implementing Memory in Your Agent

**Step 1: Initialize Memory and Session Services**

```py
APP_NAME = "MemoryDemoApp"
USER_ID = "demo_user"

# Memory service (InMemory for demo; replace with production service later)
memory_service = InMemoryMemoryService()

# Session service
session_service = InMemorySessionService()

# Simple agent
agent = LlmAgent(
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    name="MemoryAgent",
    instruction="Answer user questions in simple words.",
)

# Runner with both services
runner = Runner(
    agent=agent,
    app_name=APP_NAME,
    session_service=session_service,
    memory_service=memory_service,
)
```

**Step 2: Ingest Session Data into Memory**

After a conversation, transfer it to long-term memory:

```py
# Have a conversation
await run_session(runner, "My favorite color is blue-green.", "session-01")

# Retrieve the session
session = await session_service.get_session(
    app_name=APP_NAME, user_id=USER_ID, session_id="session-01"
)

# Save to memory
await memory_service.add_session_to_memory(session)
```

**Step 3: Enable Memory Retrieval**

Add retrieval tools to the agent:

- `load_memory`: Agent calls it only when needed (reactive).
- `preload_memory`: Automatically loads relevant memories before every turn (proactive).

```py
# Agent with reactive memory retrieval
memory_agent = LlmAgent(
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    name="MemoryAgent",
    instruction="Use load_memory if you need information from past conversations.",
    tools=[load_memory],  # or [preload_memory] for proactive
)

runner = Runner(
    agent=memory_agent,
    app_name=APP_NAME,
    session_service=session_service,
    memory_service=memory_service,
)
```

**Testing Cross-Session Recall**

```py
# New session — agent should recall from memory
await run_session(runner, "What is my favorite color?", "session-02")
```

**Automating Memory Storage with Callbacks**

Manually saving sessions works for demos, but production needs automation.

```py
async def auto_save_to_memory(callback_context):
    await callback_context._invocation_context.memory_service.add_session_to_memory(
        callback_context._invocation_context.session
    )

# Agent with automatic saving + proactive retrieval
auto_agent = LlmAgent(
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    name="AutoMemoryAgent",
    instruction="Answer user questions.",
    tools=[preload_memory],
    after_agent_callback=auto_save_to_memory,  # Auto-save after each turn
)

auto_runner = Runner(
    agent=auto_agent,
    app_name=APP_NAME,
    session_service=session_service,
    memory_service=memory_service,
)
```

**Testing Automated Memory**

```py
# First conversation (automatically saved)
await run_session(auto_runner, "I gifted my nephew a robot toy for his birthday.", "auto-01")

# New session — should recall automatically
await run_session(auto_runner, "What did I gift my nephew?", "auto-02")
```

---

## Manual Memory Search

For debugging:

```py
search_results = await memory_service.search_memory(
    app_name=APP_NAME, user_id=USER_ID, query="favorite color"
)

for memory in search_results.memories:
    if memory.content and memory.content.parts:
        print(memory.content.parts[0].text)
```

**Memory Consolidation (Conceptual)**

Raw storage keeps every message → grows quickly and becomes noisy.

**Consolidation**
 (available in production services like Vertex AI Memory Bank):
- Uses LLM to extract key facts.
- Removes chit-chat and redundancy.
- Stores concise, actionable memories.

Example:
- Raw: 20 messages about preferences
- Consolidated: "User prefers blue-green color", "Allergic to peanuts"

The API remains the same — only the internal processing improves.

**Summary**

You now know how to:
- Initialize and connect MemoryService
- Manually or automatically ingest session data into memory
- Enable retrieval with `load_memory` (reactive) or `preload_memory` (proactive)
- Automate storage using callbacks
- Understand the benefits of memory consolidation

Memory turns one-off conversations into persistent, personalized agent experiences. In production, combine it with managed services for semantic search and automatic consolidation.