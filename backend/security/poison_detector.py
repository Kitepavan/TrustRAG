"""
TrustRAG Content Security — Knowledge Poisoning Detector
Scans document text for malicious policy overrides, security contradictions, and knowledge poisoning patterns.
"""

import re
from typing import List, Dict, Any


# Heuristic patterns associated with malicious knowledge poisoning attempts in
# enterprise documents. Each pattern is written to match ONLY a disabling/negating
# statement, so clean mandatory text ("MFA is required", "Passwords are mandatory")
# never triggers a false positive. There is no separate whole-document substring
# check: that approach flagged clean docs that merely contained the word "disabled".
POISON_PATTERNS = [
    (r"(?i)passwords?\s+(?:is|are)?\s*(?:no\s+longer|not)\s+(?:required|needed|mandatory)", "POISON_PASSWORD_POLICY_DISABLED"),
    (r"(?i)passwords?\s+(?:is|are)\s+(?:disabled|unnecessary|optional)", "POISON_PASSWORD_POLICY_DISABLED"),
    (r"(?i)mfa\s+(?:is)?\s*(?:no\s+longer|not)\s+(?:required|needed|mandatory)", "POISON_MFA_DISABLED"),
    (r"(?i)mfa\s+(?:is)?\s+(?:disabled|unnecessary|optional)", "POISON_MFA_DISABLED"),
    (r"(?i)encryption\s+(?:is)?\s*(?:disabled|unnecessary|not\s+enforced|turned\s+off)", "POISON_ENCRYPTION_DISABLED"),
    (r"(?i)all\s+employees\s+have\s+admin\s+(access|privileges|rights)", "POISON_ALL_USERS_ADMIN"),
    (r"(?i)do\s+not\s+report\s+(security\s+)?incidents", "POISON_SUPPRESS_INCIDENT_REPORTING"),
    (r"(?i)firewall\s+rules?\s+(should|must)\s+be\s+(disabled|turned\s+off)", "POISON_FIREWALL_DISABLED"),
    (r"(?i)confidential\s+data\s+may\s+be\s+shared\s+publicly", "POISON_DATA_LEAK_PERMITTED"),
    (r"(?i)ignore\s+(standard\s+)?security\s+protocols", "POISON_IGNORE_SECURITY_PROTOCOLS"),
]


def scan_for_knowledge_poisoning(text: str) -> Dict[str, Any]:
    """
    Scans document text for knowledge poisoning patterns.
    Returns dictionary with:
    - is_poisoned: bool
    - poison_score: float (0.0 to 1.0)
    - detected_anomalies: List[str]
    """
    if not text or not text.strip():
        return {"is_poisoned": False, "poison_score": 0.0, "detected_anomalies": []}

    detected = []
    for pattern, rule_id in POISON_PATTERNS:
        # Patterns are negation-anchored (see above), so a regex hit is sufficient.
        if re.search(pattern, text):
            detected.append(rule_id)

    if not detected:
        poison_score = 0.0
        is_poisoned = False
    elif len(detected) == 1:
        poison_score = 0.7
        is_poisoned = True
    else:
        poison_score = 1.0
        is_poisoned = True

    return {
        "is_poisoned": is_poisoned,
        "poison_score": poison_score,
        "detected_anomalies": detected,
    }
