#!/usr/bin/env node

const { spawn, exec } = require("child_process");
const readline = require("readline");

class TronCLI {
  constructor() {
    this.isOllamaRunning = false;
    this.ollamaProcess = null;
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

  async chatWithTron(message) {
    return new Promise((resolve, reject) => {
      const requestData = JSON.stringify({
        model: "tron",
        prompt: message,
        stream: false,
      });

      const curlCommand = `curl -s -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d '${requestData}'`;

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

  async startChat() {
    console.log("🤖 TRON SYSTEM INITIALIZED");
    console.log("═══════════════════════════");
    console.log("Greetings, User. I am TRON, your digital assistant.");
    console.log('Type "exit", or "quit" to terminate the session.\n\x1b[0m');

    const chat = async () => {
      this.rl.question("USER: ", async (input) => {
        const trimmedInput = input.trim().toLowerCase();

        if (trimmedInput === "exit" || trimmedInput === "quit") {
          console.log("\n🔴 TRON: Exiting... Terminated.\x1b[0m");
          this.cleanup();
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
