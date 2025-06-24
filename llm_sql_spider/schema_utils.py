import sqlite3

def get_actual_schema(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]

    schema = {
        'table_names': tables,
        'column_names': [],
        'column_types': []
    }

    for table in tables:
        cursor.execute(f"PRAGMA table_info({table})")
        for col in cursor.fetchall():
            schema['column_names'].append([tables.index(table), col[1]])
            schema['column_types'].append(col[2])

    conn.close()
    return schema
