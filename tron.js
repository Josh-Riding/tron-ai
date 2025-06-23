#!/usr/bin/env node

const { spawn, exec } = require("child_process");
const readline = require("readline");

class TronCLI {
  constructor() {
    this.isOllamaRunning = false;
    this.ollamaProcess = null;
    this.conversationHistory = []; // Store conversation history
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async checkOllamaStatus() {
    return new Promise((resolve) => {
      exec("curl -s http://localhost:11434/api/tags", (error) => {
        resolve(!error);
      });
    });
  }

  async startOllama() {
    console.log("🔄 Starting Ollama server...");

    return new Promise((resolve, reject) => {
      this.ollamaProcess = spawn("ollama", ["serve"], {
        stdio: "pipe",
      });

      // Wait a bit for the server to start
      setTimeout(async () => {
        const isRunning = await this.checkOllamaStatus();
        if (isRunning) {
          this.isOllamaRunning = true;
          console.log("✅ Ollama server started successfully!");
          resolve();
        } else {
          reject(new Error("Failed to start Ollama server"));
        }
      }, 3000);
    });
  }

  // Build the full conversation context
  buildConversationPrompt(newMessage) {
    let fullPrompt = "";

    // Add conversation history
    for (const exchange of this.conversationHistory) {
      fullPrompt += `User: ${exchange.user}\nTRON: ${exchange.assistant}\n\n`;
    }

    // Add the new message
    fullPrompt += `User: ${newMessage}\nTRON:`;

    return fullPrompt;
  }

  async chatWithTron(message) {
    return new Promise((resolve, reject) => {
      // Build the full conversation context
      const fullPrompt = this.buildConversationPrompt(message);

      const requestData = JSON.stringify({
        model: "tron",
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1000,
        },
      });

      const curlCommand = `curl -s -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d '${requestData.replace(
        /'/g,
        "'\\''"
      )}}'`;

      exec(curlCommand, (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(`Failed to communicate with Ollama: ${error.message}`)
          );
          return;
        }

        try {
          const result = JSON.parse(stdout);
          if (result.response) {
            // Store this exchange in conversation history
            this.conversationHistory.push({
              user: message,
              assistant: result.response.trim(),
            });

            // Keep only the last 10 exchanges to prevent context from getting too long
            if (this.conversationHistory.length > 10) {
              this.conversationHistory = this.conversationHistory.slice(-10);
            }

            resolve(result.response);
          } else if (result.error) {
            reject(new Error(result.error));
          } else {
            reject(new Error("No response from Ollama"));
          }
        } catch (parseError) {
          reject(
            new Error(`Failed to parse Ollama response: ${parseError.message}`)
          );
        }
      });
    });
  }

  // Add a method to clear conversation history if needed
  clearHistory() {
    this.conversationHistory = [];
    console.log("🧠 TRON: Memory cleared. Starting fresh conversation.\n");
  }

  async startChat() {
    console.log("🤖 TRON SYSTEM INITIALIZED");
    console.log("═══════════════════════════");
    console.log("Greetings, User. I am TRON, your digital assistant.");
    console.log('Type "exit" or "quit" to terminate the session.');
    console.log('Type "clear" to clear conversation memory.\n');

    const chat = async () => {
      this.rl.question("USER: ", async (input) => {
        const trimmedInput = input.trim().toLowerCase();

        if (trimmedInput === "exit" || trimmedInput === "quit") {
          console.log("\n🔴 TRON: Exiting... Terminated.\x1b[0m");
          this.cleanup();
          return;
        }

        if (trimmedInput === "clear") {
          this.clearHistory();
          chat();
          return;
        }

        if (trimmedInput === "") {
          chat();
          return;
        }

        try {
          console.log("\nTRON: Processing...");
          const response = await this.chatWithTron(input);
          console.log(`TRON: ${response}\n`);
        } catch (error) {
          console.log(`TRON: System error encountered - ${error.message}\n`);
        }

        chat();
      });
    };

    chat();
  }

  cleanup() {
    if (this.ollamaProcess) {
      this.ollamaProcess.kill();
    }
    this.rl.close();
    process.exit(0);
  }

  async initialize() {
    try {
      // Check if Ollama is already running
      const isRunning = await this.checkOllamaStatus();

      if (!isRunning) {
        await this.startOllama();
      } else {
        console.log("Ollama server is already running!");
        this.isOllamaRunning = true;
      }

      await this.startChat();
    } catch (error) {
      console.error("Failed to initialize TRON:", error.message);
      console.error(
        'Make sure Ollama is installed and the "tron" model exists.'
      );
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nTRON: Emergency shutdown initiated.");
  process.exit(0);
});

// Initialize TRON
const tron = new TronCLI();
tron.initialize();
