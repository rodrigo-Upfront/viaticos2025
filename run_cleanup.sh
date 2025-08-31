#!/bin/bash

# =========================================
# VIATICOS 2025 - DATA CLEANUP SCRIPT
# =========================================

echo "🧹 Starting data cleanup..."
echo "⚠️  This will delete ALL test data!"
echo ""

# Confirm before proceeding
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 1
fi

echo ""
echo "🗑️  Running cleanup script..."

# Run the SQL cleanup script
docker exec -i viaticos_db psql -U postgres -d viaticos < cleanup_test_data.sql

echo ""
echo "✅ Cleanup completed!"
echo "🚀 System is ready for fresh testing."
