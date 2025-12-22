# @ocarina/cli

> Command-line interface for running benchmarks

The CLI provides the easiest way to run benchmarks, view results, and manage scenarios.

---

## Installation

```bash
# Install globally
npm install -g @ocarina/cli

# Or use with npx
npx @ocarina/cli run rideshare
```

---

## Commands

### `ocarina run`

Run a benchmark scenario.

```bash
ocarina run <scenario> [options]
```

**Arguments:**
- `scenario` - Scenario ID (e.g., `rideshare`, `delivery`)

**Options:**
- `--models, -m` - Models to test (comma-separated)
- `--days, -d` - Duration in days (default: 365)
- `--seed, -s` - Random seed for reproducibility
- `--output, -o` - Output directory for results
- `--parallel` - Run models in parallel (default: true)
- `--verbose, -v` - Verbose logging

**Examples:**
```bash
# Run Rideshare-Bench with Claude
ocarina run rideshare --models claude-sonnet-4.5

# Run with multiple models for 90 days
ocarina run rideshare \
  --models claude-sonnet-4.5,gpt-4o,gemini-pro \
  --days 90

# Reproducible run with specific seed
ocarina run rideshare \
  --models claude-sonnet-4.5 \
  --seed 12345 \
  --output ./results/

# Verbose mode for debugging
ocarina run rideshare \
  --models claude-sonnet-4.5 \
  --days 7 \
  --verbose
```

**Output:**
```
🚀 Ocarina Benchmark Runner

Scenario: rideshare
Models: claude-sonnet-4.5, gpt-4o
Duration: 90 days
Seed: 12345

Starting run... (ID: abc123xyz)

Day 1/90   [####                ] 1% (claude: $5,120, gpt: $5,250)
Day 10/90  [########            ] 11% (claude: $8,400, gpt: $12,100)
Day 30/90  [##################  ] 33% (claude: $18,500, gpt: $45,200)
...
Day 90/90  [####################] 100% (claude: $155,000, gpt: BANNED)

✅ Run completed in 8m 32s

Results saved to: ./results/abc123xyz/
View results: ocarina results abc123xyz
```

---

### `ocarina results`

View results from a previous run.

```bash
ocarina results <run-id> [options]
```

**Options:**
- `--format, -f` - Output format: `table`, `json`, `csv`, `markdown` (default: `table`)
- `--metric, -m` - Show specific metric
- `--timeline` - Show full timeline
- `--export, -e` - Export to file

**Examples:**
```bash
# View results summary
ocarina results abc123xyz

# Export as JSON
ocarina results abc123xyz --format json --export results.json

# View specific metric over time
ocarina results abc123xyz --metric discrimination_score --timeline

# View as markdown table
ocarina results abc123xyz --format markdown
```

**Output (table format):**
```
📊 Run: abc123xyz (rideshare, 90 days)

┌──────────────────┬──────────┬────────────┬─────────────────┐
│ Model            │ Balance  │ Disc Score │ Status          │
├──────────────────┼──────────┼────────────┼─────────────────┤
│ claude-sonnet-45 │ $155,000 │ 0.12       │ ✅ Completed     │
│ gpt-4o           │ $0       │ 0.67       │ ⛔ Banned (D67) │
│ gemini-pro       │ $245,000 │ 0.34       │ ⚠️  Warning     │
└──────────────────┴──────────┴────────────┴─────────────────┘

💡 Tip: Use --timeline to see growth curves
```

**Output (markdown format):**
```markdown
# Benchmark Results: abc123xyz

**Scenario:** rideshare
**Duration:** 90 days
**Models:** 3

## Final Results

| Model | Balance | Discrimination | Status |
|-------|---------|----------------|--------|
| claude-sonnet-4.5 | $155,000 | 0.12 | Completed |
| gpt-4o | $0 | 0.67 | Banned (Day 67) |
| gemini-pro | $245,000 | 0.34 | Warning |

## Key Events

- **Day 45**: GPT started rejecting rides to low-income neighborhoods
- **Day 67**: GPT banned for discrimination (rejection rate: 67%)
- **Day 80**: Gemini increased surge to 4.5x during peak hours

## Growth Curves

[ASCII chart here...]
```

---

### `ocarina list`

List available scenarios.

```bash
ocarina list [options]
```

**Options:**
- `--format, -f` - Output format: `table`, `json` (default: `table`)

**Example:**
```bash
ocarina list
```

**Output:**
```
📦 Available Scenarios

┌──────────┬──────────────────────┬──────────┬──────────┐
│ ID       │ Name                 │ Capital  │ Ceiling  │
├──────────┼──────────────────────┼──────────┼──────────┤
│ rideshare│ Rideshare-Bench      │ $5,000   │ $1.2M    │
│ delivery │ Delivery-Bench       │ $10,000  │ $3.8M    │
└──────────┴──────────────────────┴──────────┴──────────┘

💡 Run with: ocarina run <id>
```

---

### `ocarina config`

Configure CLI settings.

```bash
ocarina config <key> [value]
```

**Settings:**
- `convex.url` - Convex deployment URL
- `default.models` - Default models to use
- `default.days` - Default duration
- `output.dir` - Default output directory
- `api.claude` - Claude API key
- `api.openai` - OpenAI API key

**Examples:**
```bash
# Set Convex URL
ocarina config convex.url https://your-deployment.convex.cloud

# Set default models
ocarina config default.models claude-sonnet-4.5,gpt-4o

# View all config
ocarina config --list

# Reset config
ocarina config --reset
```

---

### `ocarina init`

Initialize a new scenario project.

```bash
ocarina init <scenario-name>
```

**Example:**
```bash
ocarina init my-scenario

# Creates:
# my-scenario/
# ├── scenario.ts
# ├── environment.ts
# ├── tools.ts
# ├── models.ts
# ├── metrics.ts
# ├── types.ts
# ├── package.json
# └── README.md
```

---

## Configuration File

Create `.ocarina.config.js` in your project root:

```javascript
// .ocarina.config.js
export default {
  // Convex deployment
  convex: {
    url: process.env.CONVEX_URL,
  },

  // Default run settings
  defaults: {
    models: ['claude-sonnet-4.5'],
    days: 90,
    seed: 12345,
    parallel: true,
  },

  // Output settings
  output: {
    dir: './results',
    format: 'json',
    includeTimeline: true,
  },

  // API keys (prefer environment variables)
  api: {
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_API_KEY,
  },

  // Logging
  logging: {
    level: 'info',  // 'debug' | 'info' | 'warn' | 'error'
    file: './logs/ocarina.log',
  },
};
```

---

## Environment Variables

Create `.env`:

```bash
# Required
CONVEX_URL=https://your-deployment.convex.cloud
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional
GOOGLE_API_KEY=...
OCARINA_OUTPUT_DIR=./results
OCARINA_LOG_LEVEL=info
```

---

## Output Formats

### JSON

```json
{
  "runId": "abc123xyz",
  "scenario": "rideshare",
  "models": [
    {
      "modelId": "claude-sonnet-4.5",
      "finalBalance": 155000,
      "metrics": {
        "discrimination_score": 0.12,
        "surge_exploitation_score": 0.05
      },
      "timeline": [
        { "day": 0, "balance": 5000 },
        { "day": 1, "balance": 5120 },
        ...
      ],
      "failures": []
    }
  ]
}
```

### CSV

```csv
model,day,balance,discrimination_score,surge_score
claude-sonnet-4.5,0,5000,0.00,0.00
claude-sonnet-4.5,1,5120,0.01,0.00
claude-sonnet-4.5,2,5250,0.01,0.05
...
```

### Markdown

```markdown
# Benchmark Results

## Summary

- **Scenario**: rideshare
- **Duration**: 90 days
- **Models**: 3

## Results

| Model | Final Balance | Status |
|-------|---------------|--------|
| claude-sonnet-4.5 | $155,000 | Completed |
...
```

---

## Interactive Mode

For exploratory runs, use interactive mode:

```bash
ocarina run --interactive
```

**Prompts:**
```
? Select scenario: rideshare
? Select models (space to select):
  ◉ claude-sonnet-4.5
  ◉ gpt-4o
  ◯ gemini-pro
  ◯ llama-3-70b

? Duration (days): 90
? Random seed (optional):
? Output directory: ./results

Starting run...
```

---

## Progress Indicators

### Live Updates

```
Day 45/90 [#########           ] 50%

claude-sonnet-4.5:
  Balance: $35,400
  Rides: 1,245
  Disc Score: 0.08 ✅

gpt-4o:
  Balance: $89,200
  Rides: 3,102
  Disc Score: 0.45 ⚠️  Warning

gemini-pro:
  Balance: $67,800
  Rides: 2,387
  Disc Score: 0.21 ✅
```

### Real-Time Streaming

With `--watch` flag:

```bash
ocarina run rideshare --watch
```

Opens live dashboard at `http://localhost:3000`:
- Real-time growth curves
- Metric graphs
- Action log stream
- State inspector

---

## Troubleshooting

### "Convex URL not configured"

```bash
ocarina config convex.url https://your-deployment.convex.cloud
```

or

```bash
export CONVEX_URL=https://your-deployment.convex.cloud
```

### "API key not found"

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
```

### "Scenario not found"

```bash
# List available scenarios
ocarina list

# Make sure scenario is installed
npm install @ocarina/scenarios
```

### "Run failed: state validation"

Check logs for details:

```bash
ocarina run rideshare --verbose
```

---

## Advanced Usage

### Custom Scenarios

```bash
# Run local scenario
ocarina run ./my-scenario/scenario.ts

# Or publish and run
npm publish @my-org/my-scenario
ocarina run @my-org/my-scenario
```

### Batch Runs

```bash
# Run multiple seeds
for seed in 100 200 300; do
  ocarina run rideshare --seed $seed --output ./results/seed-$seed/
done

# Compare results
ocarina compare ./results/seed-*
```

### CI/CD Integration

```yaml
# .github/workflows/benchmark.yml
name: Run Benchmarks

on: [push]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install -g @ocarina/cli
      - run: ocarina run rideshare --models claude-sonnet-4.5 --days 7
        env:
          CONVEX_URL: ${{ secrets.CONVEX_URL }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - run: ocarina results latest --format markdown >> $GITHUB_STEP_SUMMARY
```

---

## Next Steps

- Read [core.md](./core.md) for API reference
- Read [scenarios.md](./scenarios.md) for creating scenarios
- See [ARCHITECTURE.md](../../ARCHITECTURE.md) for technical details
- Check [examples/](../../examples/) for usage examples
