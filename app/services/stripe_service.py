"""
PrepVista AI — Stripe Billing Service
Handles checkout sessions, webhook processing, and subscription sync.
"""

import json
import stripe
import structlog
from fastapi import HTTPException

from app.config import get_settings
from app.database.connection import DatabaseConnection

logger = structlog.get_logger("prepvista.stripe")


def _init_stripe():
    """Initialize Stripe with API key."""
    stripe.api_key = get_settings().STRIPE_SECRET_KEY


async def create_checkout_session(user_id: str, user_email: str, plan: str) -> str:
    """Create a Stripe Checkout session for subscription."""
    _init_stripe()
    settings = get_settings()

    price_map = {
        "pro": settings.STRIPE_PRO_PRICE_ID,
        "career": settings.STRIPE_CAREER_PRICE_ID,
    }

    price_id = price_map.get(plan)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Invalid plan for billing: {plan}")

    # Get or create Stripe customer
    async with DatabaseConnection() as conn:
        row = await conn.fetchrow(
            "SELECT stripe_customer_id FROM profiles WHERE id = $1", user_id
        )
        customer_id = row["stripe_customer_id"] if row else None

    if not customer_id:
        customer = stripe.Customer.create(
            email=user_email,
            metadata={"prepvista_user_id": user_id},
        )
        customer_id = customer.id
        async with DatabaseConnection() as conn:
            await conn.execute(
                "UPDATE profiles SET stripe_customer_id = $1 WHERE id = $2",
                customer_id, user_id,
            )

    # Create checkout session
    checkout = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.FRONTEND_URL}/dashboard?billing=success",
        cancel_url=f"{settings.FRONTEND_URL}/pricing?billing=canceled",
        metadata={"prepvista_user_id": user_id, "plan": plan},
    )

    return checkout.url


async def create_billing_portal_session(user_id: str) -> str:
    """Create a Stripe billing portal session for subscription management."""
    _init_stripe()
    settings = get_settings()

    async with DatabaseConnection() as conn:
        row = await conn.fetchrow(
            "SELECT stripe_customer_id FROM profiles WHERE id = $1", user_id
        )

    if not row or not row["stripe_customer_id"]:
        raise HTTPException(status_code=400, detail="No billing information found. Please subscribe first.")

    portal = stripe.billing_portal.Session.create(
        customer=row["stripe_customer_id"],
        return_url=f"{settings.FRONTEND_URL}/settings",
    )

    return portal.url


async def handle_webhook_event(payload: bytes, signature: str):
    """Process incoming Stripe webhook event."""
    _init_stripe()
    settings = get_settings()

    try:
        event = stripe.Webhook.construct_event(
            payload, signature, settings.STRIPE_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    event_type = event["type"]
    data = event["data"]["object"]

    logger.info("stripe_webhook_received", event_type=event_type, event_id=event["id"])

    # Log billing event
    async with DatabaseConnection() as conn:
        await conn.execute(
            """INSERT INTO billing_events (stripe_event_id, event_type, payload)
               VALUES ($1, $2, $3) ON CONFLICT (stripe_event_id) DO NOTHING""",
            event["id"], event_type, json.dumps(event["data"]),
        )

    # Handle subscription events
    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(data)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(data)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(data)
    elif event_type == "invoice.payment_succeeded":
        await _handle_invoice_paid(data)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(data)


async def _handle_checkout_completed(data: dict):
    """Process successful checkout — activate subscription."""
    customer_id = data.get("customer")
    subscription_id = data.get("subscription")
    plan = data.get("metadata", {}).get("plan", "pro")
    user_id = data.get("metadata", {}).get("prepvista_user_id")

    if user_id:
        async with DatabaseConnection() as conn:
            await conn.execute(
                """UPDATE profiles
                   SET plan = $1, stripe_subscription_id = $2,
                       subscription_status = 'active', interviews_used_this_period = 0,
                       period_start = NOW(), updated_at = NOW()
                   WHERE id = $3""",
                plan, subscription_id, user_id,
            )
        logger.info("subscription_activated", user_id=user_id, plan=plan)
    elif customer_id:
        async with DatabaseConnection() as conn:
            await conn.execute(
                """UPDATE profiles
                   SET plan = $1, stripe_subscription_id = $2,
                       subscription_status = 'active', interviews_used_this_period = 0,
                       period_start = NOW(), updated_at = NOW()
                   WHERE stripe_customer_id = $3""",
                plan, subscription_id, customer_id,
            )


async def _handle_subscription_updated(data: dict):
    """Handle subscription changes (upgrade, downgrade, status changes)."""
    customer_id = data.get("customer")
    status = data.get("status", "active")

    # Map Stripe status to our status
    status_map = {
        "active": "active",
        "past_due": "past_due",
        "canceled": "canceled",
        "trialing": "trialing",
        "incomplete": "none",
        "unpaid": "past_due",
    }
    mapped_status = status_map.get(status, "none")

    async with DatabaseConnection() as conn:
        await conn.execute(
            """UPDATE profiles SET subscription_status = $1, updated_at = NOW()
               WHERE stripe_customer_id = $2""",
            mapped_status, customer_id,
        )
    logger.info("subscription_updated", customer_id=customer_id, status=mapped_status)


async def _handle_subscription_deleted(data: dict):
    """Handle subscription cancellation — downgrade to free."""
    customer_id = data.get("customer")
    async with DatabaseConnection() as conn:
        await conn.execute(
            """UPDATE profiles
               SET plan = 'free', subscription_status = 'canceled',
                   stripe_subscription_id = NULL, updated_at = NOW()
               WHERE stripe_customer_id = $1""",
            customer_id,
        )
    logger.info("subscription_canceled", customer_id=customer_id)


async def _handle_invoice_paid(data: dict):
    """Handle successful invoice payment — reset billing period."""
    customer_id = data.get("customer")
    async with DatabaseConnection() as conn:
        await conn.execute(
            """UPDATE profiles
               SET interviews_used_this_period = 0, period_start = NOW(), updated_at = NOW()
               WHERE stripe_customer_id = $1""",
            customer_id,
        )
    logger.info("invoice_paid_quota_reset", customer_id=customer_id)


async def _handle_payment_failed(data: dict):
    """Handle failed payment."""
    customer_id = data.get("customer")
    async with DatabaseConnection() as conn:
        await conn.execute(
            """UPDATE profiles SET subscription_status = 'past_due', updated_at = NOW()
               WHERE stripe_customer_id = $1""",
            customer_id,
        )
    logger.warning("payment_failed", customer_id=customer_id)
