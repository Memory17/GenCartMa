from django.conf import settings
from django.db import transaction
from django.db import models
from typing import Dict, List, Optional
import logging

from products.models import Review
from .models import (
    SentimentAnalysisSystem,
    BERTSentimentAnalyzer,
    NaiveBayesSentimentAnalyzer
)

logger = logging.getLogger(__name__)

class SentimentAnalysisService:
    """Service for analyzing sentiment of customer reviews"""
    
    def __init__(self, language='en', model_type='naive_bayes'):
        self.language = language
        self.model_type = model_type
        self._analyzer = None
    
    @property
    def analyzer(self):
        """Lazy loading of sentiment analyzer"""
        if self._analyzer is None:
            self._analyzer = self._get_analyzer()
        return self._analyzer
    
    def _get_analyzer(self):
        """Get the appropriate sentiment analyzer based on configuration"""
        if self.model_type == 'system':
            return SentimentAnalysisSystem(self.language)
        elif self.model_type == 'bert':
            return BERTSentimentAnalyzer(self.language)
        elif self.model_type == 'naive_bayes':
            return NaiveBayesSentimentAnalyzer(self.language)
        else:
            logger.warning(f"Unknown model type: {self.model_type}. Using system.")
            return SentimentAnalysisSystem(self.language)
    
    def analyze_review(self, review_text: str) -> Dict[str, float]:
        """Analyze sentiment of a single review"""
        if not review_text or not review_text.strip():
            return {
                'sentiment': 'neutral',
                'confidence': 0.0,
                'probabilities': {'positive': 0.33, 'negative': 0.33, 'neutral': 0.34}
            }
        
        try:
            result = self.analyzer.predict(review_text)
            logger.info(f"Analyzed review sentiment: {result['sentiment']} (confidence: {result['confidence']:.3f})")
            return result
        except Exception as e:
            logger.error(f"Error analyzing review sentiment: {e}")
            return {
                'sentiment': 'neutral',
                'confidence': 0.0,
                'probabilities': {'positive': 0.33, 'negative': 0.33, 'neutral': 0.34},
                'error': str(e)
            }
    
    def analyze_review_with_title(self, title: str, comment: str) -> Dict[str, float]:
        """Analyze sentiment combining review title and comment"""
        combined_text = f"{title} {comment}".strip()
        return self.analyze_review(combined_text)
    
    def analyze_multiple_reviews(self, review_texts: List[str]) -> List[Dict[str, float]]:
        """Analyze sentiment for multiple reviews"""
        results = []
        for text in review_texts:
            result = self.analyze_review(text)
            results.append(result)
        return results
    
    def update_review_sentiment(self, review_id: int) -> Optional[Dict[str, float]]:
        """Update sentiment analysis for a specific review"""
        try:
            review = Review.objects.get(id=review_id)
            sentiment_result = self.analyze_review_with_title(
                review.title or "", 
                review.comment or ""
            )
            
            # Update review with sentiment data
            review.sentiment = sentiment_result['sentiment']
            review.sentiment_confidence = sentiment_result['confidence']
            review.sentiment_scores = sentiment_result['probabilities']
            review.save()
            
            logger.info(f"Updated sentiment for review {review_id}: {sentiment_result['sentiment']}")
            return sentiment_result
            
        except Review.DoesNotExist:
            logger.error(f"Review {review_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error updating review sentiment: {e}")
            return None
    
    def analyze_all_reviews(self, batch_size: int = 100) -> Dict[str, int]:
        """Analyze sentiment for all reviews in the database"""
        stats = {'processed': 0, 'positive': 0, 'negative': 0, 'neutral': 0, 'errors': 0}
        
        try:
            reviews = Review.objects.filter(sentiment__isnull=True)
            total_reviews = reviews.count()
            
            logger.info(f"Starting sentiment analysis for {total_reviews} reviews")
            
            for i in range(0, total_reviews, batch_size):
                batch = reviews[i:i+batch_size]
                
                with transaction.atomic():
                    for review in batch:
                        try:
                            sentiment_result = self.analyze_review_with_title(
                                review.title or "", 
                                review.comment or ""
                            )
                            
                            review.sentiment = sentiment_result['sentiment']
                            review.sentiment_confidence = sentiment_result['confidence']
                            review.sentiment_scores = sentiment_result['probabilities']
                            review.save()
                            
                            stats['processed'] += 1
                            stats[sentiment_result['sentiment']] += 1
                            
                        except Exception as e:
                            logger.error(f"Error processing review {review.id}: {e}")
                            stats['errors'] += 1
                
                logger.info(f"Processed {min(i+batch_size, total_reviews)}/{total_reviews} reviews")
            
            logger.info(f"Sentiment analysis completed. Stats: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error in batch sentiment analysis: {e}")
            stats['errors'] += 1
            return stats
    
    def get_product_sentiment_summary(self, product_id: int) -> Dict[str, float]:
        """Get sentiment summary for a specific product"""
        try:
            from django.db.models import Count, Avg, Case, When, Value, F, CharField
            base_qs = Review.objects.filter(product_id=product_id)
            analyzed_qs = base_qs.filter(sentiment__isnull=False)

            total_all = base_qs.count()
            analyzed = analyzed_qs.count()
            unanalyzed = total_all - analyzed
            coverage = (analyzed / total_all * 100) if total_all > 0 else 0

            # Analyzed-only counts
            sentiment_counts = {
                'positive': analyzed_qs.filter(sentiment='positive').count(),
                'negative': analyzed_qs.filter(sentiment='negative').count(),
                'neutral': analyzed_qs.filter(sentiment='neutral').count(),
            }
            analyzed_total = max(1, analyzed)  # avoid div-by-zero; if 0, keep 0% below
            sentiment_distribution_percent = {
                k: ((v / analyzed_total) * 100 if analyzed > 0 else 0.0)
                for k, v in sentiment_counts.items()
            }

            # Effective sentiment (fallback to rating)
            eff_sent = Case(
                When(sentiment__isnull=False, then=F('sentiment')),
                When(sentiment__isnull=True, rating__gte=4, then=Value('positive')),
                When(sentiment__isnull=True, rating=3, then=Value('neutral')),
                When(sentiment__isnull=True, rating__lte=2, then=Value('negative')),
                default=Value('neutral'),
                output_field=CharField(),
            )
            eff_counts_qs = base_qs.annotate(eff_sentiment=eff_sent).values('eff_sentiment').annotate(
                count=Count('id')
            )
            effective_counts = {'positive': 0, 'neutral': 0, 'negative': 0}
            for row in eff_counts_qs:
                s = row['eff_sentiment']
                if s in effective_counts:
                    effective_counts[s] = row['count']
            eff_total = max(1, total_all)
            effective_distribution_percent = {
                k: (v / eff_total) * 100 if total_all > 0 else 0.0 for k, v in effective_counts.items()
            }

            # Average confidence from analyzed only
            avg_confidence = analyzed_qs.aggregate(
                avg_conf=Avg('sentiment_confidence')
            )['avg_conf'] or 0.0

            # Overall sentiment decision: use analyzed if coverage >= 50%, else effective
            source_counts = sentiment_counts if coverage >= 50 else effective_counts
            if sum(source_counts.values()) > 0:
                overall_sentiment = max(source_counts, key=source_counts.get)
            else:
                overall_sentiment = 'neutral'

            return {
                'total_reviews': total_all,
                'analyzed_reviews': analyzed,
                'unanalyzed_reviews': unanalyzed,
                'analysis_coverage': coverage,
                'sentiment_counts': sentiment_counts,
                'sentiment_distribution_percent': sentiment_distribution_percent,
                'effective_sentiment_counts': effective_counts,
                'effective_sentiment_distribution_percent': effective_distribution_percent,
                'average_confidence': float(avg_confidence),
                'overall_sentiment': overall_sentiment,
            }
            
        except Exception as e:
            logger.error(f"Error getting product sentiment summary: {e}")
            return {
                'total_reviews': 0,
                'sentiment_distribution': {'positive': 0, 'negative': 0, 'neutral': 0},
                'average_confidence': 0.0,
                'overall_sentiment': 'neutral',
                'error': str(e)
            }


class BilingualSentimentService:
    """Detect language and route to the appropriate analyzer (EN/VI)."""

    def __init__(self, default_model='naive_bayes'):
        self.default_model = default_model
        # Lazy analyzers per language
        self._analyzers = {
            'en': None,
            'vi': None,
        }

    def _detect_language(self, text: str) -> str:
        """Very lightweight language heuristic for vi vs en.
        - If Vietnamese diacritics are present, choose 'vi'.
        - Else default to 'en'.
        """
        if not text:
            return 'en'
        vi_chars = set("àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ")
        if any(ch in vi_chars for ch in text.lower()):
            return 'vi'
        return 'en'

    def _get_analyzer(self, lang: str):
        if self._analyzers.get(lang) is None:
            self._analyzers[lang] = NaiveBayesSentimentAnalyzer(language=lang)
        return self._analyzers[lang]

    def predict(self, text: str) -> Dict[str, float]:
        lang = self._detect_language(text)
        analyzer = self._get_analyzer(lang)
        result = analyzer.predict(text)
        result['language'] = lang
        result['algorithm'] = 'naive_bayes'
        return result

    def train_both_languages(self, en_texts: List[str], en_labels: List[int], vi_texts: List[str], vi_labels: List[int]) -> Dict[str, float]:
        """Train and save models for both EN and VI."""
        stats = {}
        for lang, texts, labels in (
            ('en', en_texts, en_labels),
            ('vi', vi_texts, vi_labels),
        ):
            analyzer = self._get_analyzer(lang)
            acc = analyzer.train(texts, labels)
            analyzer.save_model()
            stats[lang] = acc
        return stats
    
    def get_sentiment_trends(self, days: int = 30) -> Dict[str, List]:
        """Get sentiment trends over time"""
        from django.utils import timezone
        from datetime import timedelta
        from django.db import models
        
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            reviews = Review.objects.filter(
                created_at__gte=start_date,
                sentiment__isnull=False
            ).extra({
                'date': "DATE(created_at)"
            }).values('date', 'sentiment').annotate(
                count=models.Count('id')
            ).order_by('date')
            
            # Organize data by date
            trends = {}
            for review in reviews:
                date_str = str(review['date'])
                if date_str not in trends:
                    trends[date_str] = {'positive': 0, 'negative': 0, 'neutral': 0}
                trends[date_str][review['sentiment']] = review['count']
            
            # Convert to lists for charting
            dates = sorted(trends.keys())
            positive_counts = [trends[date]['positive'] for date in dates]
            negative_counts = [trends[date]['negative'] for date in dates]
            neutral_counts = [trends[date]['neutral'] for date in dates]
            
            return {
                'dates': dates,
                'positive': positive_counts,
                'negative': negative_counts,
                'neutral': neutral_counts
            }
            
        except Exception as e:
            logger.error(f"Error getting sentiment trends: {e}")
            return {
                'dates': [],
                'positive': [],
                'negative': [],
                'neutral': [],
                'error': str(e)
            }
    
    def train_naive_bayes_model(self, texts: List[str], labels: List[str], test_split: float = 0.2) -> tuple:
        """Train Naive Bayes model with provided data"""
        try:
            from sklearn.model_selection import train_test_split
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.naive_bayes import MultinomialNB
            from sklearn.metrics import accuracy_score, classification_report
            from sklearn.pipeline import Pipeline
            import pickle
            import os
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                texts, labels, test_size=test_split, random_state=42
            )
            
            # Create pipeline
            pipeline = Pipeline([
                ('tfidf', TfidfVectorizer(max_features=10000, stop_words='english')),
                ('classifier', MultinomialNB())
            ])
            
            # Train model
            pipeline.fit(X_train, y_train)
            
            # Evaluate
            y_pred = pipeline.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            report = classification_report(y_test, y_pred)
            
            # Save model
            model_dir = os.path.join(settings.BASE_DIR, 'sentiment_models')
            os.makedirs(model_dir, exist_ok=True)
            model_path = os.path.join(model_dir, 'naive_bayes_sentiment.pkl')
            
            with open(model_path, 'wb') as f:
                pickle.dump(pipeline, f)
            
            logger.info(f"Naive Bayes model saved to {model_path}")
            return accuracy, report
            
        except ImportError:
            logger.error("scikit-learn not available for Naive Bayes training")
            raise Exception("scikit-learn not installed")
        except Exception as e:
            logger.error(f"Naive Bayes training failed: {e}")
            raise
    
    def predict_sentiment_naive_bayes(self, text: str) -> Dict[str, float]:
        """Predict sentiment using trained Naive Bayes model"""
        try:
            import pickle
            import os
            
            model_path = os.path.join(settings.BASE_DIR, 'sentiment_models', 'naive_bayes_sentiment.pkl')
            
            if not os.path.exists(model_path):
                # Fall back to analyzer
                return self.analyze_review(text)
            
            with open(model_path, 'rb') as f:
                pipeline = pickle.load(f)
            
            prediction = pipeline.predict([text])[0]
            probabilities = pipeline.predict_proba([text])[0]
            
            # Map to sentiment labels
            sentiment_map = {0: 'negative', 1: 'neutral', 2: 'positive'}
            if hasattr(pipeline.named_steps['classifier'], 'classes_'):
                classes = pipeline.named_steps['classifier'].classes_
                sentiment_scores = dict(zip(classes, probabilities))
            else:
                sentiment_scores = {'negative': probabilities[0], 'neutral': probabilities[1], 'positive': probabilities[2]}
            
            return {
                'sentiment': sentiment_map.get(prediction, prediction),
                'confidence': float(max(probabilities)),
                'probabilities': sentiment_scores
            }
            
        except Exception as e:
            logger.error(f"Naive Bayes prediction failed: {e}")
            return self.analyze_review(text)
    
    def predict_sentiment_bert(self, text: str) -> Dict[str, float]:
        """Predict sentiment using BERT model (falls back to analyzer)"""
        return self.analyzer.predict(text)
    
    def predict_sentiment(self, text: str) -> Dict[str, float]:
        """Predict sentiment using the configured model"""
        return self.analyze_review(text)


class ModelTrainingService:
    """Service for training custom sentiment analysis models"""
    
    def __init__(self, language='en'):
        self.language = language
    
    def prepare_training_data(self) -> tuple:
        """Prepare training data from existing reviews"""
        reviews = Review.objects.filter(
            sentiment__isnull=False,
            rating__isnull=False
        ).values('title', 'comment', 'rating', 'sentiment')
        
        texts = []
        labels = []
        
        for review in reviews:
            # Combine title and comment
            text = f"{review['title'] or ''} {review['comment'] or ''}".strip()
            if text:
                texts.append(text)
                
                # Convert sentiment to numeric label
                sentiment_map = {'negative': 0, 'neutral': 1, 'positive': 2}
                labels.append(sentiment_map.get(review['sentiment'], 1))
        
        return texts, labels
    
    def train_naive_bayes_model(self) -> float:
        """Train a Naive Bayes model on existing review data"""
        texts, labels = self.prepare_training_data()
        
        if len(texts) < 10:
            logger.warning("Not enough training data. Need at least 10 reviews.")
            return 0.0
        
        analyzer = NaiveBayesSentimentAnalyzer(self.language)
        accuracy = analyzer.train(texts, labels)
        analyzer.save_model()
        
        logger.info(f"Naive Bayes model trained with accuracy: {accuracy:.4f}")
        return accuracy


# Utility functions for easy access
def analyze_review_sentiment(review_text: str, language='en', model_type='naive_bayes') -> Dict[str, float]:
    """Quick function to analyze a single review sentiment"""
    service = SentimentAnalysisService(language, model_type)
    return service.analyze_review(review_text)

def update_all_review_sentiments(language='en', model_type='naive_bayes') -> Dict[str, int]:
    """Quick function to update all review sentiments"""
    service = SentimentAnalysisService(language, model_type)
    return service.analyze_all_reviews()

def get_product_sentiment(product_id: int) -> Dict[str, float]:
    """Quick function to get product sentiment summary"""
    service = SentimentAnalysisService()
    return service.get_product_sentiment_summary(product_id) 