from django.core.management.base import BaseCommand
from django.conf import settings
from products.models import Review
from sentiment_analysis.services import ModelTrainingService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Train sentiment analysis models from existing reviews (Naive Bayes only)'

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

        self.stdout.write(self.style.HTTP_INFO('🧠 Starting Sentiment Model Training'))
        
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
            # Train Naive Bayes model
            self.stdout.write(self.style.HTTP_INFO('🔥 Training Naive Bayes model...'))
            training_service = ModelTrainingService()
            accuracy = training_service.train_naive_bayes_model()
            
            self.stdout.write(self.style.SUCCESS(f'✅ Naive Bayes model trained successfully!'))
            self.stdout.write(f'📈 Accuracy: {accuracy:.3f}')
            
            # Test on sample data
            self.stdout.write(self.style.HTTP_INFO('🧪 Testing model on sample texts:'))
            from sentiment_analysis.services import analyze_review_sentiment
            
            test_texts = [
                "This product exceeded my expectations! Highly recommend.",
                "Completely disappointed with this purchase. Poor quality.",
                "Average product, does what it's supposed to do."
            ]
            
            for text in test_texts:
                prediction = analyze_review_sentiment(text, model_type='naive_bayes')
                self.stdout.write(f'  "{text}" → {prediction["sentiment"]} ({prediction["confidence"]:.3f})')
                
        except Exception as e:
            logger.error(f'Model training failed: {e}')
            self.stdout.write(self.style.ERROR(f'❌ Model training failed: {e}'))