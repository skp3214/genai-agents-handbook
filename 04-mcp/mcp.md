# MCP AI Agent System vs Monolithic AI Agent

## Table of Contents

1. [MCP vs Monolithic: Overview](#mcp-vs-monolithic-overview)
2. [Scenario 1: Monolithic AI Agent](#scenario-1-monolithic-ai-agent)
3. [Scenario 2: MCP AI Agent System](#scenario-2-mcp-ai-agent-system)
4. [Comparison Breakdown](#comparison-breakdown)
5. [Why Choose MCP?](#why-choose-mcp)
6. [Project Setup](#project-setup)
7. [Understanding Model Context Protocol (MCP)](#understanding-model-context-protocol-mcp)
8. [Using MCP with Your Agent](#using-mcp-with-your-agent)
9. [Extending to Other MCP Servers](#extending-to-other-mcp-servers)

## MCP vs Monolithic: Overview

This guide explains the key differences between a **traditional monolithic AI agent** and a **modular, scalable MCP (Model Context Protocol)** system using clear analogies and practical examples.

## Scenario 1: Monolithic AI Agent

**Formula:**  
> AI Agent = LLM + Local Function Calling

**Analogy:** A **solo craftsman** working alone in their workshop.

- **The Brain (LLM):** The craftsman's knowledge and skill — knows how to build a chair and what tools are needed.
- **The Hands (Local Functions):** Tools physically in the workshop (saw, hammer, drill) — immediately accessible.
- **The Connection:** Direct internal function calls (the craftsman's nervous system).

**Key Point:**  
Everything is tightly integrated. Tools are private to this agent and cannot be shared.

## Scenario 2: MCP AI Agent System

**Formula:**  
> MCP System = MCP Server (Tools) + MCP Client (LLM)

**Analogy:** A **general contractor** building a house.

- **Tool Provider (MCP Server):** Independent subcontractors (e.g., electrician, plumber) with their own specialized tools.
- **AI Agent (MCP Client):** The general contractor who:
  1. **Discovers** available specialists
  2. **Plans** using the LLM
  3. **Delegates** via network calls
  4. **Verifies** completion

**Key Point:**  
Planner (client) and doer (server) are decoupled. Tools are reusable across multiple agents.

## Comparison Breakdown

| Component         | Monolithic Agent                              | MCP System                                      |
|-------------------|-----------------------------------------------|-------------------------------------------------|
| **The "Brain"**   | LLM (e.g., Gemini)                            | LLM inside the Client                           |
| **The "Hands"**   | Local functions                               | Remote services (MCP Servers)                   |
| **The Connection**| Direct internal call                          | Network request (Client → Server)               |
| **Core Concept**  | Single integrated unit                        | Distributed, reusable services                  |

## Why Choose MCP?

- **Separation of concerns:** AI reasoning and tool execution are decoupled
- **Extensibility:** Add new tools without modifying the agent
- **Scalability:** Multiple agents can use the same servers
- **Interoperability:** Standardized protocol enables community-built integrations

## Project Setup

### Install the ADK
```python
pip install google-adk
```

### Import ADK Components
```python
import uuid
from google.genai import types

from google.adk.agents import LlmAgent
from google.adk.models.google_llm import Gemini
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.tool_context import ToolContext
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

from google.adk.apps.app import App, ResumabilityConfig
from google.adk.tools.function_tool import FunctionTool
```

### Configure Retry Options
```python
retry_config = types.HttpRetryOptions(
    attempts=5,
    exp_base=7,
    initial_delay=1,
    http_status_codes=[429, 500, 503, 504],
)
```

## Understanding Model Context Protocol (MCP)

MCP is an **open standard** that allows agents to connect to external tools without writing custom API clients.

**Benefits:**
- Access live data from databases, APIs, and services
- Use community-built integrations via standardized interfaces
- Scale capabilities by connecting to multiple specialized servers

**How it works:**  
MCP Client (your agent) ↔ Network ↔ MCP Server (provides tools)

## Using MCP with Your Agent

### Step 1: Choose an MCP Server
Example: **Everything MCP Server** (`@modelcontextprotocol/server-everything`) — provides a `getTinyImage` tool for testing.

More servers: [modelcontextprotocol.io/examples](https://modelcontextprotocol.io/examples)

### Step 2: Create the MCP Toolset
```python
mcp_image_server = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command="npx",
            args=[
                "-y",
                "@modelcontextprotocol/server-everything",
            ],
            tool_filter=["getTinyImage"],
        ),
        timeout=30,
    )
)
```

**Behind the scenes:**
- Launches the server via `npx`
- Establishes communication
- Discovers available tools
- Automatically integrates into the agent

### Step 3: Add MCP Tool to Agent
```python
image_agent = LlmAgent(
    model=Gemini(model="gemini-1.5-flash-lite", retry_options=retry_config),
    name="image_agent",
    instruction="Use the MCP Tool to generate images for user queries",
    tools=[mcp_image_server],
)
```

### Step 4: Run the Agent
```python
runner = InMemoryRunner(agent=image_agent)
response = await runner.run_debug("Provide a sample tiny image", verbose=True)
```

### Step 5: Display the Image
```python
from IPython.display import display, Image as IPImage
import base64

for event in response:
    if event.content and event.content.parts:
        for part in event.content.parts:
            if hasattr(part, "function_response") and part.function_response:
                for item in part.function_response.response.get("content", []):
                    if item.get("type") == "image":
                        display(IPImage(data=base64.b64decode(item["data"])))
```

## Extending to Other MCP Servers

The same pattern applies — only `connection_params` change.

### Kaggle MCP Server (Dataset/Notebook Operations)
```python
McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command='npx',
            args=['-y', 'mcp-remote', 'https://www.kaggle.com/mcp'],
        ),
        timeout=30,
    )
)
```

### GitHub MCP Server (PR/Issue Analysis)
```python
McpToolset(
    connection_params=StreamableHTTPServerParams(
        url="https://api.githubcopilot.com/mcp/",
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "X-MCP-Toolsets": "all",
            "X-MCP-Readonly": "true"
        },
    ),
)
```

**Conclusion:** MCP transforms agents from isolated craftsmen into collaborative contractors — enabling modular, scalable, and future-proof AI systems.
