# BondFin Collective — ROSCA Model

## Financial Structure
- 10 trusted members
- each member contributes $100 every two weeks
- member contribution obligations total $1,000 per cycle
- members send contributions directly to that cycle's payout recipient
- the other nine members transfer $900 total to the recipient; the recipient retains their own $100 contribution
- one member receives the direct-payment payout per cycle
- cycle rotates through all members until each has received payout

## Payment Verification
- Members initiate transfers using the agreed external provider, such as Zelle or Cash App.
- A transfer is not considered received just because a member marks it as sent in BondFin.
- The recipient or an authorized reviewer verifies receipt against the provider account before BondFin records the contribution as confirmed.
- Provider integrations and automated payment confirmation are not assumed.

## Functional Expectations
The application should support:
- member tracking
- contribution tracking
- payout order tracking
- payout dates
- cycle status
- financial transparency within the trusted group

## Design Constraints
This is not a general-purpose platform. The product must remain focused on the ROSCA flow and clearly reflect the structure of a private rotating savings group.
