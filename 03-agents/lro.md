# Agent Tool Patterns: Long Running Operations

## Table of Contents

1. [Understanding Long Running Operations](#understanding-long-running-operations)
2. [Project Setup](#project-setup)
3. [Building the Shipping Tool](#building-the-shipping-tool)
4. [Creating the Agent and App](#creating-the-agent-and-app)
5. [Building the Workflow](#building-the-workflow)
6. [Testing and Execution Flow](#testing-and-execution-flow)

---

## Understanding Long Running Operations

**The Problem**

So far, all tools execute and return immediately:

`User asks → Agent calls tool → Tool returns result → Agent responds`

But what if your tools are long-running or you need human approval before completing an action?

**The Solution: Human-in-the-Loop Pattern**

A shipping agent should ask for approval before placing a large order:

`User asks → Agent calls tool → Tool PAUSES and asks human → Human approves → Tool completes → Agent responds`

This is called a **Long-Running Operation (LRO)** - the tool needs to pause, wait for external input (human approval), then resume.

**Use Case: Shipping Coordinator Agent** 
Let's build a **shipping coordinator agent with one tool** that:

- Auto-approves small orders (≤5 containers)
- Pauses and asks for approval on large orders (>5 containers)
- Completes or cancels based on the approval decision

This demonstrates the core long-running operation pattern: **pause → wait for human input → resume.**

---

## Project Setup

**Install the ADK**

```py
pip install google-adk
```

**Import the ADK Components**

```py
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

**Configure Retry Options**

```py
retry_config = types.HttpRetryOptions(
    attempts = 5,
    exp_base = 7,
    initial_delay = 1,
    http_status_codes = [429, 500, 503, 504],
)
```

---

## Building the Shipping Tool

**Understanding ToolContext**

Notice the function signature includes `tool_context: ToolContext`. ADK automatically provides this object when your tool runs. It gives you two key capabilities:
- **Request approval**: Call `tool_context.request_confirmation()`
- **Check approval status**: Read `tool_context.tool_confirmation`

**The Shipping Tool with Approval Logic**

```py
LARGE_ORDER_THRESHOLD = 5


def place_shipping_order(
    num_containers: int, destination: str, tool_context: ToolContext
) -> dict:
    """Places a shipping order. Requires approval if ordering more than 5 containers (LARGE_ORDER_THRESHOLD).

    Args:
        num_containers: Number of containers to ship
        destination: Shipping destination

    Returns:
        Dictionary with order status
    """

    # SCENARIO 1: Small orders (≤5 containers) auto-approve
    if num_containers <= LARGE_ORDER_THRESHOLD:
        return {
            "status": "approved",
            "order_id": f"ORD-{num_containers}-AUTO",
            "num_containers": num_containers,
            "destination": destination,
            "message": f"Order auto-approved: {num_containers} containers to {destination}",
        }

    # SCENARIO 2: This is the first time this tool is called. Large orders need human approval - PAUSE here.
    if not tool_context.tool_confirmation:
        tool_context.request_confirmation(
            hint=f"⚠️ Large order: {num_containers} containers to {destination}. Do you want to approve?",
            payload={"num_containers": num_containers, "destination": destination},
        )
        return {  # This is sent to the Agent
            "status": "pending",
            "message": f"Order for {num_containers} containers requires approval",
        }

    # SCENARIO 3: The tool is called AGAIN and is now resuming. Handle approval response - RESUME here.
    if tool_context.tool_confirmation.confirmed:
        return {
            "status": "approved",
            "order_id": f"ORD-{num_containers}-HUMAN",
            "num_containers": num_containers,
            "destination": destination,
            "message": f"Order approved: {num_containers} containers to {destination}",
        }
    else:
        return {
            "status": "rejected",
            "message": f"Order rejected: {num_containers} containers to {destination}",
        }
```

---

## Creating the Agent and App

**Create the Agent**

Add the tool to the Agent. The tool decides internally when to request approval based on the order size.
```py
# Create shipping agent with pausable tool
shipping_agent = LlmAgent(
    name="shipping_agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""You are a shipping coordinator assistant.
  
  When users request to ship containers:
   1. Use the place_shipping_order tool with the number of containers and destination
   2. If the order status is 'pending', inform the user that approval is required
   3. After receiving the final result, provide a clear summary including:
      - Order status (approved/rejected)
      - Order ID (if available)
      - Number of containers and destination
   4. Keep responses concise but informative
  """,
    tools=[FunctionTool(func=place_shipping_order)],
)
```

**Wrap in Resumable App**

Why we need this:
- **The problem**: A regular LlmAgent is stateless - each call is independent with no memory of previous interactions. If a tool requests approval, the agent can't remember what it was doing.
- **The solution**: Wrap your agent in an App with resumability enabled. The App adds a persistence layer that saves and restores state.

What gets saved when a tool pauses:
- All conversation messages so far
- Which tool was called (place_shipping_order)
- Tool parameters (10 containers, Rotterdam)
- Where exactly it paused (waiting for approval)

When you resume, the App loads this saved state so the agent continues exactly where it left off - as if no time passed.

```py
# Wrap the agent in a resumable app - THIS IS THE KEY FOR LONG-RUNNING OPERATIONS!
shipping_app = App(
    name="shipping_coordinator",
    root_agent=shipping_agent,
    resumability_config=ResumabilityConfig(is_resumable=True),
)
```

**Create Session and Runner with the App**

```py
session_service = InMemorySessionService()

# Create runner with the resumable app
shipping_runner = Runner(
    app=shipping_app,  # Pass the app instead of the agent
    session_service=session_service,
)
```

---

## Building the Workflow

**Key Concept: Handling Events**

The agent won't automatically handle pause/resume. Every long-running operation workflow requires you to:
- **Detect the pause**: Check if events contain adk_request_confirmation
- **Get human decision**: In production, show UI and wait for user click. Here, we simulate it.
- **Resume the agent**: Send the decision back with the saved invocation_id

**Understanding Key Technical Concepts**

**events** - ADK creates events as the agent executes. Tool calls, model responses, function results - all become events.

**adk_request_confirmation event** - This event is special - it signals "pause here!"
- Automatically created by ADK when your tool calls `request_confirmation()`
- Contains the `invocation_id`
- Your workflow must detect this event to know the agent paused

**invocation_id** - Every call to run_async() gets a unique `invocation_id` (like "abc123")
- When a tool pauses, you save this ID
- When resuming, pass the same ID so ADK knows which execution to continue
- Without it, ADK would start a NEW execution instead of resuming the paused one

**Helper Functions to Process Events**

These handle the event iteration logic for you.

`check_for_approval()` - Detects if the agent paused
- Loops through all events and looks for the special `adk_request_confirmation` event
- Returns `approval_id` (identifies this specific request) and `invocation_id` (identifies which execution to resume)
- Returns `None` if no pause detected

```py
def check_for_approval(events):
    """Check if events contain an approval request.

    Returns:
        dict with approval details or None
    """
    for event in events:
        if event.content and event.content.parts:
            for part in event.content.parts:
                if (
                    part.function_call
                    and part.function_call.name == "adk_request_confirmation"
                ):
                    return {
                        "approval_id": part.function_call.id,
                        "invocation_id": event.invocation_id,
                    }
    return None
```

`print_agent_response()` - Displays agent text
- Simple helper to extract and print text from events

```py
def print_agent_response(events):
    """Print agent's text responses from events."""
    for event in events:
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    print(f"Agent > {part.text}")
```

`create_approval_response()` - Formats the human decision
- Takes the approval info and boolean decision (True/False) from the human
- Creates a FunctionResponse that ADK understands
- Wraps it in a Content object to send back to the agent
```py
def create_approval_response(approval_info, approved):
    """Create approval response message."""
    confirmation_response = types.FunctionResponse(
        id=approval_info["approval_id"],
        name="adk_request_confirmation",
        response={"confirmed": approved},
    )
    return types.Content(
        role="user", parts=[types.Part(function_response=confirmation_response)]
    )
```

**Workflow Function**

The `run_shipping_workflow()` function orchestrates the entire approval flow.

```py
async def run_shipping_workflow(query: str, auto_approve: bool = True):
    """Runs a shipping workflow with approval handling.

    Args:
        query: User's shipping request
        auto_approve: Whether to auto-approve large orders (simulates human decision)
    """

    print(f"\n{'='*60}")
    print(f"User > {query}\n")

    # Generate unique session ID
    session_id = f"order_{uuid.uuid4().hex[:8]}"

    # Create session
    await session_service.create_session(
        app_name="shipping_coordinator", user_id="test_user", session_id=session_id
    )

    query_content = types.Content(role="user", parts=[types.Part(text=query)])
    events = []

    # STEP 1: Send initial request to the Agent. If num_containers > 5, the Agent returns the special `adk_request_confirmation` event
    async for event in shipping_runner.run_async(
        user_id="test_user", session_id=session_id, new_message=query_content
    ):
        events.append(event)

    # -----------------------------------------------------------------------------------------------
    # -----------------------------------------------------------------------------------------------
    # STEP 2: Loop through all the events generated and check if `adk_request_confirmation` is present.
    approval_info = check_for_approval(events)

    if approval_info:
        print(f"⏸️  Pausing for approval...")
        print(f"🤔 Human Decision: {'APPROVE ✅' if auto_approve else 'REJECT ❌'}\n")

        # PATH A: Resume the agent by calling run_async() again with the approval decision
        async for event in shipping_runner.run_async(
            user_id="test_user",
            session_id=session_id,
            new_message=create_approval_response(
                approval_info, auto_approve
            ),  # Send human decision here
            invocation_id=approval_info[
                "invocation_id"
            ],  # Critical: same invocation_id tells ADK to RESUME
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        print(f"Agent > {part.text}")

    else:
        # PATH B: If the `adk_request_confirmation` is not present - no approval needed - order completed immediately.
        print_agent_response(events)

    print(f"{'='*60}\n")
```

---

## Testing and Execution Flow

**Testing the Workflow**

```py
# Demo 1: It's a small order. Agent receives auto-approved status from tool
await run_shipping_workflow("Ship 3 containers to Singapore")

# Demo 2: Workflow simulates human decision: APPROVE ✅
await run_shipping_workflow("Ship 10 containers to Rotterdam", auto_approve=True)

# Demo 3: Workflow simulates human decision: REJECT ❌
await run_shipping_workflow("Ship 8 containers to Los Angeles", auto_approve=False)
```

**Complete Execution Flow**

```
TIME 1: User sends "Ship 10 containers to Rotterdam"
        ↓
TIME 2: Workflow calls shipping_runner.run_async(...)
        ADK assigns a unique invocation_id = "abc123"
        ↓
TIME 3: Agent receives user message, decides to use place_shipping_order tool
        ↓
TIME 4: ADK calls place_shipping_order(10, "Rotterdam", tool_context)
        ↓
TIME 5: Tool checks: num_containers (10) > 5
        Tool calls tool_context.request_confirmation(...)
        ↓
TIME 6: Tool returns {'status': 'pending', ...}
        ↓
TIME 7: ADK creates adk_request_confirmation event with invocation_id="abc123"
        ↓
TIME 8: Workflow detects the event via check_for_approval()
        Saves approval_id and invocation_id="abc123"
        ↓
TIME 9: Workflow gets human decision → True (approve)
        ↓
TIME 10: Workflow calls shipping_runner.run_async(..., invocation_id="abc123")
         Passes approval decision as FunctionResponse
         ↓
TIME 11: ADK sees invocation_id="abc123" - knows to RESUME (instead of starting new)
         Loads saved state from TIME 7
         ↓
TIME 12: ADK calls place_shipping_order again with same parameters
         But now tool_context.tool_confirmation.confirmed = True
         ↓
TIME 13: Tool returns {'status': 'approved', 'order_id': 'ORD-10-HUMAN', ...}
         ↓
TIME 14: Agent receives result and responds to user
```