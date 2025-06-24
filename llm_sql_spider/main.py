import os
import sqlite3
from utils import load_spider_dataset, load_spider_test_dataset, query_similarity
from schema_utils import get_actual_schema
from divide_and_conquer import divide_and_conquer

def test_on_spider(spider_path, db_root_path, spider_test_data_path):
    try:
        spider_data = load_spider_dataset(spider_path)
        db_id = spider_data[0]['db_id']
        db_path = os.path.join(db_root_path, db_id, db_id + ".sqlite")

        actual_schema = get_actual_schema(db_path)
        spider_test_data = load_spider_test_dataset(spider_test_data_path)
        dept_management_data = [item for item in spider_test_data if item['db_id'] == 'department_management']

        test_questions = [item['question'] for item in dept_management_data]
        test_actual_queries = [item['query'] for item in dept_management_data]

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        results = []

        for i, (question, actual_query) in enumerate(zip(test_questions, test_actual_queries)):
            if i >= 10: break

            print(f"\nQuestion {i+1}: {question}")
            print(f"Actual SQL query: {actual_query}")

            generated_query = divide_and_conquer(question, actual_schema)
            print(f"Generated SQL query: {generated_query}")

            similarity = query_similarity(generated_query, actual_query)
            print(f"Query similarity: {similarity:.2%}")

            try:
                cursor.execute(generated_query)
                generated_result = cursor.fetchall()

                cursor.execute(actual_query)
                actual_result = cursor.fetchall()

                results_match = (generated_result == actual_result)

                results.append({
                    'question': question,
                    'generated_query': generated_query,
                    'actual_query': actual_query,
                    'results_match': results_match,
                    'query_similarity': similarity,
                    'generated_result': generated_result,
                    'actual_result': actual_result
                })

                print(f"Results match: {results_match}")
                print(f"Generated result: {generated_result}")
                print(f"Actual result: {actual_result}")

            except sqlite3.Error as e:
                print(f"Error executing SQL: {e}")
                results.append({
                    'question': question,
                    'generated_query': generated_query,
                    'actual_query': actual_query,
                    'results_match': False,
                    'query_similarity': similarity,
                    'error': str(e)
                })

        total_queries = len(results)
        correct_queries = sum(1 for r in results if r['results_match'])
        accuracy = correct_queries / total_queries if total_queries > 0 else 0
        avg_similarity = sum(r['query_similarity'] for r in results) / total_queries

        print(f"\nOverall Results:")
        print(f"Total Queries: {total_queries}")
        print(f"Correct Queries: {correct_queries}")
        print(f"Accuracy: {accuracy:.2%}")
        print(f"Average Query Similarity: {avg_similarity:.2%}")

        error_types = {}
        for r in results:
            if not r['results_match']:
                error_type = r.get('error', 'Incorrect Result').split(':')[0]
                error_types[error_type] = error_types.get(error_type, 0) + 1

        print("\nError Types:")
        for error_type, count in error_types.items():
            print(f"{error_type}: {count} ({count/total_queries:.2%})")

        best_query = max(results, key=lambda r: r['query_similarity'])
        worst_query = min(results, key=lambda r: r['query_similarity'])

        print("\nBest Performing Query:")
        print(f"Question: {best_query['question']}")
        print(f"Generated Query: {best_query['generated_query']}")
        print(f"Actual Query: {best_query['actual_query']}")
        print(f"Similarity: {best_query['query_similarity']:.2%}")

        print("\nWorst Performing Query:")
        print(f"Question: {worst_query['question']}")
        print(f"Generated Query: {worst_query['generated_query']}")
        print(f"Actual Query: {worst_query['actual_query']}")
        print(f"Similarity: {worst_query['query_similarity']:.2%}")

    except Exception as e:
        print(f"An error occurred in test_on_spider: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if 'conn' in locals():
            conn.close()

    return results

if __name__ == "__main__":
    test_on_spider(
        spider_path="data/train_spider.json",
        db_root_path="spider_data/database",
        spider_test_data_path="data/train_spider.json"
    )
