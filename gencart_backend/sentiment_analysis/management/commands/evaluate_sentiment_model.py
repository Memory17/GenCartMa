from django.core.management.base import BaseCommand
from products.models import Review, Product
from users.models import User
from orders.models import Order, OrderItem
from sentiment_analysis.services import SentimentAnalysisService
import logging
from datetime import datetime, timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Evaluate sentiment analysis model performance on labeled data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model-type',
            type=str,
            choices=['naive_bayes', 'bert', 'system'],
            default='naive_bayes',
            help='Model type to evaluate (default: naive_bayes)'
        )
        parser.add_argument(
            '--sample-size',
            type=int,
            default=100,
            help='Number of reviews to evaluate (default: 100)'
        )
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Show detailed per-class metrics'
        )

    def handle(self, *args, **options):
        model_type = options['model_type']
        sample_size = options['sample_size']
        detailed = options['detailed']

        self.stdout.write(self.style.HTTP_INFO(f'📊 Evaluating {model_type} sentiment model'))
        
        # Get labeled reviews for evaluation
        reviews = Review.objects.filter(sentiment__isnull=False).order_by('?')[:sample_size]
        
        if not reviews:
            self.stdout.write(self.style.ERROR('❌ No labeled reviews found for evaluation'))
            return
            
        self.stdout.write(f'🔍 Evaluating on {len(reviews)} reviews')
        
        service = SentimentAnalysisService()
        correct_predictions = 0
        total_predictions = 0
        confusion_matrix = {
            'positive': {'positive': 0, 'negative': 0, 'neutral': 0},
            'negative': {'positive': 0, 'negative': 0, 'neutral': 0},
            'neutral': {'positive': 0, 'negative': 0, 'neutral': 0}
        }
        
        try:
            for review in reviews:
                # Get prediction based on model type
                if model_type == 'naive_bayes':
                    prediction = service.predict_sentiment_naive_bayes(review.comment)
                elif model_type == 'bert':
                    prediction = service.predict_sentiment_bert(review.comment)
                elif model_type == 'system':
                    prediction = service.predict_sentiment(review.comment)
                
                actual = review.sentiment
                predicted = prediction.get('sentiment') if isinstance(prediction, dict) else prediction
                
                if predicted == actual:
                    correct_predictions += 1
                    
                confusion_matrix[actual][predicted] += 1
                total_predictions += 1
            
            # Calculate metrics
            accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0
            
            self.stdout.write(self.style.SUCCESS(f'✅ Evaluation Complete'))
            self.stdout.write(f'📈 Overall Accuracy: {accuracy:.3f} ({correct_predictions}/{total_predictions})')
            
            # Show confusion matrix
            self.stdout.write('\n📋 Confusion Matrix:')
            self.stdout.write('                Predicted')
            self.stdout.write('Actual      Pos   Neg   Neu')
            for actual in ['positive', 'negative', 'neutral']:
                row = confusion_matrix[actual]
                self.stdout.write(f'{actual:8} {row["positive"]:5} {row["negative"]:5} {row["neutral"]:5}')
            
            if detailed:
                # Calculate per-class metrics
                self.stdout.write('\n📊 Detailed Metrics:')
                for sentiment in ['positive', 'negative', 'neutral']:
                    tp = confusion_matrix[sentiment][sentiment]
                    fp = sum(confusion_matrix[other][sentiment] for other in ['positive', 'negative', 'neutral'] if other != sentiment)
                    fn = sum(confusion_matrix[sentiment][other] for other in ['positive', 'negative', 'neutral'] if other != sentiment)
                    
                    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
                    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
                    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
                    
                    self.stdout.write(f'{sentiment:8} - Precision: {precision:.3f}, Recall: {recall:.3f}, F1: {f1:.3f}')
            
            # Show sample predictions
            self.stdout.write('\n🧪 Sample Predictions:')
            sample_reviews = reviews[:5]
            for review in sample_reviews:
                if model_type == 'naive_bayes':
                    prediction = service.predict_sentiment_naive_bayes(review.comment)
                elif model_type == 'bert':
                    prediction = service.predict_sentiment_bert(review.comment)
                elif model_type == 'system':
                    prediction = service.predict_sentiment(review.comment)
                
                predicted = prediction.get('sentiment') if isinstance(prediction, dict) else prediction
                confidence = prediction.get('confidence', 'N/A') if isinstance(prediction, dict) else 'N/A'
                
                status = '✅' if predicted == review.sentiment else '❌'
                self.stdout.write(f'{status} "{review.comment[:50]}..." → Predicted: {predicted}, Actual: {review.sentiment}, Conf: {confidence}')
                
        except Exception as e:
            logger.error(f'Evaluation failed: {e}')
            self.stdout.write(self.style.ERROR(f'❌ Evaluation failed: {e}'))
