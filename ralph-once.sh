#!/bin/bash
# ralph-once.sh - Single iteration HITL Ralph
# Run this to watch Ralph work on one task at a time

set -e

cd "$(dirname "$0")"

claude -p \
"@prd.json @progress.txt

You are working through a PRD for a hyper-local weather app.

1. Read prd.json and progress.txt to understand what needs to be done and what's already complete.

2. Choose the HIGHEST PRIORITY task that:
   - Has passes: false
   - Is not blocked by incomplete dependencies
   - Prioritize by priority number (1 = highest)

3. Implement that ONE task completely:
   - Follow the steps in the PRD item
   - Run feedback loops (TypeScript types, linting) before committing
   - Keep changes small and focused

4. After completing the task:
   - Update prd.json: set passes: true for the completed item
   - Append to progress.txt with:
     - PRD item completed
     - Files changed
     - Decisions made
     - Notes for next iteration
   - Make a git commit with message: 'PRD-XXX: [description]'

5. If ALL tasks in prd.json have passes: true, output:
   <promise>COMPLETE</promise>

IMPORTANT:
- Only work on ONE task per iteration
- Run 'npm run typecheck' and 'npm run lint' before committing (if available)
- Do NOT skip verification steps
- Quality over speed
"
