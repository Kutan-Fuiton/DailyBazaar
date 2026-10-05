"""
core/sanitizer.py — Simple input sanitization utilities to prevent stored XSS.
"""
import re
from typing import Optional

# Matches HTML tags like <script>, <div>, etc.
HTML_TAG_REGEX = re.compile(r"<[^>]+>")


def sanitize_string(val: Optional[str]) -> Optional[str]:
    """Strips HTML tags and trims whitespace from user text inputs."""
    if val is None:
        return None
    cleaned = HTML_TAG_REGEX.sub("", val)
    return cleaned.strip()
