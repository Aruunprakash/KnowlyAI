
from langchain_chroma import Chroma

from src.embeddings import get_embedding_model
from src.ingestion import load_pdf, split_documents


# Step 1: Create and store the vector database
def create_vector_store():
    documents = load_pdf("data/machine_learning.pdf")
    chunks = split_documents(documents)

    embedding_model = get_embedding_model()

    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embedding_model,
        collection_name="knowlyai_documents",
        persist_directory="chroma_db"
    )

    print("Documents successfully stored in ChromaDB!")
    print("Total chunks stored:", len(chunks))

    return vector_store


# Step 2: Connect to the existing vector database
def get_vector_store():
    embedding_model = get_embedding_model()

    vector_store = Chroma(
        collection_name="knowlyai_documents",
        persist_directory="chroma_db",
        embedding_function=embedding_model
    )

    return vector_store


# Step 3: Retrieve relevant document chunks
def retrieve_documents(query, k=3):
    vector_store = get_vector_store()

    results = vector_store.similarity_search(
        query,
        k=k
    )

    return results


# Step 4: Test retrieval
if __name__ == "__main__":

    question = "What is the main objective of machine learning?"

    results = retrieve_documents(question)

    print("\nQuestion:", question)
    print("\nRetrieved Documents:")

    for i, document in enumerate(results):
        print(f"\n--- Result {i + 1} ---")
        print(document.page_content)
        print("Source:", document.metadata.get("source"))
        print("Page:", document.metadata.get("page"))
