import { mkdir, readFile, writeFile } from "node:fs/promises";

type CandidateItem = {
  source: string;
  title: string;
  url: string;
  publishedAt: string;
  summary?: string;
};

type CandidateFile = {
  targetDate: string;
  candidates: CandidateItem[];
};

const candidatesPath = new URL("../briefs/candidates.json", import.meta.url);
const promptPath = new URL("../prompts/founder_brief.md", import.meta.url);
const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const { targetDate, candidates } = JSON.parse(await readFile(candidatesPath, "utf8")) as CandidateFile;
const prompt = (await readFile(promptPath, "utf8")).replaceAll("{{YESTERDAY_DATE}}", targetDate);

const outputPath = new URL(`../briefs/${targetDate}.md`, import.meta.url);

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required.");
}

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model,
    input: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content:
          candidates.length === 0
            ? `No eligible source items were found for ${targetDate}. Return the requested JSON for a quiet-news day.`
            : `Eligible source items for ${targetDate}:\n${JSON.stringify(candidates, null, 2)}`,
      },
    ],
  }),
});

if (!response.ok) {
  throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
}

const result = await response.json();
const text =
  result.output_text ??
  result.output?.flatMap((item: any) => item.content ?? []).map((content: any) => content.text).join("\n") ??
  "";
const brief = parseBrief(text, targetDate);
const markdown = briefToMarkdown(brief);

await mkdir(new URL("../briefs/", import.meta.url), { recursive: true });
await writeFile(outputPath, markdown);
console.log(`Wrote ${outputPath.pathname}`);

if (process.env.SLACK_WEBHOOK_URL) {
  const slackResponse = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(slackPayload(brief)),
  });

  if (!slackResponse.ok) {
    throw new Error(`Slack webhook failed: ${slackResponse.status} ${await slackResponse.text()}`);
  }

  console.log("Posted brief to Slack");
}

type Brief = {
  date: string;
  items: {
    headline: string;
    why: string;
    url: string;
    source: string;
  }[];
  synthesis: string;
};

function parseBrief(raw: string, date: string): Brief {
  const json = raw.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;

  try {
    const parsed = JSON.parse(json) as Brief;
    return {
      date: parsed.date || date,
      items: (parsed.items ?? []).slice(0, 4),
      synthesis: parsed.synthesis || "",
    };
  } catch {
    return {
      date,
      items: [],
      synthesis: raw.trim(),
    };
  }
}

function briefToMarkdown(brief: Brief): string {
  const lines = [`# AI Founder Brief: ${brief.date}`, ""];

  for (const item of brief.items) {
    lines.push(`- [${item.headline}](${item.url}) (${item.source}): ${item.why}`);
  }

  if (brief.synthesis) {
    lines.push("", brief.synthesis);
  }

  return `${lines.join("\n").trim()}\n`;
}

function slackPayload(brief: Brief): object {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `AI Founder Brief: ${brief.date}`,
      },
    },
  ];

  for (const item of brief.items) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `• *<${item.url}|${escapeSlack(item.headline)}>* (${escapeSlack(item.source)})\n${escapeSlack(item.why)}`,
      },
    } as any);
  }

  if (brief.synthesis) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Bottom line:* ${escapeSlack(brief.synthesis)}`,
        },
      ],
    } as any);
  }

  return {
    text: `AI Founder Brief: ${brief.date}`,
    blocks,
  };
}

function escapeSlack(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
