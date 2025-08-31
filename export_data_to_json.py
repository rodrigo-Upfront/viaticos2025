#!/usr/bin/env python3
"""
Export local database data to JSON files for production import
"""

import json
import os
from datetime import datetime
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 5433,  # Local Docker port
    'database': 'viaticos',
    'user': 'postgres',
    'password': 'postgres'
}

def decimal_serializer(obj):
    """JSON serializer for Decimal objects"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def export_table_to_json(cursor, table_name, filename):
    """Export a table to JSON file"""
    print(f"📄 Exporting {table_name}...")
    
    cursor.execute(f"SELECT * FROM {table_name} ORDER BY id")
    rows = cursor.fetchall()
    
    # Convert to list of dictionaries
    data = [dict(row) for row in rows]
    
    # Write to JSON file
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2, default=decimal_serializer)
    
    print(f"   ✅ Exported {len(data)} records to {filename}")
    return len(data)

def main():
    print("🚀 Exporting local database to JSON files...")
    
    # Create exports directory
    os.makedirs('data_exports', exist_ok=True)
    
    try:
        # Connect to local database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Export master data tables in dependency order
        tables = [
            'countries',
            'currencies', 
            'categories',
            'suppliers',
            'users'
        ]
        
        total_records = 0
        for table in tables:
            filename = f"data_exports/{table}.json"
            count = export_table_to_json(cursor, table, filename)
            total_records += count
        
        cursor.close()
        conn.close()
        
        print(f"\n🎉 Export complete!")
        print(f"📊 Total records exported: {total_records}")
        print(f"📁 Files created in: data_exports/")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
