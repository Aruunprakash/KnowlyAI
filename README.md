# KnowlyAI

Ask questions about your PDFs and get answers that cite the page they came from.

A retrieval-augmented pipeline (PyPDF → LangChain → Chroma → Gemini) behind an
HTTP API and a React front end. Every answer is built only from retrieved
passages, each inline `[1]` marker opens the exact chunk the model was given,
and the UI says so when the documents do not cover a question.

```
src/     the pipeline: ingestion, embeddings, retrieval, generation
api/     FastAPI service — transport, upload storage, SSE streaming
web/     React + TypeScript front end
app.py   the original command-line entry point
```

## Running it

You need Python 3.12 and Node 20+, and a Google AI Studio API key.

**1. Configure the key**

```bash
cp .env.example .env
```

Put your key in `GOOGLE_API_KEY`.

**2. Start the API**

```bash
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload
```

It listens on `http://127.0.0.1:8000`. Interactive docs are at `/docs`.

**3. Start the front end**

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api` to port 8000, so
there is no CORS setup and no absolute URLs in the client.

### The landing page, console and app, together

`scrollcraft/builds/knowlyai-redacted/` holds all three pages in one folder,
in one brutalist design (paper, plum `#561530`, amber `#F5AD18`, berry
`#9E1C60`, wine `#811844`):

```
/               landing page      "Ask your documents" opens the app
/console.html   interactive demo  shows the evidence threshold refusing
/app/           the app           upload PDFs, conversations, cited answers
```

The app is built into that folder from `web/`:

```bash
cd web && npm run build:set
```

Serve the folder on port 4512 (already allowed by the API's CORS default):

```bash
python -m http.server 4512 --directory scrollcraft/builds/knowlyai-redacted
```

Open `http://localhost:4512`. All three call the API at `127.0.0.1:8000`
(set in `web/.env.set` for the app, and in a `knowly-api` meta tag for the
other two); add `?api=http://host:port` to any page to point it elsewhere.
Without an API the landing page and console run on a labelled sample index,
and the app shows an empty library. None of them display backend status.
The earlier dark build is kept in `scrollcraft/builds/knowlyai-grounded/`.

### Building for production

```bash
cd web && npm run build
```

`api/main.py` serves `web/dist` automatically when it exists, so the built UI
and the API run from a single `uvicorn api.main:app` process.

### Working on the UI without the backend

```bash
cd web
echo "VITE_MOCK_API=true" > .env.local
npm run dev
```

This swaps in `src/lib/api/mock.ts`: fixture documents, simulated upload
progress, and token-by-token streaming, so loading, empty, and error states are
all reachable with no Python process and no API key. Asking a question
containing the word "fail" triggers the error path on purpose.

## The API

| Method   | Path                          | Purpose                                         |
| -------- | ----------------------------- | ----------------------------------------------- |
| `GET`    | `/api/health`                 | Connection state, model names, index size        |
| `GET`    | `/api/documents`              | Indexed documents                                |
| `POST`   | `/api/documents`              | Upload and index a PDF (multipart `file`)        |
| `DELETE` | `/api/documents/{id}`         | Remove a document and its vectors                |
| `GET`    | `/api/documents/{id}/file`    | The original PDF, inline, for `#page=` links     |
| `POST`   | `/api/chat`                   | Ask a question; streams the answer               |

`POST /api/chat` returns `text/event-stream` in a fixed order:

```
event: citations   {"citations": [{ "index": 1, "source": "...", "page": 7, "snippet": "..." }]}
event: delta       {"text": "Machine learning "}
event: done        {"elapsedMs": 1532}
```

`event: error` may replace the tail at any point. Citations are always sent
before the first `delta`, so the UI can show what an answer will be grounded in
while it is still being written. The model is instructed to cite excerpt `n` as
`[n]`, and the front end turns those markers into links to the passage.

The TypeScript mirror of these shapes is `web/src/lib/api/types.ts`; the
Pydantic originals are `api/schemas.py`. Change them together.

## Tests

```bash
pytest api/tests          # API contract: status codes, JSON shapes, SSE framing
cd web && npm run typecheck && npm run lint
```

The API tests stub retrieval and generation, so they need neither an API key
nor a populated vector store.

## Notes

- Scanned PDFs with no text layer are rejected at upload rather than indexed
  as empty — they need OCR first.
- `api/` never modifies `src/`; it imports the same functions the CLI uses and
  adds only what a web client needs (cached handles, per-document metadata,
  numbered excerpts, streaming).
- `src/retrieval.py::ingest_and_store` is the CLI's older ingest helper and
  calls `vector_store.persist()`, which newer `langchain-chroma` releases have
  removed. The API does not use it; `api/rag.py::ingest_pdf` replaces it.
