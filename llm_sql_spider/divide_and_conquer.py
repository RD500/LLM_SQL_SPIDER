import ollama

def divide_and_conquer(question, schema):
    schema_info = "Database Schema:\n"

    for table_id, table in enumerate(schema['table_names']):
        schema_info += f"Table: {table}\n"
        for col_index, column in enumerate(schema['column_names']):
            if column[0] == table_id:
                col_name = column[1]
                col_type = schema['column_types'][schema['column_names'].index(column)]
                schema_info += f"    - {col_name} ({col_type})\n"
        schema_info += "\n"

    prompt = f"""
{schema_info}
Given the above database schema, generate a SQL query to answer:
{question}

RULES:
- DO NOT INVENT columns or tables.
- Ensure the query is valid for SQLite.
- Use JOINs if needed.
- Do NOT wrap the response in triple backticks or any markdown.
"""

    response = ollama.chat(
        model='mistral',
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return response['message']['content'].strip()
