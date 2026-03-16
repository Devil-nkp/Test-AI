"""
PrepVista AI — Billing Router
Stripe checkout, portal, and webhook endpoints.
"""

import structlog
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel

from app.dependencies import get_current_user, UserProfile
from app.services.stripe_service import (
    create_checkout_session,
    create_billing_portal_session,
    handle_webhook_event,
)

router = APIRouter()
logger = structlog.get_logger("prepvista.billing")


class CheckoutRequest(BaseModel):
    plan: str  # "pro" or "career"


@router.post("/checkout")
async def create_checkout(
    req: CheckoutRequest,
    user: UserProfile = Depends(get_current_user),
):
    """Create a Stripe checkout session for subscription."""
    if req.plan not in ("pro", "career"):
        raise HTTPException(status_code=400, detail="Invalid plan. Choose 'pro' or 'career'.")

    if user.plan == req.plan and user.subscription_status == "active":
        raise HTTPException(status_code=400, detail=f"You're already on the {req.plan.title()} plan.")

    checkout_url = await create_checkout_session(user.id, user.email, req.plan)
    return {"checkout_url": checkout_url}


@router.post("/portal")
async def billing_portal(user: UserProfile = Depends(get_current_user)):
    """Create a Stripe billing portal session for subscription management."""
    portal_url = await create_billing_portal_session(user.id)
    return {"portal_url": portal_url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle incoming Stripe webhook events."""
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature.")

    await handle_webhook_event(payload, signature)
    return {"received": True}
