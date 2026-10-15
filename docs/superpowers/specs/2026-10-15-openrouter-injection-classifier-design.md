# OpenRouter Semantic Prompt-Injection Detection

## Goal

Replace TrustRAG's regex-based prompt-injection verdict with a semantic classifier. The detector should identify instruction intent that is not limited to a fixed list of phrases, while treating ordinary supplier requirements and educational discussion as benign where appropriate. Existing poison detection remains a separate control.

## Approved provider choice

The user selected OpenRouter for classification and prefers `inception/mercury-decide:free`. TrustRAG will send scanned text to this model using the existing API key. Document text is therefore processed by that external provider. The classifier will not receive tools or permission to execute actions. OpenRouter describes Mercury Decide as a typed decision model with a 32,768-token context window; free-tier rate limits and provider availability still apply. [OpenRouter model page](https://openrouter.ai/inception/mercury-decide%3Afree)

## Design

### Classifier interface

Keep the `scan_for_prompt_injection` concept as the shared entry point, but implement its verdict with OpenRouter's System One endpoint (`POST /api/v1/systemone`). Send the text as `state` and one named yes/no question (`type: "noul"`) asking whether the content attempts to control an AI assistant, override governing instructions, extract hidden prompts or secrets, or direct unauthorized disclosure/actions. The source text is untrusted data to analyze, never instructions to follow. OpenRouter documents Mercury Decide as using this typed decision schema, with a yes probability in the response. [OpenRouter System One example](https://openrouter.ai/blog/insights/what-is-jev/)

Read the returned yes probability (`answers.<question>.noul`) and validate response shape and that the probability is finite and within `[0, 1]`. Mercury Decide returns a probability, not a free-text rationale or reason code. Select the quarantine threshold using a labelled development corpus, then freeze it before evaluating on a separate holdout corpus. Do not fall back to regex or chat completions when the decision endpoint is unsupported.

### Ingestion path

At document ingestion, classify bounded overlapping text segments and aggregate them: any positive injection verdict quarantines the entire document. If classification is unavailable, times out, or produces invalid output, ingestion fails closed by quarantining the document and recording a non-sensitive reason. The pipeline must not index such content as trusted.

### Retrieval path

Classify retrieved candidate chunks as one bounded batch before assembling LLM context. Exclude every candidate classified as an injection. If the classifier is unavailable or its response cannot be validated, exclude the affected candidates. This prevents a content change or ingestion gap from being silently passed to answer generation.

Batching must bound request size and provider-call count, preserve segment/chunk identity, and not log document text. The detector must avoid one provider request per retrieved chunk.

### Trust and audit behavior

Positive classification is a security finding and follows the existing quarantine/block policy. Classifier unavailability is a fail-closed security state, not a clean verdict. Audit events may record actor, document/request identifiers, classifier outcome, and failure category, but must not record document text, prompt text, API credentials, or model reasoning beyond a short controlled reason code.

## Evaluation

Add tests that distinguish semantic behavior from phrase matching:

- Adversarial paraphrases that do not contain the current regex trigger phrases.
- Existing injection fixtures and obfuscated or multi-sentence instruction attempts.
- Benign supplier procedures and benign documents that discuss prompt injection as a warning or example.
- Ingestion quarantine and retrieval blocking on positive verdicts.
- Fail-closed behavior for timeout, provider errors, malformed responses, missing answers, and invalid probabilities.
- Batch identity and upper-bound behavior so results cannot be applied to the wrong chunk.

Report results on a fixed labelled corpus with false positives and false negatives visible. Choose the threshold on development data and report holdout precision, recall, false-positive rate, and false-negative rate. A successful API response alone does not establish detector robustness.

## Limits

A semantic model classifier is probabilistic and may still miss novel attacks or flag legitimate text. The implementation must describe measured behavior and should not claim complete prompt-injection prevention. Provider latency, rate limits, availability, threshold choice, and external processing of document text affect ingestion and query performance/privacy.

## OpenRouter API reference

The detector model is explicitly `inception/mercury-decide:free`; `LLM_MODEL` continues to configure answer generation separately. Mercury Decide uses System One rather than chat-completions structured output.
