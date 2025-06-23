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
      const ollamaRun = spawn("ollama", ["run", "tron"], {
        stdio: "pipe",
      });

      let response = "";

      ollamaRun.stdout.on("data", (data) => {
        response += data.toString();
      });

      ollamaRun.stderr.on("data", (data) => {
        console.error("Error:", data.toString());
      });

      ollamaRun.on("close", (code) => {
        if (code === 0) {
          resolve(response.trim());
        } else {
          reject(new Error(`Ollama process exited with code ${code}`));
        }
      });

      // Send the message to Tron
      ollamaRun.stdin.write(message + "\n");
      ollamaRun.stdin.end();
    });
  }

  async startChat() {
    console.log("🤖 TRON SYSTEM INITIALIZED");
    console.log("═══════════════════════════");
    console.log("Greetings, User. I am TRON, your digital assistant.");
    console.log('Type "exit", "quit", or "derez" to terminate the session.\n');

    const chat = async () => {
      this.rl.question("USER: ", async (input) => {
        const trimmedInput = input.trim().toLowerCase();

        if (
          trimmedInput === "exit" ||
          trimmedInput === "quit" ||
          trimmedInput === "derez"
        ) {
          console.log("\n🔴 TRON: Derezzling... End of line.");
          this.cleanup();
          return;
        }

        if (trimmedInput === "") {
          chat();
          return;
        }

        try {
          console.log("\n🔵 TRON: Processing...");
          const response = await this.chatWithTron(input);
          console.log(`🤖 TRON: ${response}\n`);
        } catch (error) {
          console.log(`❌ TRON: System error encountered - ${error.message}\n`);
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
        console.log("✅ Ollama server is already running!");
        this.isOllamaRunning = true;
      }

      await this.startChat();
    } catch (error) {
      console.error("❌ Failed to initialize TRON:", error.message);
      console.error(
        'Make sure Ollama is installed and the "tron" model exists.'
      );
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n🔴 TRON: Emergency shutdown initiated. End of line.");
  process.exit(0);
});

// Initialize TRON
const tron = new TronCLI();
tron.initialize();
