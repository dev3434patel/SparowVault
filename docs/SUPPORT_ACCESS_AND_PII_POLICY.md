# Support Access and PII Protection Policy

Status: Phase 15 baseline

## Support Access Rules

- Support access to user financial data is denied by default.
- A support agent may view user data only with one of these bases:
  - explicit user consent for a specific support ticket
  - admin-approved security or billing investigation reason
  - legally required investigation documented by the operator
- Access must be time-limited. Default window: 24 hours.
- Every support access must write an audit record containing:
  - support/admin actor id
  - target user id
  - reason
  - ticket id or approval reference
  - access start and expiry
  - viewed module or collection
  - IP address and user agent
- Sensitive values must be masked by default. Unmasking requires a second explicit reason and audit entry.

## Mask By Default

- Email: show domain and first two characters only.
- Mobile: show country code and last four digits only.
- Transaction memo: redact free text until user consent is present.
- Merchant/person: show initials or stable masked label in support view.
- Udhari phone/name: mask by default because it can identify third parties.
- Attachments: no support preview unless the user explicitly grants attachment access.

## PII Classification

- Direct identifiers:
  - email
  - mobile
  - username when user-supplied
  - udhari phone
  - udhari person name
- Financial sensitive data:
  - transaction amount
  - transaction memo
  - merchant/person
  - account names
  - card nicknames/last4
  - loan lender and balance
- Documents:
  - bills
  - invoices
  - attachments
  - CA exports

## Encryption Plan

- Current baseline: PII is access-controlled and user-owned in SQL rows.
- Required before broad public launch:
  - encrypt attachment blobs at rest
  - encrypt or tokenize third-party contact fields such as udhari phone
  - keep search helper fields hashed or normalized without exposing raw PII
  - rotate encryption keys with a documented key id per encrypted payload
  - keep audit logs append-only and outside normal user data deletion until retention expiry

## Retention Baseline

- Soft-deleted users: hard-delete after 30 days.
- Login attempts: delete after 7 days.
- API rate limits: delete after 1 day.
- Processed webhook events: delete after 90 days.
- User audit logs: delete after configured policy period, currently 730 days.
- Soft-deleted cloud rows: delete after 30 days.

## Risk Acceptance

Until field-level encryption is implemented, production operators must treat database access as sensitive financial data access. Direct database access must be restricted to trusted administrators and logged outside the application.
