#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

for ((i=1; i<=$1; i++)); do
  result=$(docker sandbox run claude --permission-mode acceptEdits -p "@prd.json @progress.txt \
  1. Find the highest-priority task (lowest priority number, passes=false) and implement it. \
  2. Run your tests and type checks. \
  3. If the task has 'verification': 'playwright', start the dev server and use Playwright to verify the UI renders and functions correctly. \
  4. Update prd.json: set passes=true for completed task. \
  5. Append your progress to progress.txt. \
  6. Commit your changes. \
  ONLY WORK ON A SINGLE TASK. \
  If all tasks have passes=true, output <promise>COMPLETE</promise>.")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations."
    exit 0
  fi
done
