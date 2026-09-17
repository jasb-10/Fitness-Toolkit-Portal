# Fitness Comeback Campaign Builder

This project contains the sellable first version of the $27 Fitness Comeback product.

## Customer journey

1. The customer buys in GoHighLevel.
2. A GHL webhook grants access using the purchase email.
3. The customer creates an account or signs in.
4. They complete a five-step business profile, including audience, offer and writing style.
5. They choose one of 15 campaign frames or describe a custom campaign.
6. The app creates one personalised email and SMS campaign.
7. They edit individual messages or request up to ten campaign-wide revisions.
8. They copy the approved messages into the sending platform they already use.

The app does not send messages. This keeps the first version simple and avoids asking customers to connect email, SMS or social accounts.

## Routes

- `/preview` is a public, browser-saved demonstration.
- `/comeback` is the signed-in product with database persistence and live generation.

## Included

- Five-stage business profile
- Optional pasted writing examples or `.txt` / `.md` upload
- Fifteen campaign frames and a custom campaign brief
- One generated campaign per customer
- Personalised audience, offer and sending schedule recommendations
- Five to seven editable email and SMS messages
- Campaign-wide revisions with a ten-revision limit
- Save, copy and launch-checklist tools
- Locked placeholders for future products
- GHL purchase, refund and chargeback entitlement webhook
- Secure account ownership and database persistence

## Replit setup

Add these secrets in Replit:

- `DATABASE_URL`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `GHL_WEBHOOK_SECRET`
- `PORTAL_OWNER_EMAIL`
- `COMEBACK_REQUIRE_ENTITLEMENT=true`
- Optional: `OPENAI_CAMPAIGN_MODEL` (defaults to `gpt-5.2`)

Create the new tables by running the existing database push command in Replit, or apply `lib/db/COMEBACK_SCHEMA.sql` to the PostgreSQL database.

## GHL webhook

Send a `POST` request to `/api/webhooks/ghl/comeback-purchase` with the header:

`x-comeback-webhook-secret: YOUR_SECRET`

Purchase body:

```json
{
  "email": "buyer@example.com",
  "orderId": "unique-ghl-order-id",
  "event": "purchase",
  "productCode": "fitness-comeback-core"
}
```

Use `refund` or `chargeback` as the event to revoke access. If the buyer has not created an account yet, access is held against their email and claimed automatically when they first sign in.

## Before taking payments

Test one purchase, one new-account sign-in, one campaign generation, one revision and one refund using a staging checkout. Add privacy terms telling customers not to upload sensitive client health or payment information.
