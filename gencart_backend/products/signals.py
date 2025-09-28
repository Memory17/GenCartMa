from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Review
from sentiment_analysis.services import SentimentAnalysisService
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Review)
def analyze_review_sentiment_signal(sender, instance: Review, created, **kwargs):
    """Automatically analyze sentiment when a new review is created."""
    if created and not instance.sentiment:
        try:
            # Use configured default (now naive_bayes) or explicit system aggregator
            service = SentimentAnalysisService(model_type='naive_bayes')
            result = service.analyze_review_with_title(instance.title or '', instance.comment or '')
            instance.sentiment = result.get('sentiment')
            instance.sentiment_confidence = result.get('confidence')
            instance.sentiment_scores = result.get('probabilities')
            instance.save(update_fields=['sentiment','sentiment_confidence','sentiment_scores','sentiment_analyzed_at','updated_at'])
            logger.info(f"Sentiment analyzed for review {instance.id}: {instance.sentiment}")
        except Exception as e:
            logger.error(f"Sentiment analysis failed for review {instance.id}: {e}")
