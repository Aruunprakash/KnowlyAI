
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

load_dotenv(override=True)


def get_embedding_model():

    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001"
    )

    return embeddings


if __name__ == "__main__":

    embeddings = get_embedding_model()

    text = "Machine learning enables computers to learn from data."

    vector = embeddings.embed_query(text)

    print("Embedding generated successfully!")
    print("Vector dimensions:", len(vector))
    print("First 10 values:", vector[:10])
