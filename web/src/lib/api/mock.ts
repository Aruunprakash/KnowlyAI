import { createId } from '@/lib/utils/id'
import { ApiError } from './errors'
import type { AnswerEvent, AskRequest, HealthReport, SourceDocument } from './types'
import type { KnowlyApi, UploadHandle } from './index'

/**
 * Fixture backend for developing the UI with no Python process running.
 * Enabled with VITE_MOCK_API=true. It fakes latency and token-by-token
 * streaming so loading, empty, and error states can be exercised honestly.
 */

const SEED: SourceDocument[] = [
  {
    id: 'doc_ml_primer',
    name: 'machine_learning.pdf',
    pages: 48,
    chunks: 214,
    sizeBytes: 1_842_000,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 54).toISOString(),
    status: 'ready',
    error: null,
  },
  {
    id: 'doc_ml_new',
    name: 'ML-new.pdf',
    pages: 162,
    chunks: 903,
    sizeBytes: 9_053_904,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 29).toISOString(),
    status: 'ready',
    error: null,
  },
]

const ANSWER = `The central objective of machine learning is to build models that **generalise** —
to infer a rule from a finite sample of data and have that rule hold on inputs the model
has never seen.

Three ideas carry most of the weight:

1. **A hypothesis space.** The family of functions the learner is allowed to consider.
2. **A loss function.** A scalar measure of how wrong a given prediction is.
3. **An optimisation procedure.** The search that finds parameters minimising expected loss.

Performance is therefore measured on held-out data rather than on the training set, since a
model with enough capacity can memorise its training sample without learning anything
transferable.`

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createMockApi(): KnowlyApi {
  let documents = [...SEED]

  return {
    async getHealth(): Promise<HealthReport> {
      await sleep(180)
      return {
        status: 'ok',
        documents: documents.length,
        chunks: documents.reduce((sum, document) => sum + document.chunks, 0),
        chatModel: 'gemini-flash (mock)',
        embeddingModel: 'gemini-embedding-001 (mock)',
        detail: null,
      }
    },

    async listDocuments(): Promise<SourceDocument[]> {
      await sleep(260)
      return [...documents]
    },

    async deleteDocument(id: string): Promise<void> {
      await sleep(220)
      documents = documents.filter((document) => document.id !== id)
    },

    documentFileUrl(): string {
      return 'about:blank'
    },

    uploadDocument(file: File, onProgress?: (fraction: number) => void): UploadHandle {
      let cancelled = false

      const result = (async () => {
        for (let step = 1; step <= 10; step += 1) {
          await sleep(120)
          if (cancelled) throw new ApiError('Upload cancelled.', { kind: 'aborted' })
          onProgress?.(step / 10)
        }
        await sleep(700)
        if (cancelled) throw new ApiError('Upload cancelled.', { kind: 'aborted' })

        const document: SourceDocument = {
          id: createId('doc'),
          name: file.name,
          pages: 12 + Math.floor(Math.random() * 90),
          chunks: 60 + Math.floor(Math.random() * 400),
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
          status: 'ready',
          error: null,
        }
        documents = [document, ...documents]
        return document
      })()

      return {
        result,
        cancel: () => {
          cancelled = true
        },
      }
    },

    async *askQuestion(payload: AskRequest, signal: AbortSignal): AsyncGenerator<AnswerEvent> {
      const started = performance.now()
      await sleep(520)
      if (signal.aborted) return

      const primary = documents[0]
      const secondary = documents[1] ?? documents[0]

      yield {
        type: 'citations',
        citations: [
          {
            id: 'c1',
            index: 1,
            documentId: primary?.id ?? null,
            source: primary?.name ?? 'machine_learning.pdf',
            page: 7,
            snippet:
              'The goal of a learning algorithm is to produce a hypothesis that performs well on previously unseen examples drawn from the same distribution as the training data.',
            score: 0.84,
          },
          {
            id: 'c2',
            index: 2,
            documentId: primary?.id ?? null,
            source: primary?.name ?? 'machine_learning.pdf',
            page: 12,
            snippet:
              'Empirical risk minimisation selects the hypothesis with the lowest average loss over the training sample; generalisation bounds relate that quantity to expected risk.',
            score: 0.79,
          },
          {
            id: 'c3',
            index: 3,
            documentId: secondary?.id ?? null,
            source: secondary?.name ?? 'ML-new.pdf',
            page: 41,
            snippet:
              'A model with sufficient capacity can interpolate its training set exactly while failing on held-out data, the canonical symptom of overfitting.',
            score: 0.71,
          },
        ],
      }

      // Deliberately fails on request so the error path stays reachable in dev.
      if (/\bfail\b/i.test(payload.question)) {
        await sleep(400)
        yield { type: 'error', message: 'Mock failure requested by the question.', code: 'mock' }
        return
      }

      for (const token of ANSWER.match(/\S+\s*/g) ?? []) {
        if (signal.aborted) return
        await sleep(14 + Math.random() * 22)
        yield { type: 'delta', text: token }
      }

      yield { type: 'done', elapsedMs: performance.now() - started }
    },
  }
}
