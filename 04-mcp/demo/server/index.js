import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import z from "zod";
const server = new McpServer({
  name: "backwards-compatible-server",
  version: "1.0.0"
});

// ... set up server resources, tools, and prompts ...

const app = express();
app.use(express.json());

server.tool("addTwoNumbers",
  "Add two numbers",
  {
    a: z.number(),
    b: z.number()
  },
  async (arg) => {
    const { a, b } = arg;
    return {
      content: [
        {
          type: "text",
          text: `the sum of ${a} and ${b} is ${a + b}`
        }
      ]
    }
  }
)

server.tool("subtractNumbers",
  "Subtract two numbers",
  {
    a: z.number(),
    b: z.number()
  },
  async (arg) => {
    const { a, b } = arg;
    return {
      content: [
        {
          type: "text",
          text: `${a} - ${b} = ${a - b}`
        }
      ]
    }
  }
)

server.tool("multiplyNumbers",
  "Multiply two numbers",
  {
    a: z.number(),
    b: z.number()
  },
  async (arg) => {
    const { a, b } = arg;
    return {
      content: [
        {
          type: "text",
          text: `${a} × ${b} = ${a * b}`
        }
      ]
    }
  }
)

server.tool("concatenateStrings",
  "Concatenate two strings with optional separator",
  {
    str1: z.string(),
    str2: z.string(),
    separator: z.string().optional().default(" ")
  },
  async (arg) => {
    const { str1, str2, separator } = arg;
    const result = str1 + separator + str2;
    return {
      content: [
        {
          type: "text",
          text: `Concatenated result: "${result}"`
        }
      ]
    }
  }
)

server.tool("reverseString",
  "Reverse a string",
  {
    text: z.string()
  },
  async (arg) => {
    const { text } = arg;
    const reversed = text.split('').reverse().join('');
    return {
      content: [
        {
          type: "text",
          text: `Original: "${text}"\nReversed: "${reversed}"`
        }
      ]
    }
  }
)

server.tool("calculateAverage",
  "Calculate average of an array of numbers",
  {
    numbers: z.array(z.number())
  },
  async (arg) => {
    const { numbers } = arg;
    if (numbers.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Cannot calculate average of empty array"
          }
        ]
      }
    }
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    const average = sum / numbers.length;
    return {
      content: [
        {
          type: "text",
          text: `Numbers: [${numbers.join(', ')}]\nSum: ${sum}\nAverage: ${average.toFixed(2)}`
        }
      ]
    }
  }
)

server.tool("findMaxMin",
  "Find maximum and minimum values in an array",
  {
    numbers: z.array(z.number())
  },
  async (arg) => {
    const { numbers } = arg;
    if (numbers.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Cannot find max/min of empty array"
          }
        ]
      }
    }
    const max = Math.max(...numbers);
    const min = Math.min(...numbers);
    return {
      content: [
        {
          type: "text",
          text: `Numbers: [${numbers.join(', ')}]\nMaximum: ${max}\nMinimum: ${min}`
        }
      ]
    }
  }
)

server.tool("generateRandomNumber",
  "Generate a random number between min and max (inclusive)",
  {
    min: z.number().default(1),
    max: z.number().default(100)
  },
  async (arg) => {
    const { min, max } = arg;
    if (min > max) {
      return {
        content: [
          {
            type: "text",
            text: `Error: min (${min}) cannot be greater than max (${max})`
          }
        ]
      }
    }
    const random = Math.floor(Math.random() * (max - min + 1)) + min;
    return {
      content: [
        {
          type: "text",
          text: `Random number between ${min} and ${max}: ${random}`
        }
      ]
    }
  }
)

server.tool("countWords",
  "Count words in a text string",
  {
    text: z.string()
  },
  async (arg) => {
    const { text } = arg;
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const charCount = text.length;
    return {
      content: [
        {
          type: "text",
          text: `Text: "${text}"\nWord count: ${wordCount}\nCharacter count: ${charCount}`
        }
      ]
    }
  }
)

server.tool("isPalindrome",
  "Check if a string is a palindrome",
  {
    text: z.string()
  },
  async (arg) => {
    const { text } = arg;
    const cleaned = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    const reversed = cleaned.split('').reverse().join('');
    const isPalindrome = cleaned === reversed;
    return {
      content: [
        {
          type: "text",
          text: `Text: "${text}"\nCleaned: "${cleaned}"\nIs palindrome: ${isPalindrome ? 'Yes' : 'No'}`
        }
      ]
    }
  }
)

// Store transports for each session type
const transports = {
  sse: {}
};

// Modern Streamable HTTP endpoint
app.all('/mcp', async (req, res) => {
  // Handle Streamable HTTP transport for modern clients
  // Implementation as shown in the "With Session Management" example
  // ...
});

// Legacy SSE endpoint for older clients
app.get('/sse', async (req, res) => {
  // Create SSE transport for legacy clients
  const transport = new SSEServerTransport('/messages', res);
  transports.sse[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports.sse[transport.sessionId];
  });

  await server.connect(transport);
});

// Legacy message endpoint for older clients
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.sse[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

app.listen(3000, () => {
  console.log("Server is running...")
});