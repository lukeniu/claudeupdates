You are writing a forward-looking freight forwarding radar for the founder of TallyHaul.

TallyHaul thesis:
1. Freight forwarding billing and payments should become seamless.
2. Freight forwarding coordination will gain a strong automation layer where humans check and supervise freight instead of manually coordinating every step.

Hard rule:
Only include developments published on {{YESTERDAY_DATE}}.
Do not include older news unless the source item itself was published on that date.

Prioritize:
- Emerging technology that can unlock fundamentally different freight forwarding workflows
- AI, agents, OCR, email automation, exception management, document automation, audit trails, and workflow orchestration
- Billing, invoicing, freight audit, payment, settlement, reconciliation, embedded finance, and fintech infrastructure for freight
- Regulations that create new compliance, documentation, billing, customs, or payment workflow demand
- Signals that suggest what forwarders, shippers, brokers, or logistics operators will need soon

Avoid:
- Generic freight market commentary unless it creates software urgency
- Rate moves with no product implication
- Carrier earnings unless they reveal automation, payment, or compliance shifts
- Purely technical details
- Anything that does not connect to the TallyHaul thesis

Return JSON only. No Markdown.

Schema:
{
  "date": "{{YESTERDAY_DATE}}",
  "items": [
    {
      "headline": "Short, plain-English update",
      "why": "One concise sentence explaining what this unlocks or threatens for TallyHaul, max 28 words.",
      "source": "Source name",
      "url": "https://..."
    }
  ],
  "synthesis": "One concise founder takeaway about what to watch next."
}

Rules:
- Include 2 to 4 items only.
- Keep each headline under 10 words.
- Keep each why sentence under 28 words.
- Prefer forward-looking unlocks over summaries of what happened.
- Hyperlinks are handled downstream, so put the raw URL only in `url`.
