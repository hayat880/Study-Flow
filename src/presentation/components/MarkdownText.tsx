import React from 'react';

/**
 * Lightweight, dependency-free Markdown renderer for AI responses.
 * Supports: # headings, **bold**, *italic*, `code`, bullet lists (* - +),
 * numbered lists, --- dividers and paragraphs. All other punctuation
 * (; : " ' etc.) is preserved exactly as written. No raw HTML is injected.
 */

// Inline formatting: **bold**, __bold__, *italic*, _italic_, `code`
const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+?)\*\*|__([^_]+?)__|`([^`]+?)`|\*([^*\s][^*]*?)\*|(?<![A-Za-z0-9])_([^_\s][^_]*?)_(?![A-Za-z0-9]))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${i++}`;
    if (match[2] !== undefined || match[3] !== undefined) {
      nodes.push(<strong key={key}>{renderInline(match[2] ?? match[3], key)}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(
        <code key={key} style={{ background: 'var(--tint)', padding: '1px 5px', borderRadius: 4, fontSize: '0.92em' }}>
          {match[4]}
        </code>
      );
    } else {
      nodes.push(<em key={key}>{renderInline(match[5] ?? match[6], key)}</em>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

export const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      const k = `p-${blocks.length}`;
      blocks.push(
        <p key={k} style={{ margin: '0 0 10px' }}>
          {para.map((l, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <br />}
              {renderInline(l, `${k}-${idx}`)}
            </React.Fragment>
          ))}
        </p>
      );
      para = [];
    }
  };

  const flushList = () => {
    if (list) {
      const k = `l-${blocks.length}`;
      const items = list.items.map((it, idx) => (
        <li key={idx} style={{ marginBottom: 4 }}>{renderInline(it, `${k}-${idx}`)}</li>
      ));
      blocks.push(
        list.ordered
          ? <ol key={k} style={{ margin: '0 0 10px', paddingLeft: 22 }}>{items}</ol>
          : <ul key={k} style={{ margin: '0 0 10px', paddingLeft: 22 }}>{items}</ul>
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) { flushPara(); flushList(); continue; }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushPara(); flushList();
      blocks.push(<hr key={`hr-${blocks.length}`} style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '12px 0' }} />);
      continue;
    }

    // Headings
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara(); flushList();
      const level = h[1].length;
      const size = level === 1 ? 20 : level === 2 ? 18 : level === 3 ? 16 : 15;
      const k = `h-${blocks.length}`;
      blocks.push(
        <div key={k} style={{ fontWeight: 700, fontSize: size, margin: '14px 0 8px', color: 'var(--ink)' }}>
          {renderInline(h[2].replace(/#+\s*$/, ''), k)}
        </div>
      );
      continue;
    }

    // Bullet list
    const ul = trimmed.match(/^[*+-]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(ul[1]);
      continue;
    }

    // Numbered list
    const ol = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (ol) {
      flushPara();
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(ol[1]);
      continue;
    }

    // Normal text
    flushList();
    para.push(trimmed);
  }
  flushPara();
  flushList();

  return <div style={{ lineHeight: 1.6 }}>{blocks}</div>;
};
