// ---------------------------------------------------------------------------
// Provider abstractions (build-plan §0.2)
//
// The rest of the application must never know which model/vendor is in use.
// Providers are replaceable infrastructure; selection happens in the factory
// (index.ts), never at call sites.
// ---------------------------------------------------------------------------

/** Legacy V1 grading request (text answer, single LLM judge). */
export interface AIEvalRequest {
  questionId: number;
  questionText: string;
  rubricHints: string;
  level: string;
  answerText: string;
}

/** Legacy V1 grading result. V2 band grading lives in the evaluator layer. */
export interface AIEvalResult {
  score: number;
  feedback: string;
  modelAnswer: string;
  /** Provenance — recorded with evaluations once V2 persistence lands. */
  provider: string;
  modelVersion: string;
}

export interface AIEvalHooks {
  /** Streaming callback for SSE fan-out; providers that cannot stream call it once. */
  onToken?: (delta: string) => Promise<void> | void;
}

export interface AIProvider {
  readonly name: string;
  readonly modelVersion: string;
  evaluate(req: AIEvalRequest, hooks?: AIEvalHooks): Promise<AIEvalResult>;
}

// ---------------------------------------------------------------------------
// Structured JSON completion — the primitive the V2 evaluator consumes.
// Implementations MUST return parsed JSON or throw; callers never see raw text.
// ---------------------------------------------------------------------------

export interface ChatJSONRequest {
  system: string;
  user: string;
  temperature?: number;
}

export interface ChatJSONProvider {
  readonly name: string;
  readonly modelVersion: string;
  completeJSON(req: ChatJSONRequest): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// ASR — replaceable speech-to-text infrastructure. Word timestamps are
// mandatory: deterministic delivery metrics are computed from them.
// ---------------------------------------------------------------------------

export interface ASRWord {
  word: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface ASRSegment {
  startMs: number;
  endMs: number;
  text: string;
}

export interface ASRResult {
  transcript: string;
  words: ASRWord[];
  segments: ASRSegment[];
  language: string;
  durationMs: number;
  provider: string;
  modelVersion: string;
  /** True when the provider returned real word-level timestamps. False when
   *  words were interpolated from segment boundaries (synthetic). Delivery
   *  metrics are unreliable with synthetic timestamps and must be skipped. */
  hasRealTimestamps: boolean;
}

export interface ASRTokensOpts {
  languageHint?: string;
}

export interface ASRProvider {
  readonly name: string;
  readonly modelVersion: string;
  transcribe(audio: Buffer, mimeType: string, opts?: ASRTokensOpts): Promise<ASRResult>;
}
