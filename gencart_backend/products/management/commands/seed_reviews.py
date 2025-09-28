from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from products.models import Product, Review
from orders.models import Order, OrderItem
from users.models import Address
from django.utils import timezone
import random

User = get_user_model()

SAMPLE_COMMENTS = [
    (5, "Tuyệt vời! Sản phẩm vượt mong đợi."),
    (5, "Excellent quality and fast delivery."),
    (4, "Khá tốt, sẽ mua lại."),
    (4, "Good value for money."),
    (3, "Ổn nhưng còn có thể cải thiện."),
    (3, "Average experience, nothing special."),
    (2, "Chưa hài lòng về chất lượng."),
    (2, "Not as described, a bit disappointed."),
    (1, "Rất tệ, không nên mua."),
    (1, "Poor build quality and late delivery."),
]

class Command(BaseCommand):
    help = "Seed random delivered orders and associated reviews for sentiment demo"

    def add_arguments(self, parser):
        parser.add_argument('--users', type=int, default=3, help='Number of users to create (if not enough)')
        parser.add_argument('--reviews', type=int, default=30, help='Approx number of reviews to create')
        parser.add_argument('--clear', action='store_true', help='Clear existing reviews before seeding')

    def handle(self, *args, **options):
        users_needed = options['users']
        target_reviews = options['reviews']
        clear = options['clear']

        if clear:
            self.stdout.write(self.style.WARNING('Clearing existing reviews...'))
            Review.objects.all().delete()

        # Ensure some users exist
        users = list(User.objects.all()[:users_needed])
        while len(users) < users_needed:
            idx = len(users) + 1
            u = User.objects.create_user(
                username=f'seeduser{idx}',
                email=f'seeduser{idx}@example.com',
                password='Pass1234!'
            )
            users.append(u)

        # Ensure each user has at least one address (shipping & billing same)
        for u in users:
            if not Address.objects.filter(user=u).exists():
                Address.objects.create(
                    user=u,
                    address_type='shipping',
                    street_address='123 Test St',
                    apartment_address='',
                    city='City',
                    state='State',
                    country='VN',
                    zip_code='10000',
                    default=True
                )
                Address.objects.create(
                    user=u,
                    address_type='billing',
                    street_address='123 Test St',
                    apartment_address='',
                    city='City',
                    state='State',
                    country='VN',
                    zip_code='10000',
                    default=True
                )

        products = list(Product.objects.all()[:50])
        if not products:
            self.stdout.write(self.style.ERROR('No products found. Run seed_products first.'))
            return

        created_reviews = 0
        random.shuffle(products)

        for product in products:
            if created_reviews >= target_reviews:
                break
            # Pick a random user
            user = random.choice(users)
            # Skip if user already reviewed this product
            if Review.objects.filter(product=product, user=user).exists():
                continue

            # Ensure an order (delivered) exists so review passes business rule
            order = Order.objects.create(
                user=user,
                status='delivered',
                shipping_address=Address.objects.filter(user=user, address_type='shipping').first(),
                billing_address=Address.objects.filter(user=user, address_type='billing').first(),
                total_amount=product.price,
                shipping_cost=0,
                payment_status=True
            )
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=1,
                price=product.price
            )

            rating, comment = random.choice(SAMPLE_COMMENTS)
            title = comment.split('.')[0][:40]

            review = Review.objects.create(
                product=product,
                user=user,
                rating=rating,
                title=title,
                comment=comment,
                verified_purchase=True
            )
            created_reviews += 1

        self.stdout.write(self.style.SUCCESS(f'Seeded {created_reviews} reviews.'))
