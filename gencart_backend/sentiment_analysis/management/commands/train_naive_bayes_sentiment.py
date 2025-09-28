from django.core.management.base import BaseCommand
from django.conf import settings
from products.models import Review
from sentiment_analysis.services import SentimentAnalysisService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Train Naive Bayes sentiment analysis model from existing reviews'

    def add_arguments(self, parser):
        parser.add_argument(
            '--min-reviews',
            type=int,
            default=50,
            help='Minimum number of reviews required for training (default: 50)'
        )
        parser.add_argument(
            '--test-split',
            type=float,
            default=0.2,
            help='Test data split ratio (default: 0.2)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force training even if insufficient data'
        )

    def handle(self, *args, **options):
        min_reviews = options['min_reviews']
        test_split = options['test_split']
        force = options['force']

        self.stdout.write(self.style.HTTP_INFO('🤖 Starting Naive Bayes Sentiment Model Training'))
        
        # Get reviews with sentiment labels
        reviews = Review.objects.filter(sentiment__isnull=False).values('comment', 'sentiment')
        review_count = len(reviews)
        
        self.stdout.write(f'📊 Found {review_count} labeled reviews')
        
        if review_count < min_reviews and not force:
            self.stdout.write(
                self.style.ERROR(
                    f'❌ Insufficient data: {review_count} reviews < {min_reviews} required. '
                    f'Use --force to train anyway.'
                )
            )
            return
        
        if review_count == 0:
            self.stdout.write(self.style.ERROR('❌ No labeled reviews found. Run analyze_sentiments first.'))
            return

        try:
            # Prepare training data
            texts = [r['comment'] for r in reviews]
            labels = [r['sentiment'] for r in reviews]
            
            # Train model
            service = SentimentAnalysisService()
            accuracy, report = service.train_naive_bayes_model(texts, labels, test_split)
            
            self.stdout.write(self.style.SUCCESS(f'✅ Model trained successfully!'))
            self.stdout.write(f'📈 Accuracy: {accuracy:.3f}')
            self.stdout.write('📋 Classification Report:')
            self.stdout.write(report)
            
            # Test on sample data
            self.stdout.write(self.style.HTTP_INFO('🧪 Testing model on sample texts:'))
            test_texts = [
                "This product is amazing! Great quality.",
                "Terrible quality, waste of money.",
                "It's okay, nothing special but works fine."
            ]
            
            for text in test_texts:
                prediction = service.predict_sentiment_naive_bayes(text)
                self.stdout.write(f'  "{text}" → {prediction}')
                
        except Exception as e:
            logger.error(f'Training failed: {e}')
            self.stdout.write(self.style.ERROR(f'❌ Training failed: {e}'))
