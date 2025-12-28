
# 🚀 Build Your Own Cursor - Using Google's Gemini Model

This project demonstrates how to build your own **AI-powered website generator** (like Cursor IDE) using **Google’s Gemini Model**.
The AI agent takes natural language instructions from the user and automatically creates the required website files (`index.html`, `style.css`, `script.js`, etc.) in a specified folder.

---
## Code

```js
import readlineSync from 'readline-sync';
import { GoogleGenAI, Type } from '@google/genai';
const ai = new GoogleGenAI({apiKey:"AIzaSyCIF2G2tWN-FLRAKKfiedCynfRCLlwiTsc"});
import fs from 'fs';
import path from 'path';
import os from 'os';


const platform = os.platform();


async function createWebsiteFile({ folder, filename, content }) {
	try {
		const dirPath = path.join(process.cwd(), folder);
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}
		const filePath = path.join(dirPath, filename);
		fs.writeFileSync(filePath, content, 'utf8');
		return { status: 'success', file: filePath };
	} catch (error) {
		return { error: error.message };
	}
}
const toolFunctions = {
	createWebsiteFile,
};

const tools = [
	{
		functionDeclarations: [
			{
				name: "createWebsiteFile",
				description: "Creates or writes a file for the website using Node.js (cross-platform).",
				parameters: {
					type: Type.OBJECT,
					properties: {
						folder: { type: Type.STRING, description: "Folder name for the website" },
						filename: { type: Type.STRING, description: "File name to create or write" },
						content: { type: Type.STRING, description: "Content to write in the file" },
					},
					required: ["folder", "filename", "content"],
				},
			},
		],
	},
];


let runAiAgent = async (userPrompt) => {
	let contents = [
		{
			role: "user",
			parts: [
				{
					text: userPrompt,
				},
			],
		},
	];

	while (true) {
		const result = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents,
			config: {
				tools,
				systemInstruction: `You are a website builder expert. You have to create the frontend of the website by analysing the user input.
				You have access of tool, which can run or execute any shell or terminal command.
				Current user operating system is ${platform}.

				Your job is to analyze the user's website request and use the available tool createWebsiteFile to:
				1. Create the required folder for the website (by creating a file inside it, e.g., index.html).
				2. Create and write index.html, style.css, script.js, and any other required files inside the folder.
				3. Write the appropriate content for each file.
				4. Do not instruct the user to run shell commands. Do not output shell commands. Instead, use the tool to create files and folders directly.
				5. Respond only with the result of the tool calls and a summary of what was created.
                
				Example: To create a folder and index.html, call createWebsiteFile with folder, filename, and content.
				`
			},
		});

		if (result.functionCalls && result.functionCalls.length > 0) {
			const functionCall = result.functionCalls[0];
			const { name, args } = functionCall;

			if (!toolFunctions[name]) {
				throw new Error(`Unknown function call: ${name}`);
			}

			const toolResponse = await toolFunctions[name](args);

			const functionResponsePart = {
				name: functionCall.name,
				response: {
					result: toolResponse,
				},
			};

			contents.push({
				role: "model",
				parts: [
					{
						functionCall: functionCall,
					},
				],
			});
			contents.push({
				role: "user",
				parts: [
					{
						functionResponse: functionResponsePart,
					},
				],
			});
		} else {
			console.log(result.text);
			break;
		}
	}
};

let main = async () => {
	const userPrompt = readlineSync.question("You: ");
	await runAiAgent(userPrompt);
    main();
};

main();
```

## 📌 Features

* 🤖 Uses **Google GenAI (Gemini)** for intelligent content generation.
* 🗂️ Automatically creates project folders and files.
* 📝 Writes proper content for `index.html`, `style.css`, `script.js`, etc.
* 🔄 Works cross-platform (Windows/Linux/macOS).
* ⚡ Interactive CLI with continuous prompts.

---

## 📂 Project Flow

### 1. **User Input**

The script asks the user to describe the kind of website they want:

```bash
You: Create a simple portfolio website with HTML, CSS, and JS.
```

---

### 2. **AI Agent Setup**

The agent is configured with:

* **System Instructions** → Tells the AI it’s a *website builder expert*.
* **Tools** → A custom function `createWebsiteFile` to handle file creation.

---

### 3. **Tool Function**

`createWebsiteFile` handles:

* Creating the folder if it doesn’t exist.
* Writing files with given content.

```js
async function createWebsiteFile({ folder, filename, content }) {
  try {
    const dirPath = path.join(process.cwd(), folder);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path.join(dirPath, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    return { status: 'success', file: filePath };
  } catch (error) {
    return { error: error.message };
  }
}
```

---

### 4. **AI & Tools Integration**

The AI model analyzes user input and decides **when to call the tool**.

* If a tool call is required → `createWebsiteFile` is executed.
* Otherwise → the AI replies directly with text.

---

### 5. **Main Execution Loop**

The script runs continuously:

* Takes user prompt.
* Passes it to AI.
* Creates necessary files automatically.
* Prompts again.

```js
let main = async () => {
  const userPrompt = readlineSync.question("You: ");
  await runAiAgent(userPrompt);
  main(); 
};
main();
```
---

## 🛠️ Example

**Input:**

```
You: Create a simple landing page with a button that shows an alert.
```

**AI Action:**

* Creates a folder (e.g., `landing-page/`).
* Generates:

  * `index.html` → Basic HTML structure with a button.
  * `style.css` → Button styling.
  * `script.js` → JS alert function.

**Output:**

```
✅ Created landing-page/index.html
✅ Created landing-page/style.css
✅ Created landing-page/script.js
```

---

## ⚙️ Tech Stack

* **Node.js** (backend & file handling)
* **Google GenAI (Gemini 2.5 Flash)**
* **Readline-Sync** (CLI input)
* **File System (fs)** for writing files

---

## 🎯 How It Works (Analogy)

* **You describe** → “I want a blog site.”
* **AI interprets** → Generates HTML, CSS, JS.
* **Tool executes** → Writes the files in your project folder.

