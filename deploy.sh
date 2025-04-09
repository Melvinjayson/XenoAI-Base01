#!/bin/bash

# Xeno AI Deployment Script
# This script automates the deployment process for Xeno AI

echo "Starting Xeno AI deployment process..."

# Step 1: Build the application
echo "Building the application..."
npm run build

if [ $? -ne 0 ]; then
  echo "Build failed. Aborting deployment."
  exit 1
fi

echo "Build completed successfully."

# Step 2: Run database migrations if needed
if [ -n "$DATABASE_URL" ]; then
  echo "Database URL found. Running database push..."
  npm run db:push
  
  if [ $? -ne 0 ]; then
    echo "Database push failed. Aborting deployment."
    exit 1
  fi
  
  echo "Database push completed successfully."
else
  echo "No DATABASE_URL found. Skipping database push."
fi

# Step 3: Check for environment variables
echo "Checking for required environment variables..."

REQUIRED_VARS=("NODE_ENV" "SESSION_SECRET")
MISSING_VARS=0

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "Missing required environment variable: $VAR"
    MISSING_VARS=1
  fi
done

if [ $MISSING_VARS -eq 1 ]; then
  echo "Please set all required environment variables before deploying."
  exit 1
fi

echo "All required environment variables are set."

# Step 4: Start the application
echo "Starting Xeno AI in production mode..."
NODE_ENV=production node dist/index.js

echo "Deployment completed successfully."