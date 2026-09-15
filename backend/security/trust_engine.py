"""
TrustRAG Security — Trust Engine & Policy Decision Module
Synthesizes digital signature, SHA-256 integrity, prompt injection, and knowledge poisoning scans
into a document Trust Category (Trusted, Suspicious, Quarantined) and Trust Score.
"""

from typing import Dict, Any, List
from backend.security.injection_detector import scan_for_prompt_injection
from backend.security.poison_detector import scan_for_knowledge_poisoning


class TrustEngine:
    """Evaluates multi-layered security signals and produces a Trust Decision."""

    @staticmethod
    def evaluate_document_trust(
        file_bytes: bytes,
        text_content: str,
        is_signed: bool,
        signature_valid: bool,
        uploader: str = "unknown",
    ) -> Dict[str, Any]:
        """
        Evaluate full document security status across all security layers.
        """
        reasons: List[str] = []

        # Layer 1: Digital Signature & Integrity Check
        if is_signed and not signature_valid:
            reasons.append("FAILED_DIGITAL_SIGNATURE_VERIFICATION")
            return {
                "trust_category": "Quarantined",
                "trust_score": 0.0,
                "policy_decision": "BLOCK",
                "reasons": reasons,
                "is_signed": is_signed,
                "signature_valid": signature_valid,
                "injection_scan": {"is_injection": False, "risk_score": 0.0},
                "poison_scan": {"is_poisoned": False, "poison_score": 0.0},
            }

        # Layer 2: Prompt Injection Scan
        injection_res = scan_for_prompt_injection(text_content)
        if injection_res["is_injection"]:
            reasons.append(f"PROMPT_INJECTION_DETECTED:{','.join(injection_res['matched_patterns'])}")
            return {
                "trust_category": "Quarantined",
                "trust_score": 0.0,
                "policy_decision": "BLOCK",
                "reasons": reasons,
                "is_signed": is_signed,
                "signature_valid": signature_valid,
                "injection_scan": injection_res,
                "poison_scan": {"is_poisoned": False, "poison_score": 0.0},
            }

        # Layer 3: Knowledge Poisoning Scan
        poison_res = scan_for_knowledge_poisoning(text_content)
        if poison_res["is_poisoned"]:
            reasons.append(f"KNOWLEDGE_POISONING_DETECTED:{','.join(poison_res['detected_anomalies'])}")

        # Layer 4: Compute Final Trust Category and Trust Score
        if is_signed and signature_valid:
            if poison_res["is_poisoned"]:
                trust_category = "Suspicious"
                trust_score = 0.5
                policy_decision = "ALLOW_WITH_WARNING"
            else:
                trust_category = "Trusted"
                trust_score = 1.0
                policy_decision = "ALLOW"
                reasons.append("VALID_DIGITAL_SIGNATURE_AND_CLEAN_CONTENT")
        else:
            # Unsigned document
            if poison_res["is_poisoned"]:
                trust_category = "Quarantined"
                trust_score = 0.1
                policy_decision = "BLOCK"
            else:
                trust_category = "Suspicious"
                trust_score = 0.6
                policy_decision = "ALLOW_WITH_WARNING"
                reasons.append("UNSIGNED_DOCUMENT_FLAGGED_SUSPICIOUS")

        return {
            "trust_category": trust_category,
            "trust_score": trust_score,
            "policy_decision": policy_decision,
            "reasons": reasons,
            "is_signed": is_signed,
            "signature_valid": signature_valid,
            "injection_scan": injection_res,
            "poison_scan": poison_res,
        }


# Global instance
trust_engine = TrustEngine()
