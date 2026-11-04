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

# ---------------------------------------------------------------------------
# New helper: ingest a PDF and add its chunks to the persistent Chroma store.
# ---------------------------------------------------------------------------
def ingest_and_store(file_path: str):
    """
    Load a PDF, split it into chunks, and add those chunks to the existing
    persistent Chroma vector store (or create the store if it does not exist yet).

    Parameters
    ----------
    file_path: str
        Absolute or relative path to the PDF to be ingested.
    """
    # Step 1 – read and chunk the document
    documents = load_pdf(file_path)
    chunks = split_documents(documents)

    # Step 2 – obtain (or create) the persistent vector store
    embedding_model = get_embedding_model()
    vector_store = Chroma(
        collection_name="knowlyai_documents",
        persist_directory="chroma_db",
        embedding_function=embedding_model,
    )

    # Step 3 – add new chunks; ``add_documents`` will deduplicate internally.
    if chunks:
        vector_store.add_documents(chunks)
        # Ensure the on‑disk DB is written out
        vector_store.persist()
        print(f"✅ Ingested {len(chunks)} chunks from {file_path} and stored them.")
    else:
        print(f"⚠️ No chunks were created from {file_path}.")

    return vector_store

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
