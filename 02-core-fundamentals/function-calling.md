# Function Calling with Gemini

## Agenda

This guide teaches you how to enable **function calling** (also known as tool use) with Google's Gemini models using the official Python SDK.

**What you will learn:**
- Defining custom Python functions and exposing them to the model
- Manually handling function calls (request → execute → respond)
- Using built-in tools like Google Search
- Enabling fully automatic function calling
- Controlling function calling behavior with different modes

By the end, you'll be able to build agents that seamlessly combine the reasoning power of Gemini with real-world actions via custom tools.

## Table of Contents

1. [Project Setup](#project-setup)
2. [Define Functions & Tools](#define-functions--tools)
3. [Manual Function Calling](#manual-function-calling)
4. [Automatic Function Calling](#automatic-function-calling)

## Project Setup

### Install the SDK
```bash
pip install -qU "google-genai==1.7.0"
```

### Import Required Modules
```python
from google import genai
from google.genai import types

from IPython.display import HTML, Markdown, display
```

### Configure API Key
```python
client = genai.Client(api_key="YOUR_GOOGLE_API_KEY")
```

## Define Functions & Tools

Function calling allows the model to request structured execution of your Python functions.

### Create Python Functions
Define regular functions with type hints and docstrings (used automatically by the SDK).

```python
def get_weather(location: str, unit: str = "celsius") -> dict:
    """Get the current weather for a location.
    
    Args:
        location: City and country, e.g., "Paris, France"
        unit: "celsius" or "fahrenheit"
    
    Returns:
        Dictionary with weather details
    """
    weather_data = {
        "Paris, France": {"temperature": 22, "condition": "Sunny"},
        "London, UK": {"temperature": 15, "condition": "Cloudy"},
        "Tokyo, Japan": {"temperature": 28, "condition": "Rainy"},
        "New York, USA": {"temperature": 18, "condition": "Partly Cloudy"}
    }
    
    if location in weather_data:
        data = weather_data[location].copy()
        if unit == "fahrenheit":
            data["temperature"] = (data["temperature"] * 9/5) + 32
        data["unit"] = unit
        data["location"] = location
        return data
    return {"error": f"Weather data not available for {location}"}


def calculate_mortgage(principal: float, rate: float, years: int) -> dict:
    """Calculate monthly mortgage payment.
    
    Args:
        principal: Loan amount in dollars
        rate: Annual interest rate (%)
        years: Loan term in years
    
    Returns:
        Payment breakdown
    """
    monthly_rate = (rate / 100) / 12
    num_payments = years * 12
    
    if monthly_rate == 0:
        monthly_payment = principal / num_payments
    else:
        monthly_payment = principal * (monthly_rate * (1 + monthly_rate)**num_payments) / \
                         ((1 + monthly_rate)**num_payments - 1)
    
    total_payment = monthly_payment * num_payments
    total_interest = total_payment - principal
    
    return {
        "monthly_payment": round(monthly_payment, 2),
        "total_payment": round(total_payment, 2),
        "total_interest": round(total_interest, 2),
        "principal": principal
    }
```

### Declare Function Schemas
Automatically convert functions into tool declarations.

```python
get_weather_func = types.FunctionDeclaration.from_callable(
    client=client, callable=get_weather
)

calculate_mortgage_func = types.FunctionDeclaration.from_callable(
    client=client, callable=calculate_mortgage
)
```

The SDK extracts name, description, parameters, and required fields from docstrings and type hints.

### Bundle into Tools
```python
weather_tool = types.Tool(function_declarations=[get_weather_func])
mortgage_tool = types.Tool(function_declarations=[calculate_mortgage_func])

# Combine multiple functions
all_tools = types.Tool(
    function_declarations=[get_weather_func, calculate_mortgage_func]
)
```

### Built-in Google Search Tool
Access real-time web information without writing any code.

```python
search_tool_config = types.GenerateContentConfig(
    tools=[types.Tool(google_search=types.GoogleSearch())]
)

response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents="Latest Gemini AI updates in December 2025?",
    config=search_tool_config
)
print(response.text)
```

You can combine custom tools with Google Search.

## Manual Function Calling

Control the full loop: model requests → you execute → send result back.

### Simple Function Call
```python
response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents="What's the weather in Tokyo, Japan?",
    config=types.GenerateContentConfig(tools=[weather_tool])
)

# Extract requested function call
fc = response.candidates[0].content.parts[0].function_call
print(f"Function: {fc.name}")
print(f"Args: {fc.args}")
```

### Execute and Return Result
```python
function_name = fc.name
function_args = fc.args

if function_name == "get_weather":
    result = get_weather(**function_args)

# Send result back to model
final_response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents=[
        types.Content(role="user", parts=[types.Part(text="What's the weather in Tokyo, Japan?")]),
        types.Content(role="model", parts=[types.Part(function_call=fc)]),
        types.Content(role="user", parts=[types.Part(
            function_response=types.FunctionResponse(name=function_name, response=result)
        )])
    ],
    config=types.GenerateContentConfig(tools=[weather_tool])
)

print(final_response.text)
```

### Multi-Turn Conversations
Use chat sessions for persistent tool use.

```python
chat = client.chats.create(
    model="gemini-1.5-flash",
    config=types.GenerateContentConfig(tools=[all_tools])
)

response = chat.send_message("Weather in Paris, France in fahrenheit?")
fc = response.candidates[0].content.parts[0].function_call

if fc.name == "get_weather":
    result = get_weather(**fc.args)

response = chat.send_message(
    types.Part(function_response=types.FunctionResponse(name=fc.name, response=result))
)
print(response.text)
```

## Automatic Function Calling

Let Gemini decide when to call tools and handle execution automatically (great for simple cases).

### Enable Auto Mode
```python
# Map function names to actual functions
functions_map = {
    "get_weather": get_weather,
    "calculate_mortgage": calculate_mortgage
}

response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents="Weather in London? Also, monthly payment for $500k loan at 5% over 30 years?",
    config=types.GenerateContentConfig(
        tools=[all_tools],
        tool_config=types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(mode="AUTO")
        )
    )
)

print(response.text)  # Model calls tools automatically and synthesizes answer
```

### Function Calling Modes
```python
# AUTO: Model decides (default behavior when tools provided)
# ANY: Force at least one tool call
# NONE: Disable tool calling entirely
```

### Helper for Manual Auto-Execution
```python
def execute_function_calls(response, functions_map):
    for part in response.candidates[0].content.parts:
        if part.function_call:
            fc = part.function_call
            if fc.name in functions_map:
                result = functions_map[fc.name](**fc.args)
                print(f"Executed {fc.name} → {result}")
                return result
    return None

# Usage
response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents="Weather in New York?",
    config=types.GenerateContentConfig(tools=[weather_tool])
)

execute_function_calls(response, {"get_weather": get_weather})
```

**Pro Tip:** Use **manual** calling for complex workflows (parallel calls, error handling, logging). Use **automatic** for rapid prototyping and simple agent behavior.
