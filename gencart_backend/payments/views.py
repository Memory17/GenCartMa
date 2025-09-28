import stripe
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from orders.models import Order
from .models import Payment, StripePayment
from .serializers import PaymentSerializer, PaymentCreateSerializer

# Configure Stripe API key
stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Payment model
    """
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Payment.objects.all()
        return Payment.objects.filter(user=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        return PaymentSerializer

    @action(detail=False, methods=['post'])
    def create_payment_intent(self, request):
        """
        Create a Stripe payment intent
        """
        order_id = request.data.get('order_id')
        if not order_id:
            return Response(
                {"detail": "Order ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if payment already exists for this order
        if hasattr(order, 'payment'):
            return Response(
                {"detail": "Payment already exists for this order."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create a payment intent with Stripe
        try:
            amount = int(order.final_total * 100)  # Convert to cents

            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency='usd',
                metadata={
                    'order_id': order.id,
                    'user_id': request.user.id
                }
            )

            # Create a payment record
            payment = Payment.objects.create(
                user=request.user,
                order=order,
                payment_method='stripe',
                amount=order.final_total,
                status='pending',
                transaction_id=payment_intent.id
            )

            # Create a Stripe payment record
            StripePayment.objects.create(
                payment=payment,
                stripe_charge_id='',  # Will be updated after payment is completed
                stripe_payment_intent_id=payment_intent.id
            )

            return Response({
                'client_secret': payment_intent.client_secret,
                'payment_id': payment.id
            })

        except stripe.error.StripeError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def confirm_payment(self, request, pk=None):
        """
        Confirm a payment after Stripe payment is completed
        """
        payment = self.get_object()

        if payment.status != 'pending':
            return Response(
                {"detail": "Payment is not in pending status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update payment status
        payment.status = 'completed'
        payment.save()

        # Update order payment status
        order = payment.order
        order.payment_status = True
        order.save()

        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel_payment(self, request, pk=None):
        """
        Cancel a payment
        """
        payment = self.get_object()

        if payment.status != 'pending':
            return Response(
                {"detail": "Only pending payments can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update payment status
        payment.status = 'failed'
        payment.save()

        serializer = self.get_serializer(payment)
        return Response(serializer.data)
