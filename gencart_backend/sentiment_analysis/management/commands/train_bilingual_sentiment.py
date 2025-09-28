from django.core.management.base import BaseCommand
import logging

from ...kaggle_loaders import EnglishSentimentLoader, VietnameseSentimentLoader
from ...models import NaiveBayesSentimentAnalyzer

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Train sentiment models for both English and Vietnamese using Kaggle datasets.'

    def add_arguments(self, parser):
        parser.add_argument('--test-size', type=float, default=0.2, help='Test split for quick validation')

    def handle(self, *args, **options):
        test_size = options['test_size']
        self.stdout.write(self.style.SUCCESS('Downloading and preparing English dataset...'))
        en_loader = EnglishSentimentLoader()
        en_df = en_loader.load()
        self.stdout.write(f"English dataset: {en_df.shape}")

        self.stdout.write(self.style.SUCCESS('Downloading and preparing Vietnamese dataset...'))
        vi_loader = VietnameseSentimentLoader()
        vi_df = vi_loader.load()
        self.stdout.write(f"Vietnamese dataset: {vi_df.shape}")

        # Train English model
        self.stdout.write(self.style.SUCCESS('Training English Naive Bayes model...'))
        en_analyzer = NaiveBayesSentimentAnalyzer(language='en')
        en_acc = en_analyzer.train(en_df['text'].tolist(), en_df['label'].tolist(), test_size=test_size)
        en_analyzer.save_model()
        self.stdout.write(self.style.SUCCESS(f'English model trained. Accuracy: {en_acc:.4f}'))

        # Train Vietnamese model
        self.stdout.write(self.style.SUCCESS('Training Vietnamese Naive Bayes model...'))
        vi_analyzer = NaiveBayesSentimentAnalyzer(language='vi')
        vi_acc = vi_analyzer.train(vi_df['text'].tolist(), vi_df['label'].tolist(), test_size=test_size)
        vi_analyzer.save_model()
        self.stdout.write(self.style.SUCCESS(f'Vietnamese model trained. Accuracy: {vi_acc:.4f}'))

        self.stdout.write(self.style.SUCCESS('Both language models trained and saved to sentiment_models/.'))
