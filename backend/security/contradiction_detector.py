"""Compare claims with integrity-verified semantic neighbors."""

import re
from collections.abc import Callable
from typing import Any

from backend.rag.chunking import split_sentences
from backend.security.document_store import verified_documents
from backend.security.hashing import compute_sha256_str

# ponytail: fixed similarity and quorum rules; calibrate against a held-out corpus.
TOPIC_SIM = 0.50
TRUSTED_QUORUM = 2
MAX_CLAIMS = 20
TOP_N = 20
MIN_CLAIM_LEN = 20

NEGATION_RE = re.compile(
    r"(?i)\b(no longer|not\b|never\b|no\b|disabled|unnecessary|optional|"
    r"unlimited|without|don't|do not|none|against|prohibit|forbid)"
)
NUMBER_RE = re.compile(r"\d+")


def _result(
    decision: str = "clear",
    reason_codes: list[str] | None = None,
    evidence: list[dict[str, Any]] | None = None,
    claim: str | None = None,
    complete: bool = True,
) -> dict[str, Any]:
    evidence = evidence or []
    conflicts = [item for item in evidence if item["supports_contradiction"]]
    return {
        "decision": decision,
        "is_contradiction": decision in {"suspicious", "quarantine"},
        "contradiction_score": 0.85 if decision == "quarantine" else 0.5 if decision == "suspicious" else 0.0,
        "reason_codes": reason_codes or [],
        "evidence": evidence,
        "complete": complete,
        "contradictions": ([{
            "claim": (claim or "")[:200],
            "supporting_doc_ids": [item["document_id"] for item in conflicts],
        }] if conflicts else []),
    }


def _contradiction_cue(claim: str, neighbour_text: str) -> bool:
    claim_neg = bool(NEGATION_RE.search(claim))
    neighbour_neg = bool(NEGATION_RE.search(neighbour_text))
    if claim_neg != neighbour_neg:
        return True
    claim_nums = set(NUMBER_RE.findall(claim))
    neighbour_nums = set(NUMBER_RE.findall(neighbour_text))
    return bool(claim_nums and neighbour_nums and claim_nums.isdisjoint(neighbour_nums))


def _verified_neighbors(
    document_ids: list[str], cache: dict[str, dict | None] | None
) -> dict[str, dict | None]:
    """Verify documents, reusing a request-local cache across retrieval rescans."""
    if cache is None:
        return verified_documents(document_ids)
    missing = [document_id for document_id in document_ids if document_id not in cache]
    if missing:
        cache.update(verified_documents(missing))
    return {document_id: cache.get(document_id) for document_id in document_ids}


def scan_for_consensus_contradiction(
    text: str,
    exclude_document_id: str | None = None,
    embed_fn: Callable | None = None,
    query_fn: Callable | None = None,
    verified_cache: dict[str, dict | None] | None = None,
) -> dict[str, Any]:
    """Return trust-weighted contradiction evidence from distinct verified documents."""
    claims = sorted(
        (sentence for sentence in split_sentences(text or "") if len(sentence) >= MIN_CLAIM_LEN),
        key=len,
        reverse=True,
    )[:MAX_CLAIMS]
    if not claims:
        return _result(reason_codes=["NO_ELIGIBLE_CLAIMS"])

    if query_fn is None:
        try:
            from backend.rag.vectorstore import get_collection_count, query_chunks
            if get_collection_count() == 0:
                return _result(reason_codes=["NO_TRUSTED_NEIGHBORS"])
            query_fn = query_chunks
        except Exception:
            return _result("unavailable", ["NEIGHBOR_STORE_UNAVAILABLE"], complete=False)

    try:
        if embed_fn is None:
            from backend.rag.embedding import get_model
            embeddings = get_model().encode(claims, show_progress_bar=False).tolist()
        else:
            embeddings = embed_fn(claims)
    except Exception:
        return _result("unavailable", ["EMBEDDING_UNAVAILABLE"], complete=False)
    if len(embeddings) != len(claims):
        return _result("unavailable", ["EMBEDDING_COUNT_MISMATCH"], complete=False)

    queried_claims: list[tuple[str, list[dict[str, Any]]]] = []
    neighbor_ids: list[str] = []
    for claim, embedding in zip(claims, embeddings):
        try:
            try:
                neighbors = query_fn(query_embedding=embedding, top_k=TOP_N)
            except TypeError:
                neighbors = query_fn(embedding, TOP_N)
        except Exception:
            return _result("unavailable", ["NEIGHBOR_QUERY_FAILED"], complete=False)
        neighbors = neighbors or []
        queried_claims.append((claim, neighbors))
        for neighbor in neighbors:
            metadata = neighbor.get("metadata") or {}
            document_id = metadata.get("document_id")
            distance = neighbor.get("score")
            if (document_id and document_id != exclude_document_id and
                    isinstance(distance, (int, float)) and 1 - distance >= TOPIC_SIM):
                neighbor_ids.append(document_id)

    try:
        verified = _verified_neighbors(list(dict.fromkeys(neighbor_ids)), verified_cache)
    except Exception:
        return _result("unavailable", ["NEIGHBOR_VERIFICATION_FAILED"], complete=False)

    # Hash repeated neighbor texts once per scan instead of once per claim.
    text_digests: dict[str, str] = {}
    for claim, neighbors in queried_claims:
        # Keep only the best matching chunk per document; a source gets one vote.
        by_document: dict[str, dict[str, Any]] = {}
        for neighbor in neighbors:
            metadata = neighbor.get("metadata") or {}
            document_id = metadata.get("document_id")
            distance = neighbor.get("score")
            if (not document_id or document_id == exclude_document_id or
                    not isinstance(distance, (int, float))):
                continue
            similarity = 1 - distance
            if similarity < TOPIC_SIM:
                continue
            record = verified.get(document_id)
            chunk_text = neighbor.get("text", "")
            if (not record or not record.get("integrity_ok") or
                    metadata.get("sha256") != record.get("sha256")):
                continue
            text_sha256 = text_digests.get(chunk_text)
            if text_sha256 is None:
                text_sha256 = compute_sha256_str(chunk_text)
                text_digests[chunk_text] = text_sha256
            if metadata.get("text_sha256") != text_sha256:
                continue
            trust_status = record.get("trust_status")
            if trust_status not in {"Trusted", "Suspicious"}:
                continue
            current = by_document.get(document_id)
            if current is None or similarity > current["similarity"]:
                by_document[document_id] = {
                    "document_id": document_id,
                    "trust_status": trust_status,
                    "similarity": similarity,
                    "text": chunk_text,
                }

        if not by_document:
            continue
        trusted = [item for item in by_document.values() if item["trust_status"] == "Trusted"]
        suspicious = [item for item in by_document.values() if item["trust_status"] == "Suspicious"]
        trusted_conflicts = [item for item in trusted if _contradiction_cue(claim, item["text"])]
        trusted_agreements = [item for item in trusted if item not in trusted_conflicts]
        suspicious_conflicts = [item for item in suspicious if _contradiction_cue(claim, item["text"])]
        evidence = [
            {key: item[key] for key in ("document_id", "trust_status", "similarity")}
            | {"matched_claim": claim[:200], "supports_contradiction": item in trusted_conflicts or item in suspicious_conflicts}
            for item in by_document.values()
        ]

        if len(trusted_conflicts) >= TRUSTED_QUORUM and not trusted_agreements:
            return _result("quarantine", ["TRUSTED_NEIGHBOR_QUORUM_CONTRADICTION"], evidence, claim)
        if trusted_conflicts or (not trusted and suspicious_conflicts):
            reason = "CONFLICTING_TRUSTED_NEIGHBORS" if trusted_conflicts and trusted_agreements else "INSUFFICIENT_TRUSTED_QUORUM"
            return _result("suspicious", [reason], evidence, claim)

    return _result(reason_codes=["NO_TRUSTED_CONTRADICTION"])


def scan_chunk_for_contradiction(
    text: str,
    exclude_document_id: str | None = None,
    embed_fn: Callable | None = None,
    query_fn: Callable | None = None,
    verified_cache: dict[str, dict | None] | None = None,
) -> dict[str, Any]:
    """Retrieval-time rescan for a single chunk; skips tiny chunks and itself."""
    if not text or len(text) < 40:
        return _result(reason_codes=["CHUNK_TOO_SMALL"])
    return scan_for_consensus_contradiction(
        text,
        exclude_document_id=exclude_document_id,
        embed_fn=embed_fn,
        query_fn=query_fn,
        verified_cache=verified_cache,
    )
