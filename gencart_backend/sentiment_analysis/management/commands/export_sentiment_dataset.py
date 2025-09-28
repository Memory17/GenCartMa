import csv
import json
import hashlib
from datetime import datetime
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from products.models import Review

class Command(BaseCommand):
    help = "Export labeled sentiment dataset with hash + simple metadata (manual versioning)."

    def add_arguments(self, parser):
        parser.add_argument('--min-length', type=int, default=1, help='Minimum combined text length to include (default: 1)')
        parser.add_argument('--format', type=str, choices=['csv', 'json'], default='csv', help='Export format (default: csv)')
        parser.add_argument('--limit', type=int, default=None, help='Limit number of rows (debug)')
        parser.add_argument('--output-dir', type=str, default='data_exports', help='Relative output directory')

    def handle(self, *args, **options):
        min_length = options['min_length']
        fmt = options['format']
        limit = options['limit']
        rel_dir = options['output_dir']

        base_dir = Path(settings.BASE_DIR)
        out_dir = base_dir / rel_dir
        out_dir.mkdir(parents=True, exist_ok=True)

        # Query labeled reviews
        qs = Review.objects.filter(sentiment__isnull=False).values('id', 'title', 'comment', 'sentiment', 'rating', 'created_at')
        if limit:
            qs = qs[:limit]

        rows = []
        for r in qs:
            text = f"{r['title'] or ''} {r['comment'] or ''}".strip()
            if len(text) < min_length:
                continue
            rows.append({
                'id': r['id'],
                'text': text,
                'title': r['title'] or '',
                'comment': r['comment'] or '',
                'sentiment': r['sentiment'],
                'rating': r['rating'],
                'created_at': r['created_at'].isoformat() if r['created_at'] else None
            })

        if not rows:
            self.stdout.write(self.style.WARNING('No data to export.'))
            return

        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        stem = f"reviews_sentiment_{timestamp}"

        # Compute hash over concatenated lines (stable order by id)
        concat_source = '\n'.join(f"{r['id']}|{r['sentiment']}|{r['text']}" for r in rows)
        data_hash = hashlib.sha256(concat_source.encode('utf-8')).hexdigest()[:16]
        filename = f"{stem}_{data_hash}.{fmt}"
        path = out_dir / filename

        if fmt == 'csv':
            with path.open('w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                writer.writerows(rows)
        else:
            with path.open('w', encoding='utf-8') as f:
                json.dump(rows, f, ensure_ascii=False, indent=2)

        # Metadata
        sentiments = {}
        for r in rows:
            sentiments[r['sentiment']] = sentiments.get(r['sentiment'], 0) + 1
        meta = {
            'rows': len(rows),
            'class_distribution': sentiments,
            'export_utc': timestamp,
            'hash_prefix': data_hash,
            'file': filename,
            'min_length': min_length,
            'format': fmt
        }
        meta_path = out_dir / f"{stem}_{data_hash}.meta.json"
        with meta_path.open('w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

        self.stdout.write(self.style.SUCCESS(f"Exported {len(rows)} rows → {path.name}"))
        self.stdout.write(f"Metadata: {meta_path.name}")
        self.stdout.write(f"Class distribution: {sentiments}")
