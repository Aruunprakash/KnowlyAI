# streamlit_app.py
# --------------------------------------------------------------
#  KnowlyAI – modern, sleek Streamlit UI (styled after the reference)
# --------------------------------------------------------------

import streamlit as st
from pathlib import Path

# ------------------------------------------------------------------
#  Backend imports (unchanged)
# ------------------------------------------------------------------
from src.retrieval import retrieve_documents, ingest_and_store
from src.generation import generate_answer

# Citation helper – fall back to a local copy if the import fails
try:
    from app import get_source_citations                     # pragma: no cover
except Exception:                                          # pragma: no cover
    def get_source_citations(docs):
        """Return a list of unique {source, page} dicts."""
        out = []
        for d in docs:
            src = Path(d.metadata.get("source", "Unknown")).name
            pg = d.metadata.get("page")
            citation = {"source": src,
                        "page": pg + 1 if pg is not None else "Unknown"}
            if citation not in out:
                out.append(citation)
        return out


# ------------------------------------------------------------------
#  🎨  Colour palette (your two colours)
# ------------------------------------------------------------------
PRIMARY = "#333D79"   # deep‑blue – used for header, buttons, accents
ACCENT  = "#FAEBEF"   # soft‑pink – background gradient start, user bubbles
GRADIENT = f"linear-gradient(180deg, {ACCENT} 0%, {PRIMARY} 100%)"

# ------------------------------------------------------------------
#  Inject robust CSS (targets current Streamlit selectors)
# ------------------------------------------------------------------
st.markdown(
    f"""
    <style>
    /* ---- Page & Sidebar background (gradient) ---- */
    html, body, .stApp {{
        background: {GRADIENT} !important;
        background-attachment: fixed;
        color: #ffffff;
    }}
    [data-testid="stSidebar"] {{
        background: {GRADIENT} !important;
        color: #ffffff;
    }}
    [data-testid="stSidebar"] a {{
        color: {ACCENT} !important;
    }}

    /* ---- Top navigation bar ---- */
    .top-nav {{
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.8rem 1.2rem;
        background: rgba(0,0,0,0.15);
        border-radius: 12px;
        margin-bottom: 1.5rem;
        color: #fff;
    }}
    .top-nav h2 {{
        margin: 0;
        font-size: 1.6rem;
        font-weight: 600;
        color: {ACCENT};
    }}
    .top-nav a {{
        color: #fff;
        opacity: 0.85;
        text-decoration: none;
        font-size: 0.95rem;
    }}
    .top-nav a:hover {{
        opacity: 1;
    }}

    /* ---- Upload card (inside sidebar) ---- */
    .upload-card {{
        background: rgba(255,255,255,0.12);
        border-radius: 12px;
        padding: 1rem;
        margin-top: 1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }}

    /* ---- Chat bubbles ---- */
    .msg-user, .msg-assistant {{
        display: inline-block;
        padding: 0.9rem 1.2rem;
        border-radius: 12px;
        margin: 0.4rem 0;
        max-width: 85%;
        line-height: 1.45;
        font-size: 1rem;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }}
    .msg-user {{
        background: {ACCENT};
        color: #1e1e1e;
        border-radius: 12px 0 12px 12px;
        align-self: flex-end;
    }}
    .msg-assistant {{
        background: #f5f5f5;
        color: #1e1e1e;
        border-radius: 0 12px 12px 12px;
        align-self: flex-start;
    }}

    /* ---- Wrapper so bubbles stack vertically ---- */
    .chat-wrapper {{
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }}

    /* ---- Footer caption ---- */
    .footer-caption {{
        color: #e8e8e8;
        font-size: 0.85rem;
        text-align: center;
        margin-top: 2rem;
    }}
    </style>
    """,
    unsafe_allow_html=True,
)

# ------------------------------------------------------------------
#  Session state (persistent across reruns)
# ------------------------------------------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []          # [{"role": "user"/"assistant", "content": str}, …]
if "uploaded_files" not in st.session_state:
    st.session_state.uploaded_files = []   # keep track of which PDFs we have already indexed

# ------------------------------------------------------------------
#  Page configuration & top navigation
# ------------------------------------------------------------------
st.set_page_config(page_title="KnowlyAI Chat", page_icon="🤖", layout="wide")

st.markdown(
    """
    <div class="top-nav">
        <h2>🤖 KnowlyAI</h2>
        <a href="https://github.com/arunmp/KnowyAI" target="_blank">About / Help</a>
    </div>
    """,
    unsafe_allow_html=True,
)

# ------------------------------------------------------------------
#  Sidebar – PDF uploader (styled as a card)
# ------------------------------------------------------------------
with st.sidebar:
    st.markdown("<div class='upload-card'>", unsafe_allow_html=True)
    st.header("📄 Upload PDFs")
    uploaded = st.file_uploader(
        "Drop PDF files here",
        type=["pdf"],
        accept_multiple_files=True,
        help="Your PDFs are indexed locally and later used for answering questions.",
    )
    if uploaded:
        data_dir = Path("data")
        data_dir.mkdir(parents=True, exist_ok=True)

        for f in uploaded:
            # Avoid double‑indexing the same file name
            if f.name in st.session_state.uploaded_files:
                st.success(f"✅ Already indexed: **{f.name}**")
                continue

            # Save PDF into the repo’s data folder
            out_path = data_dir / f.name
            with open(out_path, "wb") as fp:
                fp.write(f.getbuffer())

            # Ingest – adds chunks to the persistent Chroma store
            with st.spinner(f"Ingesting **{f.name}** …"):
                ingest_and_store(str(out_path))

            st.success(f"✅ Indexed: **{f.name}**")
            st.session_state.uploaded_files.append(f.name)
    st.markdown("</div>", unsafe_allow_html=True)

# ------------------------------------------------------------------
#  Helper – render a single chat bubble
# ------------------------------------------------------------------
def render_message(role: str, content: str):
    css = "msg-user" if role == "user" else "msg-assistant"
    st.markdown(f"<div class='{css}'>{content}</div>", unsafe_allow_html=True)

# ------------------------------------------------------------------
#  Show conversation history (wrapped in a flex container)
# ------------------------------------------------------------------
st.markdown("<div class='chat-wrapper'>", unsafe_allow_html=True)
for msg in st.session_state.messages:
    render_message(msg["role"], msg["content"])
st.markdown("</div>", unsafe_allow_html=True)

# ------------------------------------------------------------------
#  Chat input box
# ------------------------------------------------------------------
if prompt := st.chat_input("Ask a question about the uploaded documents…"):
    # ---- USER message -------------------------------------------------
    st.session_state.messages.append({"role": "user", "content": prompt})
    render_message("user", prompt)

    # ---- Retrieval ----------------------------------------------------
    with st.spinner("🔎 Retrieving relevant passages…"):
        docs = retrieve_documents(prompt, k=4)

    # Source citations (filename + page)
    citations = get_source_citations(docs)

    # Build the context string for the LLM
    context = "\n\n".join(doc.page_content for doc in docs)

    # ---- Generation ---------------------------------------------------
    with st.spinner("🤖 Generating answer…"):
        answer = generate_answer(prompt, context)

    # Format citations nicely
    citation_md = "\n".join(
        f"- **{c['source']}** – page {c['page']}" for c in citations
    )
    full_reply = f"{answer}\n\n**Sources**\n{citation_md}"

    # ---- Assistant reply -----------------------------------------------
    st.session_state.messages.append({"role": "assistant", "content": full_reply})
    render_message("assistant", full_reply)

# ------------------------------------------------------------------
#  Footer
# ------------------------------------------------------------------
st.caption(
    """
    <span class='footer-caption'>
    All processing runs locally – no API keys are hard‑coded. 
    Uses Gemini embeddings (ChromaDB) for retrieval + Gemini Flash for answer generation.
    </span>
    """,
    unsafe_allow_html=True,
)