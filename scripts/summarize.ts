import { mkdir, readFile, writeFile } from "node:fs/promises";

type CandidateItem = {
  source: string;
  title: string;
  url: string;
  publishedAt: string;
};

type CandidateFile = {
  targetDate: string;
  candidates: CandidateItem[];
};

const candidatesPath = new URL("../briefs/candidates.json", import.meta.url);
const promptPath = new URL("../prompts/founder_brief.md", import.meta.url);

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
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content:
          candidates.length === 0
            ? `No eligible source items were found for ${targetDate}. Write a short quiet-day brief.`
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

await mkdir(new URL("../briefs/", import.meta.url), { recursive: true });
await writeFile(outputPath, text.trim() + "\n");
console.log(`Wrote ${outputPath.pathname}`);

if (process.env.SLACK_WEBHOOK_URL) {
  const slackResponse = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: `AI founder brief for ${targetDate}\n\n${text.trim()}`,
    }),
  });

  if (!slackResponse.ok) {
    throw new Error(`Slack webhook failed: ${slackResponse.status} ${await slackResponse.text()}`);
  }

  console.log("Posted brief to Slack");
}
