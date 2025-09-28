from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from sentiment_analysis.services import SentimentAnalysisService, ModelTrainingService
from products.models import Review
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Analyze sentiment for customer reviews'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Analyze all reviews without sentiment data',
        )
        parser.add_argument(
            '--review-id',
            type=int,
            help='Analyze sentiment for a specific review ID',
        )
        parser.add_argument(
            '--product-id',
            type=int,
            help='Analyze sentiment for all reviews of a specific product',
        )
        parser.add_argument(
            '--model',
            type=str,
            default='naive_bayes',
            choices=['naive_bayes', 'bert', 'system'],
            help='Model to use for sentiment analysis',
        )
        parser.add_argument(
            '--language',
            type=str,
            default='en',
            choices=['en', 'vi'],
            help='Language for sentiment analysis',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Batch size for processing reviews',
        )
        parser.add_argument(
            '--train',
            action='store_true',
            help='Train custom models before analysis',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-analysis of reviews that already have sentiment data',
        )

    def handle(self, *args, **options):
        start_time = timezone.now()
        self.stdout.write(
            self.style.SUCCESS(f'Starting sentiment analysis at {start_time}')
        )

        # Initialize the sentiment analysis service
        service = SentimentAnalysisService(
            language=options['language'],
            model_type=options['model']
        )

        try:
            # Train models if requested
            if options['train']:
                self.stdout.write('Training custom models...')
                training_service = ModelTrainingService(options['language'])
                
                if options['model'] in ['naive_bayes', 'system']:
                    accuracy = training_service.train_naive_bayes_model()
                    self.stdout.write(
                        self.style.SUCCESS(f'Naive Bayes model trained with accuracy: {accuracy:.4f}')
                    )

            # Analyze specific review
            if options['review_id']:
                self.stdout.write(f'Analyzing review {options["review_id"]}...')
                result = service.update_review_sentiment(options['review_id'])
                if result:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Review {options["review_id"]} sentiment: {result["sentiment"]} '
                            f'(confidence: {result["confidence"]:.3f})'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f'Failed to analyze review {options["review_id"]}')
                    )

            # Analyze reviews for specific product
            elif options['product_id']:
                self.stdout.write(f'Analyzing reviews for product {options["product_id"]}...')
                
                filters = {'product_id': options['product_id']}
                if not options['force']:
                    filters['sentiment__isnull'] = True
                
                reviews = Review.objects.filter(**filters)
                total_reviews = reviews.count()
                
                if total_reviews == 0:
                    self.stdout.write(
                        self.style.WARNING('No reviews found for analysis')
                    )
                    return

                processed = 0
                errors = 0
                
                for review in reviews:
                    try:
                        result = service.update_review_sentiment(review.id)
                        if result:
                            processed += 1
                            if processed % 10 == 0:
                                self.stdout.write(f'Processed {processed}/{total_reviews} reviews')
                        else:
                            errors += 1
                    except Exception as e:
                        logger.error(f'Error processing review {review.id}: {e}')
                        errors += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f'Completed analysis for product {options["product_id"]}: '
                        f'{processed} processed, {errors} errors'
                    )
                )

            # Analyze all reviews
            elif options['all']:
                self.stdout.write('Analyzing all reviews...')
                
                # Get count of reviews to analyze
                filters = {}
                if not options['force']:
                    filters['sentiment__isnull'] = True
                
                total_reviews = Review.objects.filter(**filters).count()
                
                if total_reviews == 0:
                    self.stdout.write(
                        self.style.WARNING('No reviews found for analysis')
                    )
                    return

                self.stdout.write(f'Found {total_reviews} reviews to analyze')
                
                # Run batch analysis
                stats = service.analyze_all_reviews(batch_size=options['batch_size'])
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Analysis completed:\n'
                        f'  Processed: {stats["processed"]}\n'
                        f'  Positive: {stats["positive"]}\n'
                        f'  Negative: {stats["negative"]}\n'
                        f'  Neutral: {stats["neutral"]}\n'
                        f'  Errors: {stats["errors"]}'
                    )
                )

            else:
                self.stdout.write(
                    self.style.ERROR(
                        'Please specify --all, --review-id, or --product-id'
                    )
                )
                return

            # Show summary
            end_time = timezone.now()
            duration = end_time - start_time
            self.stdout.write(
                self.style.SUCCESS(
                    f'Sentiment analysis completed in {duration.total_seconds():.2f} seconds'
                )
            )

            # Show overall statistics
            self.show_statistics()

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during sentiment analysis: {e}')
            )
            raise CommandError(f'Sentiment analysis failed: {e}')

    def show_statistics(self):
        """Show overall sentiment statistics"""
        from django.db.models import Count
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write('SENTIMENT ANALYSIS STATISTICS')
        self.stdout.write('='*50)
        
        total_reviews = Review.objects.count()
        analyzed_reviews = Review.objects.filter(sentiment__isnull=False).count()
        
        self.stdout.write(f'Total reviews: {total_reviews}')
        self.stdout.write(f'Analyzed reviews: {analyzed_reviews}')
        
        if total_reviews > 0:
            coverage = (analyzed_reviews / total_reviews) * 100
            self.stdout.write(f'Analysis coverage: {coverage:.1f}%')
        
        if analyzed_reviews > 0:
            sentiment_stats = Review.objects.filter(
                sentiment__isnull=False
            ).values('sentiment').annotate(
                count=Count('id')
            )
            
            self.stdout.write('\nSentiment Distribution:')
            for stat in sentiment_stats:
                percentage = (stat['count'] / analyzed_reviews) * 100
                self.stdout.write(
                    f'  {stat["sentiment"].title()}: {stat["count"]} ({percentage:.1f}%)'
                )
        
        self.stdout.write('='*50) 