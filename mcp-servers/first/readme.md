# MCP Server & Client Implementation

## Overview
This project demonstrates a basic implementation of a Model Context Protocol (MCP) server and client using Node.js. The goal is to explore how AI agents can interact with tools and services via a standardized protocol, leveraging Google GenAI for conversational AI and tool invocation.

## Learning Objectives
- Understand the architecture of MCP (Model Context Protocol)
- Learn how to set up a server-client communication using SSE (Server-Side Events)
- Integrate Google GenAI for conversational AI and tool calls
- Manage conversation flow and tool invocation in a real-world scenario

## Implementation Details

### Server (`server/index.js`)
- Sets up an MCP server using Node.js
- Exposes endpoints for SSE communication
- Registers tools that can be invoked by the client (e.g., addTwoNumbers)
- Handles tool calls and returns results to the client

### Client (`client/index.js`)
- Connects to the MCP server using SSE
- Uses Google GenAI to generate conversational responses and tool calls
- Manages conversation history and tool invocation
- Handles user input and AI responses in a loop, allowing for interactive sessions

## How to Run
1. **Install dependencies**
   - Run `npm install` in both `server` and `client` folders
2. **Start the server**
   - Navigate to `mcp-servers/first/server` and run `node index.js`
3. **Start the client**
   - Navigate to `mcp-servers/first/client` and run `node index.js`
4. **Interact**
   - Enter prompts in the client terminal and observe AI responses and tool invocations

## Key Takeaways
- MCP enables structured communication between AI agents and tools
- SSE is effective for real-time server-client communication
- Integrating GenAI allows for dynamic, conversational tool usage
- Proper code flow and error handling are crucial for robust AI agent systems

---
This project is a foundational step towards building advanced AI agent systems that can interact with external tools and services in a standardized way.
