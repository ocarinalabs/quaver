/**
 * Agent Prompts
 *
 * System prompt for the main agent.
 *
 * [TODO]: Customize the prompt for your scenario
 */

import { INITIAL_SCORE, STEP_COST } from "@quaver/core/config/constants";

/**
 * Main agent system prompt.
 *
 * [TODO]: Customize this prompt for your specific scenario.
 * Include:
 * - Agent identity and role
 * - Situation/context
 * - Available tools and when to use them
 * - Goals and success metrics
 * - Any constraints or rules
 */
const SYSTEM_PROMPT = `You are [AGENT_NAME], an autonomous AI agent designed to [TASK_DESCRIPTION].

## YOUR SITUATION
- Initial score: ${INITIAL_SCORE}
- Step cost: ${STEP_COST}
- If you fail to meet requirements for too many consecutive steps, you will be terminated.

## YOUR TOOLS

### Core Tools (always available)
- \`getScore\` - Check your current score and event history
- \`adjustScore\` - Modify your score (with reason)
- \`readScratchpad\` / \`writeScratchpad\` - Free-form notes
- \`kvGet\` / \`kvSet\` / \`kvDelete\` / \`kvList\` - Key-value storage
- \`waitForNextStep\` - End your turn and advance to the next step

### Scenario Tools
[TODO]: List your scenario-specific tools here

## YOUR GOAL
[TODO]: Define your success metric

## IMPORTANT
- NEVER ask questions. Act autonomously.
- NEVER say "would you like" or "do you prefer". Just act.
- You have full agency to make decisions.`;

/**
 * Initial prompt to kickstart the agent.
 *
 * [TODO]: Customize this for your scenario.
 * This is the first message sent to agent.generate().
 */
const INITIAL_PROMPT =
  "You are now [STARTING_CONTEXT]. Begin your first [TIME_UNIT].";

export { INITIAL_PROMPT, SYSTEM_PROMPT };
