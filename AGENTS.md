# Project Notes

This workspace contains a GitHub Actions scaffold for a daily AI founder brief.

## What Exists

- `.github/workflows/daily.yml` runs the automation at 9:00 AM Asia/Singapore and commits generated briefs.
- `config/sources.yml` defines the RSS source basket.
- `prompts/founder_brief.md` defines the founder-focused summarization style and strict yesterday-only rule.
- `scripts/fetch_sources.ts` fetches RSS items and filters them to the prior calendar day.
- `scripts/summarize.ts` sends filtered candidates to the OpenAI Responses API, writes a Markdown brief, and posts to Slack when `SLACK_WEBHOOK_URL` is set.
- `briefs/` stores generated candidate data and daily Markdown briefs.

## Operating Notes

- Do not add dependencies without explicit approval.
- Keep the brief practical for an AI software founder.
- Keep the date gate strict: only the day before the run should be summarized.
- Store Slack webhooks as GitHub secrets. Never hardcode webhook URLs.
- The summarizer defaults to `gpt-4o-mini`; override with `OPENAI_MODEL` if a different model is available.
