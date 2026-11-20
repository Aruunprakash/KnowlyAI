import { Children, isValidElement, memo } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Citation } from '@/lib/api'
import { CitationMarker } from './CitationMarker'
import '@/styles/markdown.css'

const CITATION_PATTERN = /\[(\d{1,2})\]/g

/**
 * Private-use code point appended while an answer streams. It flows with the
 * text as a normal character, so the caret lands at the true end of the prose
 * instead of on a line of its own below the rendered block.
 */
const CARET_SENTINEL = ''

export interface MarkdownProps {
  children: string
  citations: Citation[]
  onCitationClick: (citation: Citation) => void
  streaming?: boolean
}

/**
 * Renders an answer, turning the `[n]` references the model is instructed to
 * emit into clickable markers tied to the retrieved chunk.
 *
 * The substitution runs over the text children of block elements rather than
 * over the raw source, so a `[1]` inside a fenced code block or a link target
 * is left alone.
 */
export const Markdown = memo(function Markdown({
  children,
  citations,
  onCitationClick,
  streaming = false,
}: MarkdownProps) {
  const byIndex = new Map(citations.map((citation) => [citation.index, citation]))

  const linkify = (nodes: ReactNode): ReactNode => {
    if (!byIndex.size && !streaming) return nodes

    return Children.map(nodes, (node) => {
      if (typeof node === 'number') return node
      if (typeof node !== 'string') {
        // Recurse through inline formatting (<strong>, <em>, …) but stop at code.
        if (isValidElement(node) && node.type !== 'code') {
          const element = node as React.ReactElement<{ children?: ReactNode }>
          if (element.props.children !== undefined) {
            return { ...element, props: { ...element.props, children: linkify(element.props.children) } }
          }
        }
        return node
      }

      const parts: ReactNode[] = []
      let cursor = 0
      CITATION_PATTERN.lastIndex = 0

      for (let match = CITATION_PATTERN.exec(node); match; match = CITATION_PATTERN.exec(node)) {
        const citation = byIndex.get(Number(match[1]))
        if (!citation) continue

        if (match.index > cursor) parts.push(withCaret(node.slice(cursor, match.index)))
        parts.push(
          <CitationMarker
            key={`${citation.id}-${match.index}`}
            citation={citation}
            onClick={onCitationClick}
          />,
        )
        cursor = match.index + match[0].length
      }

      if (!parts.length) return withCaret(node)
      if (cursor < node.length) parts.push(withCaret(node.slice(cursor)))
      return parts
    })
  }

  /** Swap the streaming sentinel for the blinking caret element. */
  const withCaret = (text: string): ReactNode => {
    const at = text.indexOf(CARET_SENTINEL)
    if (at === -1) return text
    return [
      text.slice(0, at),
      <span key="caret" className="md-caret" aria-hidden="true" />,
      text.slice(at + CARET_SENTINEL.length),
    ]
  }

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children: content }) => <p>{linkify(content)}</p>,
          li: ({ children: content }) => <li>{linkify(content)}</li>,
          td: ({ children: content }) => <td>{linkify(content)}</td>,
          th: ({ children: content }) => <th>{linkify(content)}</th>,
          h1: ({ children: content }) => <h1>{linkify(content)}</h1>,
          h2: ({ children: content }) => <h2>{linkify(content)}</h2>,
          h3: ({ children: content }) => <h3>{linkify(content)}</h3>,
          h4: ({ children: content }) => <h4>{linkify(content)}</h4>,
          // Answers are grounded in the user's own files; outbound links are
          // rare but must not be able to reach back into this tab.
          a: ({ href, children: content }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {content}
            </a>
          ),
        }}
      >
        {streaming ? children + CARET_SENTINEL : children}
      </ReactMarkdown>
    </div>
  )
})
