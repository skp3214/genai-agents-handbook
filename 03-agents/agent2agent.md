# Agent2Agent (A2A) Communication

## Table of Contents

1. [Understanding Agent2Agent Protocol](#understanding-agent2agent-protocol)
2. [When to Use A2A vs Local Sub-Agents](#when-to-use-a2a-vs-local-sub-agents)
3. [Project Setup](#project-setup)
4. [Exposing an Agent via A2A](#exposing-an-agent-via-a2a)
5. [Consuming a Remote Agent](#consuming-a-remote-agent)
6. [Testing A2A Communication](#testing-a2a-communication)
7. [Key Benefits of A2A](#key-benefits-of-a2a)

---

## Understanding Agent2Agent Protocol

**The Problem**


As agent systems grow more complex, a single agent cannot handle every task efficiently. Real-world applications require collaboration between specialized agents (e.g., product catalog, inventory, support, payment). However, challenges arise when:

- Agents are built by different teams or organizations
- Agents run in different environments or languages
- Agents need to communicate over networks
- There is no standard way for agents to discover and use each other's capabilities

Without a standardized protocol, integrating agents becomes tightly coupled, fragile, and difficult to scale.

**What is Agent2Agent (A2A) Protocol?**

The **Agent2Agent (A2A)**
 protocol is a standardized, framework-agnostic way for agents to communicate and collaborate over networks. It enables:

- **Remote agent invocation**
: One agent calls another as if it were a local tool
- **Cross-framework/language support**
: Works regardless of implementation (Python, Java, Node.js, etc.)
- **Formal contracts**
: Agent cards describe capabilities and communication rules
- **Discovery**
: Agents publish their metadata at standard endpoints

A2A turns agents into interoperable microservices.

**When to Use A2A vs Local Sub-Agents**

| Scenario                        | Use A2A                              | Use Local Sub-Agents                  |
|-------------------------------|--------------------------------------|---------------------------------------|
| Agent location                  | Remote / different service           | Same process / codebase               |
| Ownership                       | Different team or external vendor    | Same team                             |
| Network                         | Over HTTP / internet                 | In-memory calls                       |
| Performance needs               | Latency acceptable                   | Ultra-low latency required            |
| Language/Framework              | Cross-language needed                | Same language/framework               |
| Contract & governance           | Formal API contract needed           | Internal collaboration                |

**Project Setup**

**Install the SDK (with A2A support)**
```bash
pip install google-adk[a2a]
```

**Import ADK Components**
```py
from google.adk.agents import LlmAgent
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent, AGENT_CARD_WELL_KNOWN_PATH
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from google.adk.models.google_llm import Gemini
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
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

**Exposing an Agent via A2A**

Use `to_a2a()` to convert any ADK agent into an A2A-compatible server.

```py
# Example: Product Catalog Agent (to be exposed)
def get_product_info(product_name: str) -> str:
    catalog = {
        "iphone 15 pro": "iPhone 15 Pro, $999, Low Stock (8 units), 128GB, Titanium",
        "macbook pro 14": "MacBook Pro 14\", $1,999, In Stock (22 units), M3 Pro, 18GB RAM",
        # ... more products
    }
    key = product_name.lower().strip()
    if key in catalog:
        return f"Product: {catalog[key]}"
    return f"Product not found. Available: {', '.join(catalog.keys())}"

product_catalog_agent = LlmAgent(
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    name="product_catalog_agent",
    description="Provides product information and availability from vendor catalog.",
    instruction="Use get_product_info tool to answer product queries accurately.",
    tools=[get_product_info],
)

# Expose as A2A service
a2a_app = to_a2a(product_catalog_agent, port=8001)
```

This automatically:
- Starts a FastAPI server
- Generates and serves an **agent card**
 at `/.well-known/agent-card.json`
- Exposes A2A task endpoints

The agent card describes name, description, skills (tools), and protocol details — acting as a contract for consumers.

**Consuming a Remote Agent**

Use `RemoteA2aAgent` to integrate a remote A2A agent as a sub-agent.

```py
# Connect to remote Product Catalog Agent
remote_catalog = RemoteA2aAgent(
    name="product_catalog_agent",
    description="Remote vendor product catalog service",
    agent_card="http://localhost:8001/.well-known/agent-card.json",
)

# Customer Support Agent that uses the remote agent
customer_support_agent = LlmAgent(
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    name="customer_support_agent",
    description="Helps customers with product inquiries using vendor catalog.",
    instruction="""
    Always use the product_catalog_agent sub-agent to get accurate product details.
    Be friendly, professional, and precise about pricing and availability.
    """,
    sub_agents=[remote_catalog],  # Treat remote agent like a local one
)
```

**Testing A2A Communication**

```py
session_service = InMemorySessionService()
runner = Runner(agent=customer_support_agent, session_service=session_service)

user_message = types.Content(parts=[types.Part(text="Tell me about the iPhone 15 Pro and its stock status")])

async for event in runner.run_async(user_id="user", session_id="test", new_message=user_message):
    if event.is_final_response() and event.content:
        print(event.content.parts[0].text)
```

**What happens behind the scenes**
:
1. Support agent decides it needs product info
2. Calls `product_catalog_agent` sub-agent
3. `RemoteA2aAgent` sends HTTP POST to remote `/tasks` endpoint
4. Remote agent processes request and returns data
5. Support agent receives result and answers customer

All protocol details (JSON-RPC, task formatting) are handled automatically.

**Key Benefits of A2A**

- **Decoupled architecture**
: Teams own their agents independently
- **Interoperability**
: Works across languages and frameworks
- **Discoverability**
: Agent cards enable automatic discovery
- **Scalability**
: Agents run as independent services
- **Real-world integration**
: Connect to third-party or partner agents securely

**Summary**

You now know how to:
- Expose ADK agents via A2A using `to_a2a()`
- Automatically generate and serve agent cards
- Consume remote agents using `RemoteA2aAgent`
- Build collaborative multi-agent systems across services
- Enable cross-team, cross-organization agent integration

A2A transforms isolated agents into a networked, collaborative ecosystem — the foundation for production-grade multi-agent applications.
