import streamlit as st
from pathlib import Path

# ----------------------------------------------------------------------
# Backend imports
# ----------------------------------------------------------------------
from src.retrieval import retrieve_documents, ingest_and_store
from src.generation import generate_answer

# Re‑use citation helper from the original app (fallback if import fails)
try:
    from app import get_source_citations
except Exception:  # pragma: no cover
    def get_source_citations(documents):
        """Return a list of unique ``{source, page}`` dicts.

        This is a lightweight copy of the helper in ``app.py`` and is used only
        when that import fails (e.g., during UI‑only runs).
        """
        sources = []
        for doc in documents:
            src = Path(doc.metadata.get("source", "Unknown")).name
            pg = doc.metadata.get("page")
            citation = {"source": src, "page": pg + 1 if pg is not None else "Unknown"}
            if citation not in sources:
                sources.append(citation)
        return sources

# ----------------------------------------------------------------------
# 🎨 Colour palette – supplied by the user
# ----------------------------------------------------------------------
PRIMARY = "#333D79"   # deep blue
ACCENT  = "#FAEBEF"   # soft pink‑ish
GRADIENT = f"linear-gradient(180deg, {ACCENT} 0%, {PRIMARY} 100%)"

# ----------------------------------------------------------------------
# Inject custom CSS – we target stable Streamlit selectors (body, .stSidebar)
# ----------------------------------------------------------------------
st.markdown(
    f"""
    <style>
    /* Page background */
    body {{
        background: {GRADIENT} !important;
        background-attachment: fixed;
        color: #ffffff;
    }}
    /* Ensure the main container is transparent so the gradient shows */
    .stApp {{
        background: transparent !important;
    }}
    /* Sidebar */
    .stSidebar {{
        background: {GRADIENT} !important;
        color: #ffffff;
    }}
    .stSidebar a {{
        color: {ACCENT} !important;
    }}
    /* Header title */
    .title-header {{
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-weight: 700;
        color: {ACCENT};
        text-align: center;
        margin-top: 0.5rem;
        margin-bottom: 1rem;
    }}
    /* Upload button – Streamlit wraps it in a div with class css‑1cpxqw2 */
    .css-1cpxqw2 button {{
        background-color: {PRIMARY} !important;
        color: #ffffff !important;
        border: none;
        border-radius: 8px;
        padding: 0.4rem 0.8rem;
    }}
    .css-1cpxqw2 button:hover {{
        background-color: #2a3365 !important;
    }}
    /* Chat bubbles – we render our own divs */
    .msg-user, .msg-assistant {{
        display: inline-block;
        padding: 0.8rem 1rem;
        border-radius: 12px;
        margin: 0.4rem 0;
        max-width: 80%;
    }}
    .msg-user {{
        background-color: {ACCENT};
        color: #1e1e1e;
        border-radius: 12px 0 12px 12px;
    }}
    .msg-assistant {{
        background-color: #f0f2f5;
        color: #1e1e1e;
        border-radius: 0 12px 12px 12px;
    }}
    /* Footer caption */
    .footer-caption {{
        color: #e8e8e8;
        font-size: 0.85rem;
        margin-top: 2rem;
        text-align: center;
    }}
    </style>
    """,
    unsafe_allow_html=True,
)

# ----------------------------------------------------------------------
# Session state – persists across reruns
# ----------------------------------------------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []  # each entry: {"role", "content"}
if "uploaded_files" not in st.session_state:
    st.session_state.uploaded_files = []

# ----------------------------------------------------------------------
# Page configuration & title
# ----------------------------------------------------------------------
st.set_page_config(page_title="KnowlyAI Chat", page_icon="🤖", layout="centered")
st.markdown('<h1 class="title-header">🤖 KnowlyAI – Document Retrieval & Conversational QA</h1>', unsafe_allow_html=True)

# ----------------------------------------------------------------------
# Sidebar – PDF uploader
# ----------------------------------------------------------------------
with st.sidebar:
    st.header("📄 Upload PDFs")
    uploaded = st.file_uploader(
        "Drop PDF files here",
        type=["pdf"],
        accept_multiple_files=True,
        help="Your PDFs are indexed locally and used for answering questions.",
    )
    if uploaded:
        data_dir = Path("data")
        data_dir.mkdir(parents=True, exist_ok=True)
        for file in uploaded:
            if file.name in st.session_state.uploaded_files:
                st.success(f"✅ Already indexed: **{file.name}**")
                continue
            save_path = data_dir / file.name
            with open(save_path, "wb") as f:
                f.write(file.getbuffer())
            with st.spinner(f"Ingesting **{file.name}** …"):
                ingest_and_store(str(save_path))
            st.success(f"✅ Indexed: **{file.name}**")
            st.session_state.uploaded_files.append(file.name)

# ----------------------------------------------------------------------
# Helper to render a chat bubble
# ----------------------------------------------------------------------
def render_message(role: str, content: str):
    if role == "user":
        st.markdown(f"<div class='msg-user'>{content}</div>", unsafe_allow_html=True)
    else:
        st.markdown(f"<div class='msg-assistant'>{content}</div>", unsafe_allow_html=True)

# Show conversation history
for msg in st.session_state.messages:
    render_message(msg["role"], msg["content"])

# ----------------------------------------------------------------------
# Chat input box
# ----------------------------------------------------------------------
if prompt := st.chat_input("Ask a question about the uploaded documents…"):
    # ---- User message -------------------------------------------------
    st.session_state.messages.append({"role": "user", "content": prompt})
    render_message("user", prompt)

    # ---- Retrieval ----------------------------------------------------
    with st.spinner("🔎 Retrieving relevant passages …"):
        docs = retrieve_documents(prompt, k=4)
    citations = get_source_citations(docs)
    context = "\n\n".join(doc.page_content for doc in docs)

    # ---- Generation ---------------------------------------------------
    with st.spinner("🤖 Generating answer …"):
        answer = generate_answer(prompt, context)

    # Format citations nicely
    citation_md = "\n".join(
        f"- **{c['source']}** – page {c['page']}" for c in citations
    )
    full_resp = f"{answer}\n\n**Sources**\n{citation_md}"

    # ---- Assistant reply -----------------------------------------------
    st.session_state.messages.append({"role": "assistant", "content": full_resp})
    render_message("assistant", full_resp)

# ----------------------------------------------------------------------
# Footer caption
# ----------------------------------------------------------------------
st.caption(
    """
    <span class='footer-caption'>
    All processing runs locally – no API keys are hard‑coded. Uses Gemini embeddings (ChromaDB) for retrieval + Gemini Flash for answer generation.
    </span>
    """,
    unsafe_allow_html=True,
)
