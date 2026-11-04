
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv(override=True)


def get_llm():
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.8-flash",
        temperature=0,
        timeout=30,
        max_retries=0
    )

    return llm


def generate_answer(question, context):

    prompt = ChatPromptTemplate.from_template("""
    You are KnowlyAI, an intelligent document question-answering assistant.

    Answer the user's question using only the context provided below.

    If the answer is not available in the context,
    clearly say that the information is not available
    in the uploaded document.

    Context:
    {context}

    Question:
    {question}

    Answer:
    """)

    llm = get_llm()

    chain = prompt | llm

    response = chain.invoke({
        "context": context,
        "question": question
    })

    return response.content

if __name__ == "__main__":
    print("Connecting to Gemini...", flush=True)

    llm = get_llm()

    print("Sending test request...", flush=True)

    response = llm.invoke(
        "Explain machine learning in two sentences."
    )

    print("\nGemini response:")
    print(response.content)