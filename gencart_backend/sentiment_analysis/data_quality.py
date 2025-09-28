from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import List, Dict, Any
from collections import Counter
import re

# Lightweight, no external deps beyond Django ORM
from products.models import Review

@dataclass
class DataQualityMetrics:
    total_reviews: int
    labeled_reviews: int
    unlabeled_reviews: int
    null_text_ratio: float
    class_distribution: Dict[str, int]
    class_ratio_max_min: float | None
    duplicate_ratio: float
    avg_length_tokens: float | None
    short_text_ratio: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

TOKEN_SPLIT_RE = re.compile(r"\s+")


def _tokenize(text: str) -> List[str]:
    return [t for t in TOKEN_SPLIT_RE.split(text.strip()) if t]


def compute_data_quality(min_text_len: int = 1, short_threshold: int = 3) -> DataQualityMetrics:
    qs = Review.objects.all().values('id', 'title', 'comment', 'sentiment')
    total = qs.count()
    labeled = 0
    unlabeled = 0
    null_text = 0
    texts = []
    sentiments = []
    lengths = []
    short_count = 0

    for r in qs:
        combined = f"{r['title'] or ''} {r['comment'] or ''}".strip()
        if not combined:
            null_text += 1
            continue
        tokens = _tokenize(combined.lower())
        if len(tokens) < min_text_len:
            continue
        texts.append(combined.lower())
        lengths.append(len(tokens))
        if len(tokens) < short_threshold:
            short_count += 1
        if r['sentiment']:
            labeled += 1
            sentiments.append(r['sentiment'])
        else:
            unlabeled += 1

    # Duplicate detection (exact text)
    dup_count = 0
    if texts:
        counter = Counter(texts)
        dup_count = sum(c - 1 for c in counter.values() if c > 1)
    duplicate_ratio = dup_count / len(texts) if texts else 0.0

    class_counts = Counter(sentiments)
    if class_counts:
        min_c = min(class_counts.values())
        max_c = max(class_counts.values())
        ratio = (max_c / min_c) if min_c > 0 else None
    else:
        ratio = None

    avg_len = (sum(lengths) / len(lengths)) if lengths else None

    return DataQualityMetrics(
        total_reviews=total,
        labeled_reviews=labeled,
        unlabeled_reviews=unlabeled,
        null_text_ratio=(null_text / total) if total else 0.0,
        class_distribution=dict(class_counts),
        class_ratio_max_min=ratio,
        duplicate_ratio=duplicate_ratio,
        avg_length_tokens=avg_len,
        short_text_ratio=(short_count / len(lengths)) if lengths else 0.0,
    )
