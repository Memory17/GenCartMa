import json
from datetime import datetime
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from sentiment_analysis.data_quality import compute_data_quality

class Command(BaseCommand):
    help = "Analyze sentiment review data quality and optionally export JSON metrics."

    def add_arguments(self, parser):
        parser.add_argument('--output', type=str, default=None, help='Optional path (relative) to save metrics JSON')
        parser.add_argument('--min-text-len', type=int, default=1, help='Minimum token length to consider')
        parser.add_argument('--short-threshold', type=int, default=3, help='Threshold (tokens) for short text ratio')

    def handle(self, *args, **options):
        metrics = compute_data_quality(
            min_text_len=options['min_text_len'],
            short_threshold=options['short_threshold']
        )
        data = metrics.to_dict()

        # Pretty console output
        self.stdout.write(self.style.HTTP_INFO('Sentiment Data Quality Metrics'))
        for k, v in data.items():
            self.stdout.write(f" - {k}: {v}")

        out = options['output']
        if out:
            base = Path(settings.BASE_DIR)
            out_path = base / out
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with out_path.open('w', encoding='utf-8') as f:
                json.dump({
                    'generated_at_utc': datetime.utcnow().isoformat(),
                    'metrics': data
                }, f, ensure_ascii=False, indent=2)
            self.stdout.write(self.style.SUCCESS(f"Metrics saved to {out_path}"))
