"""
TrustRAG — Secure Retrieval Engine
Replaces naive top-K similarity retrieval with security-filtered, trust-weighted, and RBAC-enforced retrieval.
"""

from typing import List, Dict, Any
from backend.rag.vectorstore import query_chunks
from backend.security.auth import check_rbac_permission
from backend.security.injection_detector import scan_for_prompt_injection


def apply_security_filters(candidates: List[Dict[str, Any]], user: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Apply TrustRAG's three defense filters to retrieved candidates:
      1. Strictly block Quarantined documents.
      2. Enforce RBAC clearance against each chunk's stored access_level.
      3. Retrieval-time rescan for prompt injection.
    Survivors are ranked: Trusted first, then by similarity distance.
    Pure function over candidate metadata — callable without a vector DB (used by the
    Stage 12 benchmark and by unit tests).
    """
    user_clearance = user.get("clearance_tags", ["PUBLIC", "INTERNAL"])
    filtered_chunks: List[Dict[str, Any]] = []

    for chunk in candidates:
        meta = chunk.get("metadata", {})
        trust_status = meta.get("trust_status", "Suspicious")
        access_level = meta.get("access_level", "INTERNAL")

        # Defense Filter 1: Strictly block Quarantined documents
        if trust_status == "Quarantined":
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
) -> List[Dict[str, Any]]:
    """
    Perform top-K retrieval with security filtering and trust ranking.

    Callers must gate `mode="baseline"` on `user_can_run_baseline` (see query.py) —
    this function keeps the unfiltered control path intact for the Stage 12
    academic comparison and trusts the caller's authorization decision.
    """
    # Fetch top candidates from vector DB (requesting more candidates to account for filtering)
    fetch_k = top_k * 3 if mode == "secure" else top_k
    candidates = query_chunks(query_embedding=query_embedding, top_k=fetch_k)

    # ponytail: baseline mode returns raw candidates — the O(n) filter is skipped by
    # design; this path exists only as the unfiltered control for Stage 12 comparison.
    if mode == "baseline":
        return candidates[:top_k]

    return apply_security_filters(candidates, user)[:top_k]


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
