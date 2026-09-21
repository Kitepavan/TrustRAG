"""
TrustRAG — Secure Retrieval Engine
Replaces naive top-K similarity retrieval with security-filtered, trust-weighted, and RBAC-enforced retrieval.
"""

from typing import List, Dict, Any
from backend.rag.vectorstore import query_chunks
from backend.security.auth import check_rbac_permission, user_can_run_baseline
from backend.security.document_store import verified_documents
from backend.security.hashing import compute_sha256_str
from backend.security.poison_detector import scan_for_knowledge_poisoning
from backend.security.injection_detector import scan_for_prompt_injection


def apply_security_filters(candidates: List[Dict[str, Any]], user: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Apply TrustRAG's three defense filters to retrieved candidates:
      1. Strictly block Quarantined documents.
      2. Enforce RBAC clearance against each chunk's stored access_level.
      3. Retrieval-time rescan for prompt injection.
    Survivors are ranked: Trusted first, then by similarity distance.
    Annotates blocked candidates with reasons; callable without a vector DB (used by the
    Stage 12 benchmark and by unit tests).
    """
    user_clearance = user.get("clearance_tags", [])
    filtered_chunks: List[Dict[str, Any]] = []

    for chunk in candidates:
        meta = chunk.get("metadata", {})
        trust_status = meta.get("trust_status")
        access_level = meta.get("access_level")

        # Defense Filter 1: Strictly block Quarantined documents
        if trust_status not in {"Trusted", "Suspicious"} or not meta.get("document_id"):
            chunk["filter_reason"] = "BLOCKED_QUARANTINED"
            continue

        # Defense Filter 2: Enforce Role-Based Access Control (RBAC)
        if not check_rbac_permission(user_clearance, access_level):
            chunk["filter_reason"] = "BLOCKED_UNAUTHORIZED_RBAC"
            continue

        # Defense Filter 3: Retrieval-time second scan for prompt injection
        injection_scan = scan_for_prompt_injection(chunk.get("text", ""))
        if injection_scan["is_injection"]:
            chunk["filter_reason"] = "BLOCKED_RETRIEVAL_PROMPT_INJECTION"
            continue

        if scan_for_knowledge_poisoning(chunk.get("text", ""))["is_poisoned"]:
            chunk["filter_reason"] = "BLOCKED_RETRIEVAL_POISONING"
            continue
        filtered_chunks.append(chunk)

    # Sort filtered chunks: Trusted first, then by similarity distance
    def rank_key(c):
        t_status = c.get("metadata", {}).get("trust_status", "")
        trust_weight = 0 if t_status == "Trusted" else 1
        return (trust_weight, c.get("score", 1.0))

    filtered_chunks.sort(key=rank_key)
    return filtered_chunks


def secure_retrieve_chunks(
    query_embedding: List[float],
    user: Dict[str, Any],
    top_k: int = 5,
    mode: str = "secure",  # "secure" (TrustRAG) vs "baseline" (Unfiltered RAG)
    pipeline_log: List[Dict[str, Any]] | None = None,
) -> List[Dict[str, Any]]:
    """
    Perform top-K retrieval with security filtering and trust ranking.

    Callers must gate `mode="baseline"` on `user_can_run_baseline` (see query.py) —
    this function also enforces that gate and preserves the privileged unfiltered
    control path for academic comparison.
    """
    if mode not in {"secure", "baseline"}:
        raise ValueError("Invalid retrieval mode")
    if mode == "baseline" and not user_can_run_baseline(user):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Baseline requires privileged clearance")
    # Fetch top candidates from vector DB (requesting more candidates to account for filtering)
    fetch_k = top_k * 3 if mode == "secure" else top_k
    candidates = query_chunks(query_embedding=query_embedding, top_k=fetch_k)
    trace = pipeline_log if pipeline_log is not None else []
    trace.append({"stage": "retrieval", "status": "info", "message": "Retrieved similarity candidates.", "count": len(candidates)})

    # ponytail: baseline mode returns raw candidates — the O(n) filter is skipped by
    # design; this path exists only as the unfiltered control for Stage 12 comparison.
    if mode == "baseline":
        trace.append({"stage": "security_filters", "status": "warning", "message": "Privileged baseline mode: integrity, trust, RBAC and content filters bypassed.", "count": len(candidates[:top_k])})
        return candidates[:top_k]

    verified = verified_documents([c.get("metadata", {}).get("document_id") for c in candidates if c.get("metadata", {}).get("document_id")])
    eligible = []
    for candidate in candidates:
        meta = candidate.get("metadata", {})
        record = verified.get(meta.get("document_id"))
        if not record or not record.get("integrity_ok"):
            continue
        if meta.get("sha256") != record.get("sha256") or meta.get("text_sha256") != compute_sha256_str(candidate.get("text", "")):
            continue
        candidate = dict(candidate, metadata=dict(meta, trust_status=record.get("trust_status"), access_level=record.get("access_level")))
        eligible.append(candidate)
    trace.append({"stage": "integrity", "status": "blocked" if len(eligible) < len(candidates) else "passed", "message": "Candidates excluded by file/signature or indexed-text integrity verification.", "count": len(candidates) - len(eligible)})
    filtered = apply_security_filters(eligible, user)
    for reason, message in (
        ("BLOCKED_QUARANTINED", "Quarantined or invalid trust metadata."),
        ("BLOCKED_UNAUTHORIZED_RBAC", "Excluded by role-based access control."),
        ("BLOCKED_RETRIEVAL_PROMPT_INJECTION", "Prompt injection detected during content rescan."),
        ("BLOCKED_RETRIEVAL_POISONING", "Knowledge poisoning detected during content rescan."),
    ):
        count = sum(chunk.get("filter_reason") == reason for chunk in eligible)
        trace.append({"stage": reason, "status": "blocked" if count else "passed", "message": message, "count": count})
    selected = filtered[:top_k]
    trace.append({"stage": "context", "status": "passed" if selected else "warning", "message": "Selected context after trust ranking and top-K limit.", "count": len(selected)})
    return selected


def build_secure_context(chunks: List[Dict[str, Any]]) -> str:
    """
    Build secure LLM context string with untrusted data boundaries.
    """
    if not chunks:
        return "<trusted_context>\nNo authorized, trusted documents were found.\n</trusted_context>"

    context_parts = ["<trusted_context>"]
    for idx, c in enumerate(chunks, start=1):
        doc_id = c.get("metadata", {}).get("document_id", "DOC-UNKNOWN")
        trust_status = c.get("metadata", {}).get("trust_status", "Suspicious")
        context_parts.append(
            f"[Source {idx} | ID: {doc_id} | Security Status: {trust_status}]\n{c.get('text', '')}\n"
        )
    context_parts.append("</trusted_context>")

    return "\n".join(context_parts)
