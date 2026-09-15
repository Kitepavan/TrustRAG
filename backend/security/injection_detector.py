"""
TrustRAG Content Security — Prompt Injection Detector
Scans input documents and retrieved text chunks for indirect prompt injection attempts.
"""

import re
from typing import List, Dict, Any


# Regular expression patterns for common indirect prompt injection attack vectors
INJECTION_PATTERNS = [
    (r"(?i)ignore\s+.*?(instructions|directives|prompts|rules|directive)", "IGNORE_PREVIOUS_INSTRUCTIONS"),
    (r"(?i)disregard\s+.*?(instructions|directives|prompts|rules|directive)", "DISREGARD_PREVIOUS_INSTRUCTIONS"),
    (r"(?i)forget\s+.*?(instructions|directives|prompts|directive)", "FORGET_PREVIOUS_INSTRUCTIONS"),
    (r"(?i)you\s+are\s+now\s+.*?(developer|admin|root|god|unrestricted)\s+mode", "DEVELOPER_MODE_OVERRIDE"),
    (r"(?i)(?:act|behave|operate)\s+as\s+(?:an?\s+)?(?:unrestricted|developer|admin|root|jailbroken)", "DEVELOPER_MODE_OVERRIDE"),
    (r"(?i)reveal\s+.*?(system\s+prompt|initial\s+instructions|hidden\s+rules)", "SYSTEM_PROMPT_LEAK"),
    (r"(?i)(?:reveal|print|output|leak|show)\s+.*?(system\s+prompt|secrets?|secret\s+key|api\s+token|password|credentials)", "SECRET_LEAK_REQUEST"),
    (r"(?i)new\s+system\s+instruction:", "NEW_SYSTEM_INSTRUCTION_HEADER"),
    (r"(?i)override\s+system\s+security", "OVERRIDE_SECURITY_HEADER"),
    (r"(?i)\[system\s*:\s*override\]", "SYSTEM_OVERRIDE_TAG"),
    (r"(?i)<\s*system_instruction\s*>", "SYSTEM_INSTRUCTION_XML_TAG"),
    (r"(?i)do\s+not\s+follow\s+.*?(system|original)\s+prompt", "DO_NOT_FOLLOW_PROMPT"),
]


def scan_for_prompt_injection(text: str) -> Dict[str, Any]:
    """
    Scans a block of text for indirect prompt injection patterns.
    Returns dictionary with:
    - is_injection: bool
    - risk_score: float (0.0 to 1.0)
    - matched_patterns: List[str]
    """
    if not text or not text.strip():
        return {"is_injection": False, "risk_score": 0.0, "matched_patterns": []}

    matched = []
    for pattern, rule_id in INJECTION_PATTERNS:
        if re.search(pattern, text):
            matched.append(rule_id)

    # Risk score calculation
    if not matched:
        risk_score = 0.0
        is_injection = False
    elif len(matched) == 1:
        risk_score = 0.75
        is_injection = True
    else:
        risk_score = 1.0
        is_injection = True

    return {
        "is_injection": is_injection,
        "risk_score": risk_score,
        "matched_patterns": matched,
    }
