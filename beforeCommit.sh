#!/bin/bash

IGNORE_TESTS=false
if [ "$1" == "--ignore-tests" ]; then
    IGNORE_TESTS=true
fi

echo "RUNNING CLEAN INSTALL"
bun ci

if [ "$IGNORE_TESTS" = true ]; then
    echo "SKIPPING TESTS"
else
    echo "RUNNING TESTS"
    bun run test

    if [ $? -ne 0 ]; then
        echo "TESTS FAILED"
        exit 1
    fi
fi

echo "RUNNING FORMAT"
bun run format
echo "FORMAT PASSED"

CURRENT_BRANCH=$(git branch --show-current)
echo "CURRENT BRANCH: $CURRENT_BRANCH"

read -p "Are you on the correct branch? Yes(y) or No(n): " choice

if [ "$choice" = "y" ]; then
    echo "ADDING FILES TO GIT..."
    git add .

    read -p "Please enter a commit message: " message
    
    git commit -m "$message"
    git push -u origin "$CURRENT_BRANCH"
else
    echo "ABORTING"
    exit 1
fi