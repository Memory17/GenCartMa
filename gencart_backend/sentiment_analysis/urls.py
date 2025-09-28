from django.urls import path
from . import views

app_name = 'sentiment_analysis'

urlpatterns = [
    # Sentiment Analysis Endpoints
    path('analyze/', views.analyze_single_review, name='analyze_single_review'),
    path('analyze/review/<int:review_id>/', views.analyze_review_by_id, name='analyze_review_by_id'),
    path('analyze/all/', views.analyze_all_reviews, name='analyze_all_reviews'),
    
    # Product Sentiment Summary
    path('product/<int:product_id>/sentiment/', views.get_product_sentiment_summary, name='product_sentiment_summary'),
    
    # Sentiment Statistics and Trends
    path('statistics/', views.get_sentiment_statistics, name='sentiment_statistics'),
    path('trends/', views.get_sentiment_trends, name='sentiment_trends'),
    
    # Model Training (Admin only)
    path('train/', views.train_models, name='train_models'),
    
    # Real-time Analysis
    path('realtime/', views.RealTimeSentimentView.as_view(), name='realtime_sentiment'),
    
    # Webhooks
    path('webhook/review/', views.review_sentiment_webhook, name='review_sentiment_webhook'),
] 