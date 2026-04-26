const core = require('@actions/core');
const fs = require('fs');
const PROMPT = `You are a Task Prioritizer, designed to analyze project issues and prioritize tasks based on urgency, impact, and dependencies. Your output should be a prioritized list of tasks with clear explanations for the prioritization.

**Input:**

You will be provided with a list of issues from a project board. Each issue will contain the following information:

*   **Issue Title:** {issue_title}
*   **Issue Description:** {issue_description}
*   **Urgency:** {urgency_level} (Values: High, Medium, Low)
*   **Impact:** {impact_level} (Values: High, Medium, Low)
*   **Dependencies:** {dependencies_list} (List of issue titles that this issue depends on. If no dependencies, state "None")

**Instructions:**

1.  **Analyze each issue:** Carefully review the title, description, urgency, impact, and dependencies of each issue.
2.  **Prioritization Logic:**
    *   **Urgency:** High urgency tasks should generally be prioritized higher.
    *   **Impact:** High impact tasks should generally be prioritized higher.
    *   **Dependencies:** Tasks that are dependencies for other tasks should be prioritized earlier to avoid blocking progress.  A task with many dependencies relying on it should be prioritized higher.
    *   **Combined Factors:** Consider the combined effect of urgency, impact, and dependencies. For example, a task with medium urgency and high impact might be prioritized higher than a task with high urgency and low impact. A task with high urgency and high impact should be at the top.
3.  **Output Format:**

    Present the prioritized list of tasks in the following format:

        Prioritized Task List:

    1.  **Task Title:** {task_title_1}
        **Priority Score:** {priority_score_1} (Calculated based on Urgency, Impact, and Dependencies)
        **Justification:** {justification_1}

    2.  **Task Title:** {task_title_2}
        **Priority Score:** {priority_score_2} (Calculated based on Urgency, Impact, and Dependencies)
        **Justification:** {justification_2`;
async function run() {
  try {
    const key = core.getInput('gemini_api_key');
    const token = core.getInput('service_token');
    const ctx = { repoName: process.env.GITHUB_REPOSITORY || '', event: process.env.GITHUB_EVENT_NAME || '' };
    try { Object.assign(ctx, JSON.parse(fs.readFileSync('package.json', 'utf8'))); } catch {}
    let prompt = PROMPT;
    for (const [k, v] of Object.entries(ctx)) prompt = prompt.replace(new RegExp('{' + k + '}', 'g'), String(v || ''));
    let result;
    if (key) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
      });
      result = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (token) {
      const r = await fetch('https://action-factory.walshd1.workers.dev/generate/task-prioritizer', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      });
      result = (await r.json()).content || '';
    } else throw new Error('Need gemini_api_key or service_token');
    console.log(result);
    core.setOutput('result', result);
  } catch (e) { core.setFailed(e.message); }
}
run();
