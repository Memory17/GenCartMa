# Generated manually for adding primary_image field
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('products', '0006_remove_product_image_alter_review_sentiment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='primary_image',
            field=models.URLField(blank=True, null=True, help_text='Primary product image (CDN URL)'),
        ),
    ]
