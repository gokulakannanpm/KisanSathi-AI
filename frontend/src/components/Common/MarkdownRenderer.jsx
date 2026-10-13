import React from 'react';

/**
 * Safely parses and renders Markdown text without dangerouslySetInnerHTML.
 * Supports:
 * - Responsive Markdown tables with horizontal scrolling
 * - Headings (#, ##, ###)
 * - Bold (**text**), Italics (*text*), Inline code (`code`)
 * - Bullet lists (- , * , • ) and numbered lists (1. , 2. )
 * - Safe HTML-like line break tags (<br>, <br/>, <br />) converted to native <br />
 * - Blockquotes (> )
 */

function renderInlineSpans(text, keyPrefix) {
  if (!text) return null;
  // Match tokens: `code`, **bold**, *italic*
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={`${keyPrefix}-code-${i}`}
          style={{
            background: 'rgba(0,0,0,0.06)',
            padding: '0.1rem 0.35rem',
            borderRadius: '4px',
            fontSize: '0.85em',
            fontFamily: 'monospace'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} style={{ fontWeight: 700, color: '#0f172a' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={`${keyPrefix}-i-${i}`} style={{ fontStyle: 'italic' }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

function renderInline(text, keyPrefix = 'inline') {
  if (!text) return null;
  // Convert any <br>, <br/>, <br /> safely to native React elements
  const brSegments = text.split(/<br\s*\/?>/gi);
  if (brSegments.length > 1) {
    return brSegments.map((seg, idx) => (
      <React.Fragment key={`${keyPrefix}-brgrp-${idx}`}>
        {idx > 0 && <br />}
        {renderInlineSpans(seg, `${keyPrefix}-${idx}`)}
      </React.Fragment>
    ));
  }
  return renderInlineSpans(text, keyPrefix);
}

function isTableDelimiter(line) {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  // Delimiter line consists only of |, -, :, and spaces
  return /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(trimmed);
}

function parseTableRow(line) {
  let cleaned = line.trim();
  if (cleaned.startsWith('|')) cleaned = cleaned.substring(1);
  if (cleaned.endsWith('|')) cleaned = cleaned.substring(0, cleaned.length - 1);
  return cleaned.split('|').map(c => c.trim());
}

export default function MarkdownRenderer({ content, className = '' }) {
  if (!content) return null;

  const rawLines = String(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const elements = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Skip completely empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Table detection: if line contains '|' and next line is delimiter
    if (trimmed.includes('|') && i + 1 < rawLines.length && isTableDelimiter(rawLines[i + 1])) {
      const headerLine = trimmed;
      const delimiterLine = rawLines[i + 1].trim();
      const headers = parseTableRow(headerLine);
      const rows = [];
      i += 2;

      while (i < rawLines.length && rawLines[i].trim().includes('|') && !isTableDelimiter(rawLines[i])) {
        rows.push(parseTableRow(rawLines[i]));
        i++;
      }

      elements.push(
        <div
          key={`table-wrapper-${elements.length}`}
          style={{
            overflowX: 'auto',
            margin: '0.75rem 0',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.82rem',
              textAlign: 'left'
            }}
          >
            <thead>
              <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #86efac' }}>
                {headers.map((h, colIdx) => (
                  <th
                    key={`th-${colIdx}`}
                    style={{
                      padding: '0.55rem 0.75rem',
                      fontWeight: 700,
                      color: '#166534',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {renderInline(h, `th-${colIdx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr
                  key={`tr-${rIdx}`}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: rIdx % 2 === 1 ? '#f8fafc' : '#ffffff'
                  }}
                >
                  {headers.map((_, colIdx) => (
                    <td
                      key={`td-${rIdx}-${colIdx}`}
                      style={{
                        padding: '0.45rem 0.75rem',
                        color: '#334155'
                      }}
                    >
                      {renderInline(row[colIdx] || '', `td-${rIdx}-${colIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 3. Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4
          key={`h4-${elements.length}`}
          style={{
            margin: '0.75rem 0 0.3rem 0',
            fontWeight: 700,
            color: '#166534',
            fontSize: '0.96rem'
          }}
        >
          {renderInline(trimmed.replace(/^###\s+/, ''), `h4-${elements.length}`)}
        </h4>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          style={{
            margin: '0.85rem 0 0.35rem 0',
            fontWeight: 800,
            color: '#0f172a',
            fontSize: '1.05rem',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '0.2rem'
          }}
        >
          {renderInline(trimmed.replace(/^##\s+/, ''), `h3-${elements.length}`)}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          style={{
            margin: '0.95rem 0 0.4rem 0',
            fontWeight: 800,
            color: '#0f172a',
            fontSize: '1.15rem'
          }}
        >
          {renderInline(trimmed.replace(/^#\s+/, ''), `h2-${elements.length}`)}
        </h2>
      );
      i++;
      continue;
    }

    // 4. Blockquotes
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          style={{
            margin: '0.5rem 0',
            padding: '0.4rem 0.75rem',
            background: '#f8fafc',
            borderLeft: '4px solid #16a34a',
            borderRadius: '0 6px 6px 0',
            color: '#475569',
            fontStyle: 'italic',
            fontSize: '0.86rem'
          }}
        >
          {renderInline(trimmed.replace(/^>\s+/, ''), `quote-${elements.length}`)}
        </blockquote>
      );
      i++;
      continue;
    }

    // 5. Unordered List Items (- , * , • )
    if (/^[-*•]\s+/.test(trimmed)) {
      const listItems = [];
      while (i < rawLines.length && /^[-*•]\s+/.test(rawLines[i].trim())) {
        listItems.push(rawLines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      elements.push(
        <ul
          key={`ul-${elements.length}`}
          style={{
            margin: '0.4rem 0 0.6rem 0',
            paddingLeft: '1.25rem',
            fontSize: '0.88rem',
            color: '#334155',
            lineHeight: 1.55
          }}
        >
          {listItems.map((item, idx) => (
            <li key={`li-${idx}`} style={{ marginBottom: '0.25rem' }}>
              {renderInline(item, `li-${elements.length}-${idx}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Ordered List Items (1. , 2. )
    if (/^\d+[\.\)]\s+/.test(trimmed)) {
      const listItems = [];
      while (i < rawLines.length && /^\d+[\.\)]\s+/.test(rawLines[i].trim())) {
        listItems.push(rawLines[i].trim().replace(/^\d+[\.\)]\s+/, ''));
        i++;
      }
      elements.push(
        <ol
          key={`ol-${elements.length}`}
          style={{
            margin: '0.4rem 0 0.6rem 0',
            paddingLeft: '1.35rem',
            fontSize: '0.88rem',
            color: '#334155',
            lineHeight: 1.55
          }}
        >
          {listItems.map((item, idx) => (
            <li key={`oli-${idx}`} style={{ marginBottom: '0.25rem' }}>
              {renderInline(item, `oli-${elements.length}-${idx}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Regular paragraph / lines
    // Collect consecutive non-empty lines that don't start other blocks
    const paragraphLines = [];
    while (
      i < rawLines.length &&
      rawLines[i].trim() &&
      !rawLines[i].trim().startsWith('#') &&
      !rawLines[i].trim().startsWith('>') &&
      !/^[-*•]\s+/.test(rawLines[i].trim()) &&
      !/^\d+[\.\)]\s+/.test(rawLines[i].trim()) &&
      !(rawLines[i].trim().includes('|') && i + 1 < rawLines.length && isTableDelimiter(rawLines[i + 1]))
    ) {
      paragraphLines.push(rawLines[i].trim());
      i++;
    }

    if (paragraphLines.length > 0) {
      elements.push(
        <div
          key={`p-${elements.length}`}
          style={{
            margin: '0.35rem 0',
            lineHeight: 1.55,
            fontSize: '0.88rem',
            color: '#1e293b'
          }}
        >
          {paragraphLines.map((pLine, pIdx) => (
            <React.Fragment key={`pline-${pIdx}`}>
              {pIdx > 0 && <br />}
              {renderInline(pLine, `p-${elements.length}-${pIdx}`)}
            </React.Fragment>
          ))}
        </div>
      );
    }
  }

  return <div className={`kisan-markdown-body ${className}`}>{elements}</div>;
}
