# Agent Tools

## Table of Contents

1. [Why Do Agents Need Tools?](#why-do-agents-need-tools)
2. [What Are Custom Tools?](#what-are-custom-tools)
3. [Project Setup](#project-setup)
4. [Creating Tools for Agent](#creating-tools-for-agent)
5. [Agent Creation and Testing](#agent-creation-and-testing)
6. [Improving Agent Reliability with Code](#improving-agent-reliability-with-code)

---

## Why Do Agents Need Tools?

**The Problem**

Without tools, the agent's knowledge is frozen in time - it can't access today's news or your company's inventory. It has no connection to the outside world, so the agent can't take actions for you.

**The Solution**

Tools are what transform your isolated LLM into a capable agent that can actually help you get things done.

**What are Custom Tools ?**

**Custom Tools**
 are tools you build yourself using your own code and business logic.Unlike built-in tools that come ready-made with ADK, custom tools give you complete control over functionality.

**When to use Custom Tools?**

Built-in tools like Google Search are powerful, but **every business has unique requirements**
 that generic tools can't handle. Custom tools let you implement your specific business logic, connect to your systems, and solve domain-specific problems. ADK provides multiple custom tool types to handle these scenarios.

**How to define a Tool ?**

**Any Python function can become an agent tool**
 by following these simple guidelines:

1. Create a Python function
2. Follow the best practices listed below
3. Add your function to the agent's tools=[] list and ADK handles the rest automatically.

ADK Best Practices in Action
Notice how our tools follow ADK best practices:

1. **Dictionary Returns**
: Tools return {"status": "success", "data": ...} or {"status": "error", "error_message": ...}
2. **Clear Docstrings**
: LLMs use docstrings to understand when and how to use tools
3. **Type Hints**
: Enable ADK to generate proper schemas (str, dict, etc.)
4. **Error Handling**
: Structured error responses help LLMs handle failures gracefully

These patterns make your tools reliable and easy for LLMs to use correctly.


**Project Seup**

**Install the ADK**
```py
pip install google-adk
```

**Import the ADk components**
```py
from google.genai import types

from google.adk.agents import LlmAgent
from google.adk.models.google_llm import Gemini
from google.adk.runners import InMemoryRunner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import google_search, AgentTool, ToolContext
from google.adk.code_executors import BuiltInCodeExecutor
```

**Configure Retry Options**
```py
retry_config = types.HttpRetryOptions(
    attempts = 5,
    exp_base = 7,
    initial_delay = 1,
    http_status_codes = [429, 500, 503, 504],
)
```

**Creating Tools for Agent**


```py
# Pay attention to the docstring, type hints, and return value.
def get_fee_for_payment_method(method: str) -> dict:
    """Looks up the transaction fee percentage for a given payment method.

    This tool simulates looking up a company's internal fee structure based on
    the name of the payment method provided by the user.

    Args:
        method: The name of the payment method. It should be descriptive,
                e.g., "platinum credit card" or "bank transfer".

    Returns:
        Dictionary with status and fee information.
    
    Success: {"status": "success", "fee_percentage": 0.02}
        Error: {"status": "error", "error_message": "Payment method not found"}
    """
    # This simulates looking up a company's internal fee structure.
    fee_database = {
        "platinum credit card": 0.02,  # 2%
        "gold debit card": 0.035,  # 3.5%
        "bank transfer": 0.01,  # 1%
    }

    fee = fee_database.get(method.lower())
    if fee is not None:
        return {"status": "success", "fee_percentage": fee}
    else:
        return {
            "status": "error",
            "error_message": f"Payment method '{method}' not found",
        }
```

```py
def get_exchange_rate(base_currency: str, target_currency: str) -> dict:
    """Looks up and returns the exchange rate between two currencies.

    Args:
        base_currency: The ISO 4217 currency code of the currency you
                       are converting from (e.g., "USD").
        target_currency: The ISO 4217 currency code of the currency you
                         are converting to (e.g., "EUR").

    Returns:
        Dictionary with status and rate information.
        Success: {"status": "success", "rate": 0.93}
        Error: {"status": "error", "error_message": "Unsupported currency pair"}
    """

    # Static data simulating a live exchange rate API
    # In production, this would call something like: requests.get("api.exchangerates.com")
    rate_database = {
        "usd": {
            "eur": 0.93,  # Euro
            "jpy": 157.50,  # Japanese Yen
            "inr": 83.58,  # Indian Rupee
        }
    }

    # Input validation and processing
    base = base_currency.lower()
    target = target_currency.lower()

    # Return structured result with status
    rate = rate_database.get(base, {}).get(target)
    if rate is not None:
        return {"status": "success", "rate": rate}
    else:
        return {
            "status": "error",
            "error_message": f"Unsupported currency pair: {base_currency}/{target_currency}",
        }
```

**Agent Creation**

```py
# Currency agent with custom function tools
currency_agent = LlmAgent(
    name="currency_agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""You are a smart currency conversion assistant.

    For currency conversion requests:
    1. Use `get_fee_for_payment_method()` to find transaction fees
    2. Use `get_exchange_rate()` to get currency conversion rates
    3. Check the "status" field in each tool's response for errors
    4. Calculate the final amount after fees based on the output from `get_fee_for_payment_method` and `get_exchange_rate` methods and provide a clear breakdown.
    5. First, state the final converted amount.

    Then, explain how you got that result by showing the intermediate amounts. Your explanation must include: the fee percentage and its
        value in the original currency, the amount remaining after the fee, and the exchange rate used for the final conversion.

    If any tool returns status "error", explain the issue to the user clearly.
    """,
    tools=[get_fee_for_payment_method, get_exchange_rate],
)
```

**Run the Agent**

```py
# Test the currency agent
currency_runner = InMemoryRunner(agent=currency_agent)
_ = await currency_runner.run_debug(
    "I want to convert 500 US Dollars to Euros using my Platinum Credit Card. How much will I receive?"
)
```

## Improving Agent Reliability with Code

The agent's instruction says `calculate the final amount after fees` but LLMs aren't always reliable at math. They might make calculation errors or use inconsistent formulas.

***Solution***: Let's ask our agent to generate a Python code to do the math, and run it to give us the final result! Code execution is much more reliable than having the LLM try to do math in its head!

**Built-in Code Executor**

ADK has a built-in Code Executor capable of running code in a sandbox. 
**Note**
: This uses Gemini's Code Execution capability.

Let's create a calculation_agent which takes in a Python code and uses the BuiltInCodeExecutor to run it.

```py
calculation_agent = LlmAgent(
    name="CalculationAgent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""You are a specialized calculator that ONLY responds with Python code. You are forbidden from providing any text, explanations, or conversational responses.
 
     Your task is to take a request for a calculation and translate it into a single block of Python code that calculates the answer.
     
     **RULES:**

    1.  Your output MUST be ONLY a Python code block.
    2.  Do NOT write any text before or after the code block.
    3.  The Python code MUST calculate the result.
    4.  The Python code MUST print the final result to stdout.
    5.  You are PROHIBITED from performing the calculation yourself. Your only job is to generate the code that will perform the calculation.
   
    Failure to follow these rules will result in an error.
       """,
    code_executor=BuiltInCodeExecutor(),  # Use the built-in Code Executor Tool. This gives the agent code execution capabilities
)
```
**Update the Agent's instruction and Toolset**

```py
enhanced_currency_agent = LlmAgent(
    name="enhanced_currency_agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    # Updated instruction
    instruction="""You are a smart currency conversion assistant. You must strictly follow these steps and use the available tools.

  For any currency conversion request:

   1. Get Transaction Fee: Use the get_fee_for_payment_method() tool to determine the transaction fee.
   2. Get Exchange Rate: Use the get_exchange_rate() tool to get the currency conversion rate.
   3. Error Check: After each tool call, you must check the "status" field in the response. If the status is "error", you must stop and clearly explain the issue to the user.
   4. Calculate Final Amount (CRITICAL): You are strictly prohibited from performing any arithmetic calculations yourself. You must use the calculation_agent tool to generate Python code that calculates the final converted amount.
   This code will use the fee information from step 1 and the exchange rate from step 2.
   5. Provide Detailed Breakdown: In your summary, you must:
       * State the final converted amount.
       * Explain how the result was calculated, including:
           * The fee percentage and the fee amount in the original currency.
           * The amount remaining after deducting the fee.
           * The exchange rate applied.
    """,
    tools=[
        get_fee_for_payment_method,
        get_exchange_rate,
        AgentTool(agent=calculation_agent),  # Using another agent as a tool!
    ],
)
```
**Run the Agent**

```py
enhanced_runner = InMemoryRunner(agent=enhanced_currency_agent)

response = await enhanced_runner.run_debug(
    "Convert 1,250 USD to INR using a Bank Transfer. Show me the precise calculation."
)
```
