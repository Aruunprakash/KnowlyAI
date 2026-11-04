
from pathlib import Path

from src.retrieval import retrieve_documents
from src.generation import generate_answer


def get_source_citations(documents):
    sources = []

    for document in documents:
        source = Path(
            document.metadata.get("source", "Unknown")
        ).name

        page = document.metadata.get("page")

        citation = {
            "source": source,
            "page": page + 1 if page is not None else "Unknown"
        }

        if citation not in sources:
            sources.append(citation)

    return sources


def ask_question(question):

    documents = retrieve_documents(question)

    sources = get_source_citations(documents)

    context = "\n\n".join(
        document.page_content for document in documents
    )

    answer = generate_answer(question, context)

    return answer, sources


if __name__ == "__main__":

    question = "What is the main objective of machine learning?"

    answer, sources = ask_question(question)

    print("\nQuestion:", question)
    print("\nKnowlyAI Answer:")
    print(answer)

    print("\nSource Citations:")

    for source in sources:
        print(f"{source['source']} - Page {source['page']}")
