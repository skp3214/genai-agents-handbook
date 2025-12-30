# Multi-Agent Systems

## Table of Contents

1. [Why Multi-Agent Systems?](#why-multi-agent-systems)
2. [Project Setup](#project-setup)
3. [Building Specialized Agents](#building-specialized-agents)
4. [Creating the Root Coordinator Agent](#creating-the-root-coordinator-agent)
5. [Running the Multi-Agent System](#running-the-multi-agent-system)

---

## Why Multi-Agent Systems?

**The Problem: The "Do-It-All" Agent**

A single monolithic agent trying to handle complex tasks (research, writing, editing, fact-checking) often leads to:
- Overly long and confusing instruction prompts
- Difficulty debugging (hard to isolate failures)
- Reduced reliability and maintainability

**The Solution: A Team of Specialists**

A **multi-agent system** breaks the task into a team of simple, focused agents that collaborate:
- Each agent has one clear responsibility
- Easier to build, test, and debug
- More reliable and powerful overall performance

This mirrors real-world teams where specialists work together toward a common goal.

---

## Project Setup

**Install the ADK**

```python
pip install google-adk
```

**Import ADK Components**

```python
from google.adk.agents import Agent, AgentTool
from google.adk.models.google_llm import Gemini
from google.adk.runners import InMemoryRunner
from google.adk.tools import google_search
from google.genai import types
```

**Configure Retry Options**

```python
retry_config = types.HttpRetryOptions(
    attempts=5,
    exp_base=7,
    initial_delay=1,
    http_status_codes=[429, 500, 503, 504],
)
```

---

## Building Specialized Agents

**Research Agent**

Responsible for gathering relevant information using Google Search.

```python
research_agent = Agent(
    name="Research Agent",
    model=Gemini(
        model="gemini-1.5-flash-lite",
        retry_options=retry_config
    ),
    instruction="""You are a specialized research agent. 
Your only job is to use the google_search tool to find 2-3 relevant pieces of information on the given topic 
and present the findings with citations.""",
    tools=[google_search],
    output_key="research_findings"  # Stores results in session state
)
```

**Summarizer Agent**

Creates a concise summary from the research findings.

```python
summarizer_agent = Agent(
    name="SummarizerAgent",
    model=Gemini(
        model="gemini-1.5-flash-lite",
        retry_options=retry_config
    ),
    instruction="""
Read the provided research findings: {research_findings}.
Create a concise summary as a bulleted list with 3-5 key points.
""",
    output_key="final_summary"
)
```

---

## Creating the Root Coordinator Agent

The root agent orchestrates the workflow by delegating to specialized agents.

```python
root_agent = Agent(
    name="ResearchCoordinator",
    model=Gemini(
        model="gemini-1.5-flash-lite",
        retry_options=retry_config
    ),
    instruction="""You are a research coordinator. Your goal is to answer the user's query by orchestrating a workflow:
1. First, you MUST call the `ResearchAgent` tool to gather relevant information.
2. Next, after receiving the research findings, you MUST call the `SummarizerAgent` tool to create a concise summary.
3. Finally, present the final summary clearly to the user as your response.""",
    tools=[AgentTool(research_agent), AgentTool(summarizer_agent)],
)
```

---

## Running the Multi-Agent System

```python
runner = InMemoryRunner(agent=root_agent)

response = await runner.run_debug(
    "What are the latest advancements in quantum computing and what do they mean for AI?"
)

print(response)
```
