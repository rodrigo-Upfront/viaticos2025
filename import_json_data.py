#!/usr/bin/env python3
"""
Import JSON data files into production database
"""

import json
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

# Database connection for production
DB_CONFIG = {
    'host': 'database',
    'database': 'viaticos_db',
    'user': 'postgres',
    'password': 'postgres'
}

def import_json_to_table(cursor, table_name, filename):
    """Import JSON file data into database table"""
    print(f"📥 Importing {table_name}...")
    
    if not os.path.exists(filename):
        print(f"   ⚠️  File {filename} not found, skipping...")
        return 0
    
    with open(filename, 'r') as f:
        data = json.load(f)
    
    if not data:
        print(f"   ⚠️  No data in {filename}, skipping...")
        return 0
    
    # Clear existing data
    cursor.execute(f"DELETE FROM {table_name}")
    print(f"   🗑️  Cleared existing {table_name} data")
    
    # Insert new data
    inserted = 0
    for record in data:
        # Convert datetime strings back to datetime objects
        for key, value in record.items():
            if key.endswith('_at') and isinstance(value, str):
                try:
                    record[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    pass
        
        # Build INSERT query
        columns = list(record.keys())
        placeholders = ', '.join(['%s'] * len(columns))
        values = [record[col] for col in columns]
        
        query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"
        
        try:
            cursor.execute(query, values)
            inserted += 1
        except Exception as e:
            print(f"   ❌ Error inserting record: {e}")
            print(f"      Record: {record}")
    
    print(f"   ✅ Imported {inserted}/{len(data)} records")
    return inserted

def main():
    print("🚀 Importing JSON data to production database...")
    
    try:
        # Connect to production database
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Import tables in dependency order
        tables = [
            ('countries', 'data_exports/countries.json'),
            ('currencies', 'data_exports/currencies.json'),
            ('expense_categories', 'data_exports/expense_categories.json'),
            ('factura_suppliers', 'data_exports/factura_suppliers.json'),
            ('users', 'data_exports/users.json')
        ]
        
        total_records = 0
        for table_name, filename in tables:
            count = import_json_to_table(cursor, table_name, filename)
            total_records += count
        
        # Commit all changes
        conn.commit()
        print(f"\n🎉 Import complete!")
        print(f"📊 Total records imported: {total_records}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if 'conn' in locals():
            conn.rollback()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
