# Introduction to Building AI Agents

## Agenda and Learning Objectives

This README serves as a beginner-friendly guide to understanding and building AI agents using Google's open-source **Agent Development Kit (ADK)** in Python.

### What We Are Going to Learn
- The fundamental difference between a basic Large Language Model (LLM) interaction and a full-fledged AI agent.
- How to set up a simple AI agent that can reason, use tools (like Google Search), and provide more accurate, up-to-date responses.
- Basic project setup, configuration, and running your first agent.

### Why We Are Learning This
AI agents represent the next evolution beyond chatbots. While traditional LLMs (like Gemini or ChatGPT) excel at generating text from prompts, they are limited to static knowledge and cannot interact with the real world. Agents can:
- **Reason step-by-step** (think before acting).
- **Take actions** using tools (e.g., search the web, execute code, or call APIs).
- **Observe results** and iterate until they arrive at a reliable answer.

This enables powerful applications like research assistants, automated workflows, or multi-agent systems that collaborate. Google's ADK makes this accessible, production-ready, and optimized for Gemini models while being flexible for others. Learning ADK equips you to build scalable, real-world AI agents efficiently.

## Table of Contents
- [Prerequisites](#prerequisites)
- [What is an AI Agent?](#what-is-an-ai-agent)
- [Overview of Google's Agent Development Kit (ADK)](#overview-of-googles-agent-development-kit-adk)
- [Project Setup](#project-setup)
- [Running Your Agent](#running-your-agent)

## Prerequisites
Before starting:
- Python 3.10+ installed.
- A Google API key for Gemini (get one free from [Google AI Studio](https://aistudio.google.com/app/apikey)).
- Basic familiarity with Python and command-line tools.
- (Recommended) Create a virtual environment:  
  ```bash
  python -m venv adk-env
  source adk-env/bin/activate  # On Windows: adk-env\Scripts\activate
  ```

## What is an AI Agent?

You've likely used an LLM like Gemini:  
`Prompt → LLM → Text Response`

This is great for creative writing or quick answers but limited by the model's training data (no real-time info) and inability to perform actions.

An AI agent enhances this with a **ReAct loop** (Reason + Act):  
`Prompt → Agent → Thought → Action (e.g., tool call) → Observation → Thought → ... → Final Answer`

Agents can:
- Search the web for current events.
- Execute code or query databases.
- Break down complex tasks iteratively.

This leads to more accurate, dynamic, and capable AI systems.

## Overview of Google's Agent Development Kit (ADK)

Google's **Agent Development Kit (ADK)** is an open-source, code-first Python framework for building, evaluating, and deploying AI agents. Key features:
- Optimized for Gemini models but model-agnostic.
- Supports tools, multi-agent hierarchies, memory, and workflows.
- Easy local testing with a dev UI and CLI.
- Deployable to Vertex AI Agent Engine or anywhere (e.g., Cloud Run).

ADK powers agents in Google products and is designed for production-grade agentic applications.

Installation:  
```bash
pip install google-adk
```

## Project Setup

### 1. Import ADK Components

Create a file (e.g., `agent.py`) with the following imports:

```python
from google.adk.agents import Agent
from google.adk.models.google_llm import Gemini  # Correct import for Gemini model wrapper
from google.adk.runners import InMemoryRunner
from google.adk.tools import google_search
from google.genai import types  # For configurations like retries
```

### 2. Configure Retry Options (Recommended for Reliability)

LLMs can hit rate limits or transient errors. Use retries:

```python
retry_config = types.HttpRetryOptions(
    attempts=5,
    exp_base=7,
    initial_delay=1,
    http_status_codes=[429, 500, 503, 504]
)
```

### 3. Define Your Agent

```python
root_agent = Agent(
    name="Helpful Assistant",
    model=Gemini(
        model="gemini-1.5-flash",  # Use a valid model like gemini-1.5-flash or gemini-1.5-pro
        retry_options=retry_config,
    ),
    description="A simple agent that can answer general questions and use search for current info.",
    instruction="You are a helpful assistant. Always use Google Search for up-to-date or factual information if unsure.",
    tools=[google_search],
)
```

**Notes**:
- Set your Gemini API key: `export GOOGLE_API_KEY=your-key-here` (or add to `.env`).
- For production, consider Vertex AI integration.

## Running Your Agent

```python
runner = InMemoryRunner(agent=root_agent)

async def main():
    response = await runner.run_debug(
        """
        What is Google's Agent Development Kit (ADK)?
        In which programming languages is it available?
        """
    )
    print(response.final_output)  # Or inspect the full trace for thoughts/actions

# Run it
import asyncio
asyncio.run(main())
```
