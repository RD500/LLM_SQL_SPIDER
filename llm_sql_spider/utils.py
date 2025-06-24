import json

try:
    import Levenshtein
except ImportError:
    print("Please install python-Levenshtein with: pip install python-Levenshtein")
    exit()

def load_spider_dataset(path):
    with open(path, 'r') as f:
        return json.load(f)

def load_spider_test_dataset(path):
    with open(path, 'r') as f:
        return json.load(f)

def query_similarity(query1, query2):
    return 1 - Levenshtein.distance(query1.lower(), query2.lower()) / max(len(query1), len(query2))
