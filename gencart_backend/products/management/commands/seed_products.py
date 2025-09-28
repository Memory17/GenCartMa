from django.core.management.base import BaseCommand
from django.utils.text import slugify
from products.models import Category, Product
from decimal import Decimal
import random

CATEGORIES = [
    ("Electronics", "Devices and gadgets"),
    ("Clothing", "Apparel and accessories"),
    ("Home & Kitchen", "Household and kitchenware"),
    ("Books", "Printed and digital books"),
    ("Sports & Outdoors", "Sporting goods"),
    ("Phone & Accessories", "Smartphones and accessories"),
]

PRODUCT_TEMPLATES = [
    ("Wireless Headphones", "High-fidelity wireless over-ear headphones with noise cancellation."),
    ("Smartwatch", "Water-resistant smartwatch with heart rate and sleep tracking."),
    ("4K Monitor", "27-inch 4K UHD monitor with HDR and ultra-thin bezels."),
    ("Mechanical Keyboard", "RGB backlit mechanical keyboard with blue switches."),
    ("Ergonomic Office Chair", "Adjustable lumbar support and breathable mesh design."),
    ("Stainless Steel Cookware Set", "10-piece set with non-stick coating and heat-resistant handles."),
    ("Air Fryer", "Low-oil cooking air fryer with digital controls."),
    ("Yoga Mat", "Non-slip eco-friendly yoga mat with 6mm cushioning."),
    ("Running Shoes", "Lightweight running shoes with breathable upper."),
    ("Travel Backpack", "Water-resistant backpack with USB charging port and laptop compartment."),
    ("Bluetooth Speaker", "Portable speaker with deep bass and 12-hour battery life."),
    ("Smartphone Gimbal", "3-axis handheld stabilizer for smooth video recording."),
    ("LED Desk Lamp", "Dimmable LED desk lamp with wireless charging base."),
    ("Portable SSD 1TB", "High-speed USB-C portable solid state drive."),
    ("USB-C Hub", "7-in-1 hub with HDMI, USB 3.0, and SD card reader."),
    ("Noise Blocking Earplugs", "Reusable silicone earplugs for sleep and travel."),
    ("Graphic Novel", "Special edition full-color graphic novel."),
    ("Cookbook", "Healthy meal recipes for busy professionals."),
    ("Hiking Tent", "2-person lightweight waterproof hiking tent."),
    ("Camping Stove", "Portable gas stove ideal for outdoor cooking."),
    ("Fitness Tracker Band", "Slim fitness tracker with step counter and notifications."),
    ("Smart Light Bulb", "Wi-Fi enabled multicolor smart LED bulb."),
    ("Phone Tripod", "Adjustable tripod stand with Bluetooth remote."),
    ("Leather Wallet", "Minimalist RFID-blocking genuine leather wallet."),
]

class Command(BaseCommand):
    help = "Seed the database with sample categories and products"

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=80, help='Approximate number of products to create')
        parser.add_argument('--clear', action='store_true', help='Clear existing products before seeding')

    def handle(self, *args, **options):
        count = options['count']
        clear = options['clear']

        if clear:
            self.stdout.write(self.style.WARNING('Clearing existing products...'))
            Product.objects.all().delete()

        # Ensure categories exist
        category_objs = {}
        for name, desc in CATEGORIES:
            cat, _ = Category.objects.get_or_create(name=name, defaults={'slug': slugify(name), 'description': desc})
            category_objs[name] = cat

        created = 0
        self.stdout.write('Creating products...')

        while created < count:
            for base_name, base_desc in PRODUCT_TEMPLATES:
                if created >= count:
                    break
                category = random.choice(list(category_objs.values()))
                unique_suffix = created + 1
                name = f"{base_name} {unique_suffix}" if created % 3 == 0 else base_name
                slug = slugify(f"{name}-{unique_suffix}")
                price = Decimal(random.randrange(1000, 50000)) / 100  # 10.00 to 500.00
                discount_price = None
                if random.random() < 0.45:  # 45% chance of discount
                    discount_price = price * Decimal(random.uniform(0.6, 0.9))
                    discount_price = discount_price.quantize(Decimal('0.01'))
                inventory = random.randint(0, 120)

                if Product.objects.filter(slug=slug).exists():
                    continue

                Product.objects.create(
                    name=name,
                    slug=slug,
                    description=base_desc,
                    price=price,
                    discount_price=discount_price,
                    category=category,
                    inventory=inventory,
                    is_active=True,
                )
                created += 1
        self.stdout.write(self.style.SUCCESS(f'Seeded {created} products.'))
