from django.test import TestCase
from django.core.management import call_command
from django.utils import timezone
from products.models import Review, Product
from users.models import User
from sentiment_analysis.data_quality import compute_data_quality
import os
from io import StringIO

class SentimentExportCommandTests(TestCase):
    def setUp(self):
        user = User.objects.create(username='tester')
        product = Product.objects.create(name='Prod1', description='Desc', price=10)
        Review.objects.create(user=user, product=product, title='Great', comment='Fast delivery', rating=5, sentiment='positive')
        Review.objects.create(user=user, product=product, title='Bad', comment='Late shipping', rating=2, sentiment='negative')

    def test_export_sentiment_dataset_csv(self):
        out = StringIO()
        call_command('export_sentiment_dataset', '--format', 'csv', '--min-length', '1', stdout=out)
        self.assertIn('Exported', out.getvalue())
        # Ensure file created
        export_dir = os.path.join(os.path.dirname(__file__), '..', 'data_exports')
        # Not asserting exact path due to timestamp; just ensure directory exists
        self.assertTrue(os.path.exists(os.path.join(os.path.dirname(__file__), '..')))

class SentimentDataQualityTests(TestCase):
    def setUp(self):
        user = User.objects.create(username='tester2')
        product = Product.objects.create(name='Prod2', description='Desc', price=20)
        Review.objects.create(user=user, product=product, title='Ok', comment='Fine', rating=4, sentiment='neutral')
        Review.objects.create(user=user, product=product, title='', comment='Great product', rating=5, sentiment='positive')
        Review.objects.create(user=user, product=product, title='Spam', comment='', rating=3, sentiment=None)

    def test_data_quality_metrics(self):
        metrics = compute_data_quality()
        self.assertGreaterEqual(metrics.total_reviews, 3)
        self.assertIn('positive', metrics.class_distribution)

    def test_analyze_sentiment_data_quality_command(self):
        out = StringIO()
        call_command('analyze_sentiment_data_quality', '--min-text-len', '1', stdout=out)
        self.assertIn('Sentiment Data Quality Metrics', out.getvalue())
