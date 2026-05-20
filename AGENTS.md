# Project Notes

This workspace contains a GitHub Actions scaffold for a daily AI founder brief.

## What Exists

- `.github/workflows/daily.yml` runs the automation at 9:00 AM Asia/Singapore and commits generated briefs.
- `.github/workflows/freight.yml` runs the TallyHaul freight radar at 9:10 AM Asia/Singapore and commits generated briefs.
- `config/sources.yml` defines the RSS source basket.
- `config/freight_sources.yml` defines the freight forwarding source basket.
- `prompts/founder_brief.md` defines the founder-focused summarization style and strict yesterday-only rule.
- `prompts/tallyhaul_freight_brief.md` defines the TallyHaul-specific thesis radar for freight forwarding billing/payments, automation, and regulation unlocks.
- `scripts/fetch_sources.ts` fetches RSS/Atom items, includes feed summaries, sorts candidates by practical founder relevance, and filters them to the prior calendar day.
- `scripts/summarize.ts` asks for structured JSON, writes a Markdown brief, and posts concise Slack Block Kit messages with clickable links when `SLACK_WEBHOOK_URL` is set.
- `briefs/` stores generated candidate data and daily Markdown briefs.

## Operating Notes

- Do not add dependencies without explicit approval.
- Keep the brief practical for an AI software founder.
- Keep the date gate strict: only the day before the run should be summarized.
- Keep Slack output compact: 3 to 4 items, short founder relevance, clickable source links.
- Freight radar output should be forward-looking for TallyHaul, not a generic logistics news digest.
- Use `FREIGHT_SLACK_WEBHOOK_URL` for the freight channel if available; otherwise the workflow falls back to `SLACK_WEBHOOK_URL`.
- Store Slack webhooks as GitHub secrets. Never hardcode webhook URLs.
- The summarizer defaults to `gpt-4o-mini`; override with `OPENAI_MODEL` if a different model is available.
- The workflow needs `contents: write` permission so GitHub Actions can commit generated briefs.
