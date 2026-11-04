
from src.retrieval import retrieve_documents
from app import get_source_citations

question = "What is the main objective of machine learning?"

print("Searching ChromaDB...", flush=True)

documents = retrieve_documents(question)

print("Retrieval successful!", flush=True)

sources = get_source_citations(documents)

print("\nRetrieved Sources:")

for source in sources:
    print(f"{source['source']} - Page {source['page']}")
