# Agent Evaluation

## Table of Contents

1. [Understanding Agent Evaluation](#understanding-agent-evaluation)
2. [Project Setup](#project-setup)
3. [Interactive Evaluation with ADK Web UI](#interactive-evaluation-with-adk-web-ui)
4. [Systematic & Automated Evaluation](#systematic--automated-evaluation)
5. [Example: Home Automation Agent Evaluation](#example-home-automation-agent-evaluation)
6. [Advanced: User Simulation](#advanced-user-simulation)

---

## Understanding Agent Evaluation

**The Problem**


Agents are non-deterministic and operate in unpredictable environments. Small changes in prompts, model versions, or tool definitions can dramatically alter behavior — often in subtle ways that basic testing misses.

Why does this matter? Traditional "happy path" unit tests are insufficient. Agents can:
- Misuse tools with wrong parameters
- Hallucinate capabilities they don't have
- Give confident but incorrect responses
- Fail on edge cases or ambiguous inputs

Without systematic evaluation, regressions go undetected until users complain.

In ADK, **Agent Evaluation**
 provides a proactive way to measure and track agent performance across key dimensions, catching issues before they reach production.

**What is Agent Evaluation?**


Agent evaluation is the systematic measurement of an agent's performance using defined test cases and metrics. It assesses both:
- **Final response quality**
 (what the user sees)
- **Execution trajectory**
 (how the agent arrived at the answer — tool calls, reasoning steps)

Key metrics in ADK:
- **Response Match Score**
: Text similarity between actual and expected final response (0.0–1.0)
- **Tool Trajectory Score**
: Exact match of tool usage sequence and parameters (0.0–1.0)

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

---

## Interactive Evaluation with ADK Web UI

The fastest way to start evaluating is through the **ADK Web UI**
.

**Launch Web UI**

```bash
!adk web
```

**Create Test Cases Interactively**


1. Chat normally with your agent (e.g., "Turn on the living room light")
2. Go to **Eval**
 tab → Create new evaluation set
3. Add current session as a test case
4. Name it (e.g., `basic_light_control`)

**Run Evaluation**


- Select test cases
- Click **Run Evaluation**

- View results: Pass/Fail per case with detailed scores

**Debug Failures**

- Hover over "Fail" to see side-by-side comparison
- Identify mismatches in response text or tool calls
- Edit expected output and re-run

This is ideal for rapid iteration and exploratory testing.

---

## Systematic & Automated Evaluation

For regression testing and CI/CD, use file-based evaluation with the `adk eval` CLI.

**Step 1: Create Evaluation Configuration (`test_config.json`)**

Define pass/fail thresholds:

```json
{
  "criteria": {
    "tool_trajectory_avg_score": 1.0,
    "response_match_score": 0.8
  }
}
```

**Step 2: Create Evaluation Set (`integration.evalset.json`)**


Define multiple test cases with expected behavior:

```json
{
  "eval_set_id": "home_automation_suite",
  "eval_cases": [
    {
      "eval_id": "living_room_light_on",
      "conversation": [
        {
          "user_content": {
            "parts": [{"text": "Turn on the floor lamp in the living room"}]
          },
          "final_response": {
            "parts": [{"text": "Successfully set the floor lamp in the living room to on."}]
          },
          "intermediate_data": {
            "tool_uses": [
              {
                "name": "set_device_status",
                "args": {
                  "location": "living room",
                  "device_id": "floor lamp",
                  "status": "ON"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Step 3: Run Evaluation via CLI**


```bash
adk eval home_automation_agent integration.evalset.json \
  --config_file_path=test_config.json \
  --print_detailed_results
```

**Analyze Results**


Output includes:
- Overall pass/fail per test case
- Per-metric scores and thresholds
- Turn-by-turn comparison table
- Highlighted differences in responses or tool calls

This enables:
- Automated regression testing
- Tracking performance over time
- Catching subtle degradations early

---

## Example: Home Automation Agent Evaluation

```py
def set_device_status(location: str, device_id: str, status: str) -> dict:
    print(f"Tool Call: Setting {device_id} in {location} to {status}")
    return {"success": True, "message": f"Successfully set {device_id} in {location} to {status.lower()}"}

root_agent = LlmAgent(
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    name="home_automation_agent",
    instruction="""You control smart home devices using set_device_status tool.
    Always use the tool when asked to turn devices on/off.
    Be precise about location and device names.""",
    tools=[set_device_status],
)
```

Common issues caught by evaluation:
- Agent claims to control unsupported devices
- Wrong tool parameters (e.g., incorrect location)
- Overconfident responses without tool use
- Inconsistent response phrasing

---

## Advanced: User Simulation

For dynamic testing beyond static cases, ADK supports **User Simulation**
:
- An LLM acts as a simulated user
- Follows a defined conversation plan/goal
- Generates varied, realistic follow-up messages
- Tests context maintenance and robustness

Ideal for multi-turn, unpredictable interactions.

**Summary**


You now know how to:
- Create and run evaluations interactively in ADK Web UI
- Build automated regression suites with `.evalset.json` and `test_config.json`
- Use `adk eval` CLI for batch testing
- Interpret response and trajectory metrics
- Detect regressions proactively before deployment

**Observability**
 (previous topic) = reactive debugging  
**Evaluation**
 = proactive quality assurance

Together, they enable reliable, production-ready agents.

**Next**
: Deploy your agent and connect it with others using Agent2Agent protocols.