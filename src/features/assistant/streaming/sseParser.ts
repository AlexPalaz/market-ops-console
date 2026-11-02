/**
 * Incremental Server-Sent Events parser.
 *
 * Network chunks do not align with events: one `reader.read()` may contain
 * half an event or several. The parser buffers text, splits on the blank line
 * that terminates an event, and yields the joined `data:` payload of each.
 * Comment lines (`:`) and other fields (`event:`, `id:`, `retry:`) are
 * ignored because CONTRACT.md only uses `data:`.
 */
export interface SseParser {
  /** Feed a decoded text chunk; returns the data payloads of completed events. */
  feed(chunk: string): string[];
  /** Flush a trailing event that was not terminated by a blank line. */
  flush(): string[];
}

export function createSseParser(): SseParser {
  let buffer = "";

  const parseBlock = (block: string): string | null => {
    const data: string[] = [];
    for (const rawLine of block.split("\n")) {
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
      if (line === "" || line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? "" : line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      if (field === "data") data.push(value);
    }
    return data.length ? data.join("\n") : null;
  };

  return {
    feed(chunk) {
      buffer += chunk;
      const out: string[] = [];
      // An event ends at "\n\n" or "\r\n\r\n".
      for (;;) {
        const m = /\r?\n\r?\n/.exec(buffer);
        if (!m) break;
        const block = buffer.slice(0, m.index);
        buffer = buffer.slice(m.index + m[0].length);
        const payload = parseBlock(block);
        if (payload !== null) out.push(payload);
      }
      return out;
    },
    flush() {
      const rest = buffer;
      buffer = "";
      const payload = rest.trim() ? parseBlock(rest) : null;
      return payload === null ? [] : [payload];
    },
  };
}
