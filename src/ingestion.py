
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader


def load_pdf(file_path):

    # Initialize PDF loader
    loader = PyPDFLoader(file_path)

    # Extract PDF content
    documents = loader.load()

    return documents


def split_documents(documents):

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len
    )

    chunks = text_splitter.split_documents(documents)

    return chunks

if __name__ == "__main__":

    pdf_path = "data/machine_learning.pdf"

    documents = load_pdf(pdf_path)

    print("Total pages:", len(documents))

    chunks = split_documents(documents)

    print("Total chunks:", len(chunks))

    for i, chunk in enumerate(chunks):

        print(f"\n--- Chunk {i + 1} ---")

        print(chunk.page_content)

        print("Metadata:", chunk.metadata)