# thought-experiment-llm

Send the same system prompt and user prompt to multiple LLMs via [OpenRouter](https://openrouter.ai) and compare their responses side by side.

Edit two markdown files, run one command, read the output.

## How it works

```
systemprompt.md  →  system role message
userprompt.md    →  user role message
models.json      →  list of OpenRouter model IDs to query
```

Each model receives the same messages. Responses are printed sequentially with token usage and timing.

## Setup

**1. Get an OpenRouter API key**

Sign up at [openrouter.ai](https://openrouter.ai) and create a key.

**2. Clone and install**

```bash
git clone git@github.com:shift/thought-experiment-llm.git
cd thought-experiment-llm
cp .env.example .env
# edit .env and set OPENROUTER_API_KEY=sk-or-...
npm install
```

Or with Nix:

```bash
nix develop
npm install
```

**3. Write your prompts**

```bash
# systemprompt.md — the system prompt
echo "You are a concise technical assistant." > systemprompt.md

# userprompt.md — the user message
echo "What is the CAP theorem?" > userprompt.md
```

**4. Run**

```bash
npm start
```

## Usage

```
npm start                              # query all models in models.json
npm start -- --model <model-id>        # query a single model
npm start -- --help                    # show help
```

### With Nix

```bash
nix run .                              # query all models
nix run . -- --model openai/gpt-4o    # query a single model
```

## Configuration

### `.env`

```env
OPENROUTER_API_KEY=sk-or-...
```

### `models.json`

List of [OpenRouter model IDs](https://openrouter.ai/models) to query:

```json
{
  "models": [
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o",
    "google/gemini-flash-1.5",
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free"
  ]
}
```

Models suffixed with `:free` are available at no cost on OpenRouter.

### `systemprompt.md`

The system prompt sent to every model. Defines persona, constraints, output format, etc.

### `userprompt.md`

The user message sent to every model. This is the question or task you want to compare across models.

## Example output

```
════════════════════════════════════════════════════════════════════════════════
  systemprompt-example — OpenRouter Model Tester
════════════════════════════════════════════════════════════════════════════════

System prompt: You are a concise technical assistant.
User prompt:   What is the CAP theorem?

Testing 2 models:

  1. anthropic/claude-3.5-sonnet
  2. openai/gpt-4o

Querying anthropic/claude-3.5-sonnet ... done (2.1s)
Querying openai/gpt-4o ... done (3.4s)

════════════════════════════════════════════════════════════════════════════════
  RESPONSES
════════════════════════════════════════════════════════════════════════════════

┌───────────────────────────────────────────────────────────────────────────────┐
│                     anthropic/claude-3.5-sonnet                               │
└───────────────────────────────────────────────────────────────────────────────┘

The CAP theorem states that a distributed system can guarantee at most two of...

  [tokens: 42 prompt + 198 completion = 240 total | 2.1s]
```

## Project structure

```
.
├── src/
│   └── index.ts        # CLI — reads prompts, calls OpenRouter, prints results
├── systemprompt.md     # your system prompt
├── userprompt.md       # your user prompt
├── models.json         # OpenRouter model IDs to test
├── flake.nix           # Nix dev shell + runnable app
├── .env.example        # copy to .env and add your key
├── tsconfig.json
└── package.json
```

## Requirements

- Node.js 22+ (or `nix develop`)
- An [OpenRouter](https://openrouter.ai) API key
