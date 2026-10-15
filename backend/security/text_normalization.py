"""Small normalization helpers shared by local content-security detectors."""

import re
import unicodedata
from collections.abc import Iterable

QUOTED_TEXT_RE = re.compile(r'“[^”]*”|"[^"]*"')


def normalize_security_text(text: str, format_separator: str = " ") -> str:
    """Normalize compatibility characters, invisible controls, and spacing."""
    normalized = unicodedata.normalize("NFKC", text or "")
    normalized = "".join(format_separator if unicodedata.category(char) == "Cf" else char for char in normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def remove_explicitly_rejected_quotes(
    text: str,
    attack_patterns: Iterable[str],
    framing_pattern: re.Pattern,
    rejection_pattern: re.Pattern,
) -> str:
    """Mask quoted attack examples only when nearby prose clearly rejects them."""
    matches = []
    for quote in QUOTED_TEXT_RE.finditer(text):
        before = text[max(0, quote.start() - 120):quote.start()]
        after = text[quote.end():quote.end() + 160]
        if (
            framing_pattern.search(before)
            and rejection_pattern.search(after)
            and any(re.search(pattern, quote.group()) for pattern in attack_patterns)
        ):
            matches.append(quote.span())
    for start, end in reversed(matches):
        masked = "".join("\f" if char == "\f" else " " for char in text[start:end])
        text = text[:start] + masked + text[end:]
    return text
