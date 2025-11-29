#!/bin/bash

# Helper script to set up daily cron job for Supabase Keep-Alive

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRON_TIME="${1:-0 8}"  # Default: 8:00 AM (format: "HOUR MINUTE")
LOG_FILE="/tmp/supabase-keepalive.log"

echo "🔧 Setting up daily cron job for Supabase Keep-Alive"
echo ""
echo "Project directory: $PROJECT_DIR"
echo "Cron time: $CRON_TIME * * * (daily)"
echo "Log file: $LOG_FILE"
echo ""

# Find npm path
NPM_PATH=$(which npm)
if [ -z "$NPM_PATH" ]; then
    echo "❌ Error: npm not found in PATH"
    exit 1
fi

# Create cron entry
CRON_ENTRY="$CRON_TIME * * * cd $PROJECT_DIR && $NPM_PATH run cron >> $LOG_FILE 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "supasync.*cron"; then
    echo "⚠️  A cron job for this project already exists!"
    echo ""
    echo "Current cron jobs:"
    crontab -l | grep -E "(supasync|cron-ping)" || echo "  (none found)"
    echo ""
    read -p "Do you want to replace it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove old entry
    crontab -l 2>/dev/null | grep -v "supasync.*cron" | grep -v "cron-ping" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron job added successfully!"
echo ""
echo "To verify, run: crontab -l"
echo "To view logs, run: tail -f $LOG_FILE"
echo ""
echo "To remove the cron job later, run:"
echo "  crontab -l | grep -v 'supasync.*cron' | crontab -"

