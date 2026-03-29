import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── helpers ──────────────────────────────────────────────────────────────────

function readPromptFile(name: string): string {
  const filePath = resolve(ROOT, name);
  if (!existsSync(filePath)) {
    console.error(`Error: ${name} not found at ${filePath}`);
    process.exit(1);
  }
  const content = readFileSync(filePath, "utf-8").trim();
  if (!content) {
    console.error(`Error: ${name} is empty. Please add content before running.`);
    process.exit(1);
  }
  return content;
}

function loadModels(filter?: string): string[] {
  const configPath = resolve(ROOT, "models.json");
  if (!existsSync(configPath)) {
    console.error("Error: models.json not found.");
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(configPath, "utf-8")) as {
    models: string[];
  };
  if (filter) {
    return [filter];
  }
  return config.models;
}

function separator(char = "─", width = 80): string {
  return char.repeat(width);
}

function header(title: string): string {
  const pad = Math.max(0, 78 - title.length);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return `┌${"─".repeat(79)}┐\n│${" ".repeat(left)} ${title} ${" ".repeat(right)}│\n└${"─".repeat(79)}┘`;
}

// ── OpenRouter API ────────────────────────────────────────────────────────────

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string; role: string };
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function callOpenRouter(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<{ content: string; usage?: ChatCompletionResponse["usage"] }> {
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/systemprompt-example",
      "X-Title": "systemprompt-example",
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;

  if (!data.choices || data.choices.length === 0) {
    throw new Error("No choices returned from API");
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

// ── CLI argument parsing ──────────────────────────────────────────────────────

function parseArgs(): { model?: string; help: boolean } {
  const args = process.argv.slice(2);
  const result: { model?: string; help: boolean } = { help: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--help" || args[i] === "-h") {
      result.help = true;
    } else if ((args[i] === "--model" || args[i] === "-m") && args[i + 1]) {
      result.model = args[++i];
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
systemprompt-example — OpenRouter model response tester

Usage:
  npm start                        Run all models from models.json
  npm start -- --model <model-id>  Run a specific model only

Options:
  -m, --model <model-id>  Override model list with a single model
  -h, --help              Show this help message

Configuration:
  systemprompt.md   System prompt sent to all models
  userprompt.md     User prompt sent to all models
  models.json       List of OpenRouter model IDs to test
  .env              OPENROUTER_API_KEY=<your key>

Example:
  npm start -- --model anthropic/claude-3.5-sonnet
`);
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error(
      "Error: OPENROUTER_API_KEY environment variable is not set.\n" +
        "Copy .env.example to .env and add your key."
    );
    process.exit(1);
  }

  const systemPrompt = readPromptFile("systemprompt.md");
  const userPrompt = readPromptFile("userprompt.md");
  const models = loadModels(args.model);

  console.log(`\n${separator("═")}`);
  console.log("  systemprompt-example — OpenRouter Model Tester");
  console.log(`${separator("═")}`);
  console.log(`\nSystem prompt: ${systemPrompt.slice(0, 80)}${systemPrompt.length > 80 ? "…" : ""}`);
  console.log(`User prompt:   ${userPrompt.slice(0, 80)}${userPrompt.length > 80 ? "…" : ""}`);
  console.log(`\nTesting ${models.length} model${models.length === 1 ? "" : "s"}:\n`);
  models.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
  console.log();

  const results: Array<{
    model: string;
    content?: string;
    error?: string;
    durationMs: number;
    usage?: ChatCompletionResponse["usage"];
  }> = [];

  for (const model of models) {
    process.stdout.write(`\nQuerying ${model} ... `);
    const start = Date.now();

    try {
      const result = await callOpenRouter(model, systemPrompt, userPrompt, apiKey);
      const durationMs = Date.now() - start;
      console.log(`done (${(durationMs / 1000).toFixed(1)}s)`);
      results.push({ model, content: result.content, durationMs, usage: result.usage });
    } catch (err) {
      const durationMs = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`FAILED`);
      results.push({ model, error: message, durationMs });
    }
  }

  // Print all responses
  console.log(`\n${separator("═")}`);
  console.log("  RESPONSES");
  console.log(`${separator("═")}\n`);

  for (const result of results) {
    console.log(header(result.model));
    console.log();

    if (result.error) {
      console.log(`  ERROR: ${result.error}`);
    } else {
      console.log(result.content);
      if (result.usage) {
        console.log(
          `\n  [tokens: ${result.usage.prompt_tokens} prompt + ${result.usage.completion_tokens} completion = ${result.usage.total_tokens} total | ${(result.durationMs / 1000).toFixed(1)}s]`
        );
      }
    }

    console.log();
  }

  console.log(separator("═"));

  const failed = results.filter((r) => r.error).length;
  const succeeded = results.length - failed;
  console.log(`\nSummary: ${succeeded}/${results.length} succeeded${failed > 0 ? `, ${failed} failed` : ""}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
