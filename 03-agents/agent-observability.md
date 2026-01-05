# Agent Observability

## Table of Contents

1. [Understanding Agent Observability](#understanding-agent-observability)
2. [Project Setup](#project-setup)
3. [Debugging with ADK Web UI and Logs](#debugging-with-adk-web-ui-and-logs)
4. [Production Observability with LoggingPlugin](#production-observability-with-loggingplugin)
5. [When to Use Which Approach](#when-to-use-which-approach)
6. [Understanding Plugins and Callbacks](#understanding-plugins-and-callbacks)

---

## Understanding Agent Observability

**The Problem**


Unlike traditional software where errors are predictable and traceable through stack traces, AI agents can fail in mysterious ways. The model might refuse a task, hallucinate, misuse tools, or get stuck in loops — but without visibility, you have no idea **why**
.

**Why does this matter**
? Debugging agents without proper observability is like trying to fix a car engine blindfolded. You need to see exactly what the agent is thinking, what prompts are sent to the LLM, which tools it chooses (or ignores), and where the breakdown occurs.

In ADK, **observability**
 provides full transparency into your agent's decision-making process through three pillars:

- **Logs**
: Timestamped records of individual events
- **Traces**
: Connected sequences showing the full execution flow
- **Metrics**
: Aggregated statistics on performance and reliability

**What is Agent Observability?**

Agent observability gives you complete insight into every step of your agent's execution:

- Full LLM prompts and responses
- Tool calls, arguments, and results
- Timing and performance of each step
- Internal reasoning and state changes

This turns "Why isn't my agent working?" into "Here's exactly where it went wrong — and how to fix it."

**Project Setup**

**Install the SDK**
```py
pip install google-adk
```

**Import ADK Components**
```py
from google.adk.agents import LlmAgent
from google.adk.models.google_llm import Gemini
from google.adk.tools.agent_tool import AgentTool
from google.adk.tools.google_search_tool import google_search
from google.adk.runners import Runner, InMemoryRunner
from google.adk.plugins.logging_plugin import LoggingPlugin
from google.genai import types
from typing import List
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

**Debugging with ADK Web UI and Logs**

The fastest way to debug during development is using the **ADK Web UI**
 with `DEBUG` logging.

**Start ADK Web UI with Debug Logging**
```bash
!adk web --log_level DEBUG
```

Key features you'll see:
- **Events Tab**
: Chronological list of all actions (user messages, tool calls, LLM responses)
- **Traces**
: End-to-end timing and flow visualization
- **Detailed LLM Requests**
: Full prompts, system instructions, and tool definitions
- **Tool Execution**
: Arguments passed and results returned

This allows you to:
- Spot missing tools
- Identify incorrect function calling
- Catch type mismatches in tool arguments
- Trace reasoning failures step-by-step

Example bug diagnosis:
- Agent returns wrong count → Check trace → See tool received string instead of list → Fix tool parameter type

**Production Observability with LoggingPlugin**

For production deployments, use ADK's built-in `LoggingPlugin` — no need to build custom logging.

**Create Agent**
```py
def count_papers(papers: List[str]):
    return len(papers)

google_search_agent = LlmAgent(
    name="google_search_agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="Use google_search to find information. Return raw results.",
    tools=[google_search],
)

root_agent = LlmAgent(
    name="research_agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""
    1. Use google_search_agent to find papers on the topic
    2. Use count_papers tool to count results
    3. Return list and total count
    """,
    tools=[AgentTool(agent=google_search_agent), count_papers],
)
```

**Add LoggingPlugin to Runner**
```py
runner = InMemoryRunner(
    agent=root_agent,
    plugins=[LoggingPlugin()]  # Automatically logs everything
)
```

**Run and Observe Logs**
```py
await runner.run_debug("Find recent quantum computing papers")
```

The `LoggingPlugin` automatically captures:
- User messages received
- Agent and tool invocations
- Full LLM requests and responses (including token usage)
- Tool arguments and results
- Complete execution traces with timing
- Final responses

Sample log output shows:
- Invocation IDs for tracing
- Which agent is running
- Exact prompts sent to model
- Tool call details
- Performance metrics

**When to Use Which Approach**

| Scenario                     | Recommended Tool                     |
|----------------------------|--------------------------------------|
| Local development & debugging | `adk web --log_level DEBUG` + Web UI |
| Production monitoring         | `LoggingPlugin()` in Runner          |
| Custom metrics or integrations| Build custom Plugin with callbacks   |

**Understanding Plugins and Callbacks (Conceptual)**

**Plugins**
 are modules that hook into the agent lifecycle using **callbacks**
 — functions that run automatically at key points:

- `before_agent` / `after_agent`
- `before_tool` / `after_tool`
- `before_model` / `after_model`
- `on_model_error`

You can build custom plugins for:
- Custom metrics collection
- External monitoring integration
- Performance tracking
- Security auditing

ADK's `LoggingPlugin` already handles standard observability needs.

**Summary**

You now know how to:
- Debug agents effectively using ADK Web UI and DEBUG logs
- Identify root causes through traces and detailed LLM inspection
- Scale observability to production with `LoggingPlugin`
- Choose the right observability tool for development vs production

Observability transforms agent development from guesswork into precise, data-driven debugging and monitoring.

**Next**
: Learn how to evaluate agent performance systematically to ensure reliability in production.