import { describe, expect, it } from "vitest";
import { createSseParser } from "../streaming/sseParser";

describe("createSseParser", () => {
  it("yields one payload per blank-line terminated event", () => {
    const p = createSseParser();
    expect(p.feed('data: {"type":"token","value":"Three "}\n\n')).toEqual([
      '{"type":"token","value":"Three "}',
    ]);
  });

  it("handles an event split across arbitrary chunks", () => {
    const p = createSseParser();
    expect(p.feed('data: {"type":"tok')).toEqual([]);
    expect(p.feed('en","value":"ma')).toEqual([]);
    expect(p.feed('rkets "}\n')).toEqual([]);
    expect(p.feed("\n")).toEqual(['{"type":"token","value":"markets "}']);
  });

  it("handles several events in one chunk and keeps the remainder buffered", () => {
    const p = createSseParser();
    const out = p.feed('data: {"a":1}\n\ndata: {"a":2}\n\ndata: {"a":3}');
    expect(out).toEqual(['{"a":1}', '{"a":2}']);
    expect(p.feed("\n\n")).toEqual(['{"a":3}']);
  });

  it("accepts CRLF line endings, comments and other fields", () => {
    const p = createSseParser();
    expect(p.feed(': keep-alive\r\nevent: message\r\nid: 7\r\ndata: {"x":1}\r\n\r\n')).toEqual([
      '{"x":1}',
    ]);
  });

  it("joins multiple data lines with a newline, per the SSE spec", () => {
    const p = createSseParser();
    expect(p.feed("data: a\ndata: b\n\n")).toEqual(["a\nb"]);
  });

  it("flushes an unterminated trailing event", () => {
    const p = createSseParser();
    expect(p.feed('data: {"tail":true}')).toEqual([]);
    expect(p.flush()).toEqual(['{"tail":true}']);
    expect(p.flush()).toEqual([]);
  });

  it("ignores blank-line-only noise", () => {
    const p = createSseParser();
    expect(p.feed("\n\n\n\n")).toEqual([]);
  });
});
