# Prompting with Gemini

## Agenda

This guide introduces **prompting techniques** for Google's Gemini models using the official Python SDK (`google-genai`).  

**What you will learn:**
- Setting up the Gemini SDK and running your first prompts
- Basic chat interactions
- Controlling generation with key parameters (output length, temperature, top-p)
- Effective prompting strategies:
  - Zero-shot prompting
  - One-shot and few-shot prompting
  - Structured output with JSON mode

By the end, you'll understand how to craft precise, reliable prompts and control model creativity for a wide range of tasks.

## Table of Contents

1. [Project Setup](#project-setup)
2. [Demo: First Interactions](#demo-first-interactions)
3. [Explore Generation Parameters](#explore-generation-parameters)
4. [Advanced Prompting Techniques](#advanced-prompting-techniques)

## Project Setup

### Install the SDK
```python
pip install -U -q "google-genai==1.7.0"
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

## Demo: First Interactions

### Run Your First Prompt
```python
response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents="Explain AI to me like I'm a child."  # Your prompt
)

print(response.text)
```

### Start a Simple Chat
```python
chat = client.chats.create(model="gemini-1.5-flash", history=[])

response = chat.send_message("Hello! My name is Sachin Prajapati")
print(response.text)
```

## Explore Generation Parameters

### Output Length
Control the maximum number of tokens in the response.

```python
config = types.GenerateContentConfig(max_output_tokens=200)

response = client.models.generate_content(
    model="gemini-1.5-flash",
    config=config,
    contents="Write a 1000-word essay on the importance of olives in modern society."
)

print(response.text)  # Will be limited to ~200-300 words
```

### Temperature
Controls randomness (0 = deterministic, higher = more creative).

```python
config = types.GenerateContentConfig(temperature=2.0)

for _ in range(5):
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        config=config,
        contents="Pick a random colour... (respond in a single word)"
    )
    if response.text:
        print(response.text.strip(), '-' * 25)
```
→ With high temperature: varied colors each time  
→ With `temperature=0`: likely the same color repeatedly

### Top-P (Nucleus Sampling)
Limits sampling to the smallest set of tokens whose cumulative probability exceeds `top_p`.

```python
config = types.GenerateContentConfig(
    temperature=1.0,
    top_p=0.95
)

for _ in range(5):
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        config=config,
        contents="Pick a random colour... (respond in a single word)"
    )
    if response.text:
        print(response.text.strip())
```
→ Common colors dominate; rare ones (e.g., "olive", "magenta") are unlikely.

## Advanced Prompting Techniques

### Zero-Shot Prompting
Directly describe the task without examples.

```python
config = types.GenerateContentConfig(
    temperature=0.1,
    top_p=1,
    max_output_tokens=7
)

prompt = '''Classify the movie review as POSITIVE, NEUTRAL, or NEGATIVE.
Review: "Her" is a disturbing study revealing the direction humanity is headed if AI is allowed to keep evolving, unchecked. I wish there were more movies like this masterpiece.
Sentiment:'''

response = client.models.generate_content(
    model="gemini-1.5-flash",
    config=config,
    contents=prompt
)

print(response.text)  # Expected: POSITIVE
```

### One-Shot and Few-Shot Prompting
Provide one or more examples to guide the model.

```python
few_shot_prompt = """Parse a customer's pizza order into valid JSON:

EXAMPLE:
I want a small pizza with cheese, tomato sauce, and pepperoni.
JSON Response:
{
  "size": "small",
  "type": "normal",
  "ingredients": ["cheese", "tomato sauce", "pepperoni"]
}

EXAMPLE:
Can I get a large pizza with tomato sauce, basil and mozzarella
JSON Response:
{
  "size": "large",
  "type": "normal",
  "ingredients": ["tomato sauce", "basil", "mozzarella"]
}

ORDER:
"""

customer_order = "Give me a large with cheese and pineapple."

response = client.models.generate_content(
    model="gemini-1.5-flash",
    config=types.GenerateContentConfig(
        temperature=0.1,
        top_p=1,
        max_output_tokens=250
    ),
    contents=[few_shot_prompt, customer_order]
)

print(response.text)
```

### JSON Mode (Structured Output)
Force the model to return valid JSON matching a defined schema.

```python
import typing_extensions as typing

class PizzaOrder(typing.TypedDict):
    size: str
    ingredients: list[str]
    type: str

response = client.models.generate_content(
    model="gemini-1.5-flash",
    config=types.GenerateContentConfig(
        temperature=0.1,
        response_mime_type="application/json",
        response_schema=PizzaOrder,
    ),
    contents="Can I have a large dessert pizza with apple and chocolate"
)

print(response.text)  # Guaranteed valid JSON matching the schema
```

**Tip:** Use low temperature (0.0–0.2) and JSON mode together for reliable structured outputs.

