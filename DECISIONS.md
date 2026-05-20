# Decisions

## 2026-05-20: GitHub Actions Automation Shape

The daily AI update automation is designed as a small GitHub Actions workflow. GitHub provides scheduling, logs, and a versioned archive, while the scripts handle source fetching, strict yesterday-only filtering, and founder-focused summarization.

The first version avoids third-party npm dependencies so the setup remains simple and does not require dependency approval. RSS parsing is intentionally lightweight for now and can be replaced with a proper parser later if source quality becomes an issue.

## 2026-05-20: Slack Delivery

The automation posts the generated brief to Slack when `SLACK_WEBHOOK_URL` is available. The webhook is treated as a secret and should be configured through GitHub Actions secrets rather than committed to the repository.
