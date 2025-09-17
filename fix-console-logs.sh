#!/bin/bash

# Script to replace console.log statements with proper logging

echo "Fixing console.log statements in controllers..."

# Function to add logger import if not present
add_logger_import() {
    local file="$1"
    if ! grep -q "import.*logger.*from.*loggerService" "$file"; then
        # Find the last import line and add logger import after it
        sed -i '' '/^import/,$!b; /^import.*$/a\
import { logger } from '\''../services/loggerService'\'';
' "$file"
    fi
}

# Function to replace console statements
replace_console() {
    local file="$1"
    echo "Processing $file..."

    # Add logger import
    add_logger_import "$file"

    # Replace console.error statements
    sed -i '' "s/console\.error('\([^']*\)', error);/logger.error('\1', error);/g" "$file"
    sed -i '' "s/console\.error(\"\([^\"]*\)\", error);/logger.error('\1', error);/g" "$file"

    # Replace console.warn statements
    sed -i '' "s/console\.warn('\([^']*\)');/logger.warn('\1');/g" "$file"
    sed -i '' "s/console\.warn(\"\([^\"]*\)\");/logger.warn('\1');/g" "$file"

    # Replace console.log statements
    sed -i '' "s/console\.log('\([^']*\)');/logger.info('\1');/g" "$file"
    sed -i '' "s/console\.log(\"\([^\"]*\)\");/logger.info('\1');/g" "$file"
}

# Process all controller files
for file in src/controllers/*.ts; do
    if [[ -f "$file" ]]; then
        replace_console "$file"
    fi
done

echo "Console.log statements have been replaced with proper logging!"