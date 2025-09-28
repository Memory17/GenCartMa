from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
import json
import logging

from products.models import Review, Product
from .services import (
    SentimentAnalysisService,
    ModelTrainingService,
    analyze_review_sentiment,
    update_all_review_sentiments,
    get_product_sentiment
)

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_single_review(request):
    """Analyze sentiment of a single review text"""
    try:
        data = request.data
        review_text = data.get('text', '')
        language = data.get('language', 'en')
        model_type = data.get('model_type', 'naive_bayes')
        
        if not review_text.strip():
            return Response(
                {'error': 'Review text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Analyze sentiment
        result = analyze_review_sentiment(review_text, language, model_type)
        
        return Response({
            'success': True,
            'data': result
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in analyze_single_review: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_review_by_id(request, review_id):
    """Analyze sentiment of a specific review by ID"""
    try:
        review = Review.objects.get(id=review_id)
        
        # Check if user owns the review or is admin
        if review.user != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        language = request.data.get('language', 'en')
        model_type = request.data.get('model_type', 'naive_bayes')
        
        service = SentimentAnalysisService(language, model_type)
        result = service.update_review_sentiment(review_id)
        
        if result:
            return Response({
                'success': True,
                'data': result,
                'review_id': review_id
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Failed to analyze review sentiment'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Review.DoesNotExist:
        return Response(
            {'error': 'Review not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error in analyze_review_by_id: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_product_sentiment_summary(request, product_id):
    """Get sentiment summary for a specific product"""
    try:
        product = Product.objects.get(id=product_id)
        summary = get_product_sentiment(product_id)
        
        return Response({
            'success': True,
            'data': summary,
            'product': {
                'id': product.id,
                'name': product.name
            }
        }, status=status.HTTP_200_OK)
        
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error in get_product_sentiment_summary: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAdminUser])
def analyze_all_reviews(request):
    """Analyze sentiment for all reviews (Admin only)"""
    try:
        language = request.data.get('language', 'en')
        model_type = request.data.get('model_type', 'naive_bayes')
        batch_size = request.data.get('batch_size', 100)
        
        # Run sentiment analysis on all reviews
        stats = update_all_review_sentiments(language, model_type)
        
        return Response({
            'success': True,
            'message': 'Sentiment analysis completed for all reviews',
            'stats': stats
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in analyze_all_reviews: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_sentiment_trends(request):
    """Get sentiment trends over time (Admin only)"""
    try:
        days = int(request.GET.get('days', 30))
        language = request.GET.get('language', 'en')
        product_id = request.GET.get('product_id')
        mode = request.GET.get('mode', 'analyzed')  # 'analyzed' | 'effective'
        
        from django.utils import timezone
        from datetime import timedelta
        from django.db import models
        from django.db.models import Case, When, Value, F, CharField
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        base_qs = Review.objects.filter(created_at__gte=start_date)
        if product_id:
            try:
                base_qs = base_qs.filter(product_id=int(product_id))
            except ValueError:
                pass

        try:
            if mode == 'effective':
                eff_sent = Case(
                    When(sentiment__isnull=False, then=F('sentiment')),
                    When(sentiment__isnull=True, rating__gte=4, then=Value('positive')),
                    When(sentiment__isnull=True, rating=3, then=Value('neutral')),
                    When(sentiment__isnull=True, rating__lte=2, then=Value('negative')),
                    default=Value('neutral'),
                    output_field=CharField(),
                )
                reviews = (
                    base_qs
                    .extra({"date": "DATE(created_at)"})
                    .annotate(eff_sentiment=eff_sent)
                    .values("date", "eff_sentiment")
                    .annotate(count=models.Count("id"))
                    .order_by("date")
                )
                temp = {}
                for r in reviews:
                    d = str(r["date"])
                    if d not in temp:
                        temp[d] = {"positive": 0, "negative": 0, "neutral": 0}
                    temp[d][r["eff_sentiment"]] = r["count"]
            else:
                analyzed = base_qs.filter(sentiment__isnull=False)
                reviews = (
                    analyzed
                    .extra({"date": "DATE(created_at)"})
                    .values("date", "sentiment")
                    .annotate(count=models.Count("id"))
                    .order_by("date")
                )
                temp = {}
                for r in reviews:
                    d = str(r["date"])
                    if d not in temp:
                        temp[d] = {"positive": 0, "negative": 0, "neutral": 0}
                    temp[d][r["sentiment"]] = r["count"]

            dates = sorted(temp.keys())
            trends = {
                "dates": dates,
                "positive": [temp[d]["positive"] for d in dates],
                "negative": [temp[d]["negative"] for d in dates],
                "neutral": [temp[d]["neutral"] for d in dates],
            }
        except Exception as inner_e:
            logger.error(f"Error computing sentiment trends: {inner_e}")
        
        return Response({
            'success': True,
            'data': trends
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in get_sentiment_trends: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAdminUser])
def train_models(request):
    """Train custom sentiment analysis models (Admin only)"""
    try:
        language = request.data.get('language', 'en')
        model_types = request.data.get('models', ['naive_bayes'])
        epochs = request.data.get('epochs', 10)
        
        training_service = ModelTrainingService(language)
        results = {}
        
        if 'naive_bayes' in model_types:
            accuracy = training_service.train_naive_bayes_model()
            results['naive_bayes'] = {
                'accuracy': accuracy,
                'status': 'success' if accuracy > 0 else 'failed'
            }
        
        return Response({
            'success': True,
            'message': 'Model training completed',
            'results': results
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in train_models: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_sentiment_statistics(request):
    """Get overall sentiment statistics"""
    try:
        from django.db.models import Count
        product_id = request.GET.get('product_id')
        
        # Base queryset (optionally filtered by product)
        base_qs = Review.objects.all()
        if product_id:
            try:
                base_qs = base_qs.filter(product_id=int(product_id))
            except ValueError:
                pass
        
        # Total statistics
        total_reviews = base_qs.count()
        analyzed_reviews = base_qs.filter(sentiment__isnull=False).count()
        unanalyzed_reviews = total_reviews - analyzed_reviews
        
        # Simple sentiment distribution from analyzed reviews
        sentiment_distribution = base_qs.filter(sentiment__isnull=False).values('sentiment').annotate(
            count=Count('id')
        )
        
        # Convert to simple format
        sentiment_counts = {'positive': 0, 'negative': 0, 'neutral': 0}
        for item in sentiment_distribution:
            sentiment_counts[item['sentiment']] = item['count']
        
        return Response({
            'success': True,
            'total_reviews': total_reviews,
            'analyzed_reviews': analyzed_reviews,
            'unanalyzed_reviews': unanalyzed_reviews,
            'sentiment_counts': sentiment_counts
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in get_sentiment_statistics: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# Real-time sentiment analysis for new reviews
@method_decorator(csrf_exempt, name='dispatch')
class RealTimeSentimentView(View):
    """Real-time sentiment analysis for new review submission"""
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            title = data.get('title', '')
            comment = data.get('comment', '')
            language = data.get('language', 'en')
            
            combined_text = f"{title} {comment}".strip()
            
            if not combined_text:
                return JsonResponse(
                    {'error': 'Review text is required'}, 
                    status=400
                )
            
            # Analyze sentiment
            result = analyze_review_sentiment(combined_text, language, 'naive_bayes')
            
            return JsonResponse({
                'success': True,
                'sentiment': result['sentiment'],
                'confidence': result['confidence'],
                'probabilities': result['probabilities'],
                'emoji': {
                    'positive': '😊',
                    'negative': '😞',
                    'neutral': '😐'
                }.get(result['sentiment'], '❓'),
                'color': {
                    'positive': '#52c41a',
                    'negative': '#ff4d4f',
                    'neutral': '#faad14'
                }.get(result['sentiment'], '#d9d9d9')
            })
            
        except Exception as e:
            logger.error(f"Error in RealTimeSentimentView: {e}")
            return JsonResponse(
                {'error': str(e)}, 
                status=500
            )

# Webhook for automatic sentiment analysis on review creation
@api_view(['POST'])
def review_sentiment_webhook(request):
    """Webhook to automatically analyze sentiment when a review is created"""
    try:
        review_id = request.data.get('review_id')
        
        if not review_id:
            return Response(
                {'error': 'review_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Analyze sentiment for the review
        service = SentimentAnalysisService()
        result = service.update_review_sentiment(review_id)
        
        if result:
            return Response({
                'success': True,
                'message': 'Review sentiment analyzed successfully',
                'data': result
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Failed to analyze review sentiment'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f"Error in review_sentiment_webhook: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        ) 