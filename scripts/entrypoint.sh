#!/bin/bash

echo "Starting chat setup..."

# Run migrations
bun run ./migrate.ts

if [ $? -ne 0 ]; then
    echo "Migration failed! Exiting..."
    exit 1
fi


# Start the server
echo "Starting chat server..."
exec bun run ./dist/app.js
