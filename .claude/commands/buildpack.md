# /buildpack

Build the slices (buildpacks) that TurboBA planned for this project, with Claude Code writing the code and TurboBA
deciding what to build, what "done" means, and reviewing it.

## Usage

```
/buildpack start              — pick an approved story, choose the repo, confirm the stack, plan, then build
/buildpack                    — list the plan and the status of every slice
/buildpack next               — work on the next slice (resumes an interrupted one first)
/buildpack [BP-001]           — work on one specific slice
/buildpack [US-001]           — work through all slices of a story, in order
/buildpack all                — work through the approved plan; independent slices run in parallel
/buildpack status             — show status without executing
/buildpack done [BP-001]      — run the done gate and mark a slice complete
/buildpack verify [BP-001]    — check the slice's VERIFY items against the code
/buildpack fix [what is wrong] — a bug or small change: make it a slice, then build it the normal way
/buildpack add [description]  — add a slice to the plan
/buildpack remove [BP-003]    — remove a slice (asks first)
/buildpack edit [BP-005]      — targeted edit of a slice prompt
```

All TurboBA calls below are tools of the `turboba` MCP server. `project_id` comes from `turboba.json` at the
repository root (written by `turboba init`). If `turboba.json` is missing, tell the user to run `turboba init`, or to
add `{"project_id": "..."}` by hand.

## Starting a story (`/buildpack start`)

The product owner stops at `approve` in TurboBA. The developer starts here: pick the story, choose the repo, confirm the
stack, plan the slices, then build. Ask one thing at a time and wait for the answer.

### A. Pick the stories

1. Call `get_project_context(project_id)` and `list_approved_stories(project_id)`.
2. Show the stories as a numbered list (title, type, slices planned, slices built). A story marked `changed` was edited
   after approval: do not build it, tell the developer to ask the product owner or a project driver to `approve` it again.
   If nothing is approved: say "No approved stories yet. Ask the product owner or a project driver to `approve` one in
   TurboBA." and stop.
3. Ask which to build (one or several).

### B. Choose the repo

Show the project's registered `repos` as a numbered list, plus these options. The list is a suggestion, never a lock.

- **a registered repo** — clone it if the current directory is not already that repo;
- **this directory** — call `check_repo(project_id, <git remote get-url origin>)`; if `unregistered`, ask once whether to
  add it and, on yes, call `register_repo(project_id, url, role="push_target")`;
- **another repo URL** — clone it, then `register_repo(project_id, url)`;
- **a fork of a registered repo** — run `gh repo fork <url> --clone`, then `register_repo(project_id, <fork url>)`;
- **a new repo** — ask for a name and whether it is private, call `create_repo(project_id, name, private=true)`, clone it.

If a repo is already registered with role `push_target` and the developer has not said otherwise, offer it first.

### C. Confirm the stack (once per project)

If `get_project_context().tech_context_saved` is true, show the saved stack in one line and ask "keep it, or change it?".
Otherwise:

1. **A repo with code:** read its own files, locally: `package.json`, `pyproject.toml` / `requirements.txt`, `pom.xml` /
   `build.gradle`, `go.mod`, `Cargo.toml`, `*.csproj`, the test configuration (`jest.config`, `pytest.ini`, `vitest`, ...)
   and the folder layout. Say what you found: "This repo uses TypeScript, React 18, Vite and Jest. Confirm, change, or
   improve?" Never invent a stack: say what is missing and ask.
2. **An empty repo:** ask for the stack in plain language (language, framework, database, auth, test framework,
   conventions). Plan the bootstrap slice BP-000 (step 1 of the loop below) before the first story slice.
3. When the developer confirms, call `set_tech_context(project_id, {language, runtime, database, auth, test_framework,
conventions, ...})`. Only `language` and `test_framework` are required; keep other keys short.

### D. Plan the slices

For each chosen story that has no slices yet, call `plan_buildpacks(thread_id, repo_url=<the repo chosen in step B>)`. Passing the repo makes it the slices' target
whatever else the project has registered. It takes about 30-60 seconds per slice;
tell the developer it is working. Credits are debited per slice, as in the UI.

- `not_approved`: ask the product owner or a project driver to `approve` the story. Do not work around it.
- `tech_context_required`: go back to step C.
- `exists`: the slices were already planned; show them.

Show the plan: each slice with its objective, the acceptance criteria it covers, and what it depends on, in the order
they will run (`get_ready_slices` shows which can start together). Ask "start with this plan?". If the developer wants a
change, use `add_buildpack_slice` / `edit_buildpack_slice` / `remove_buildpack_slice` or `plan_buildpacks(thread_id,
regenerate=true, repo_url=...)` (refused once a slice has been started). Then go into the loop below with `/buildpack next`, or
`/buildpack all` for independent slices in parallel.

## The loop for one slice

### 0. Choose where the code goes (once per session; `/buildpack start` already did this)

1. Call `get_project_context(project_id)`. It returns the project's registered `repos`, the `tech_context`, the
   `commit_identity`, and the scaffold steps.
2. Show the registered repos as a numbered list, plus **"this directory"** and **"another repo"**, and ask which one to use.
   The list is a suggestion, never a lock: the developer may pick anything.
3. Call `check_repo(project_id, remote_url)` with `git remote get-url origin` of the directory you will work in.
   - `registered`: go on.
   - `unregistered`: say so once and ask "continue anyway? (the repo can be added in TurboBA's project settings)". Never block.
4. If `commit_identity` is set, use it: `git config user.name` / `user.email` for this repo.
5. Create the branch **`turboba/<BP-id>`** from the default branch. **Never commit to `main`, `master` or `reflex`.**

### 1. Bootstrap (slice BP-000) — only for an empty repo

If `get_project_context().bootstrap_needed_if` applies (the repo is empty, or none of its marker files exist):
show `scaffold.steps`, ask the developer to confirm, run them, then check the `scaffold.verify` items (it builds, the
test runner runs, the folder structure matches). Report it like any slice (`report_buildpack_status("BP-000", ...)`).
Never scaffold a repo that already has code.

### 2. Pick the slice

- `/buildpack next`: call `get_next_buildpack(project_id)`.
  - `resume: true`: an earlier run stopped partway. Check out its `branch`, run `git log` and `git diff` since its last
    `commit`, read `files_written`, and continue from there instead of starting over.
  - `plan_status: "draft"`: the plan is not approved yet. Say so and ask whether to continue anyway.
  - "All slices done": stop.
- `/buildpack BP-001`: use that slice. `/buildpack US-001`: call `list_buildpacks(project_id, story_id)` and take them in order.
- Then call `get_buildpack(bp_id)` for the full prompt, acceptance criteria and NFRs.

### 3. Tests first, then code

1. Call `report_buildpack_status(bp_id, "in_progress", branch=..., repo=...)`.
2. Follow the slice prompt exactly: every MUST / MUST NOT, only the files it lists, GROUNDING RULES (stop and report a
   blocker rather than guess).
3. For every Gherkin acceptance criterion, **write a failing test first** (one test per scenario, named after it), then
   write the code that makes it pass.
4. At each checkpoint (tests written, a major file done) call `report_buildpack_status(bp_id, "in_progress",
files_written=[...], commit=<sha>, branch=..., repo=...)`. If this session dies, the next one resumes from here.
5. If you cannot continue: `report_buildpack_status(bp_id, "blocked", blockers=[...])` and stop.
   If the blocker is the **spec itself** (an unclear or conflicting acceptance criterion, a missing design or decision,
   something only the product owner can answer), tell the developer and, once they agree, call
   `send_back_story(thread_id, reason, bp_id)` with a specific reason. The story leaves the approved list, the reason
   appears in its chat for the product owner, and you stop work on it; it comes back after they fix it and approve again.

### 4. Review, fix, check

1. Commit, then call `run_review_agents(bp_id, diff)` with `git diff <default-branch>...HEAD`. Fix every FAIL, re-commit,
   re-run until there is none.
2. Run the slice's VERIFY items (see `get_verify_checklists`) and keep each result. If a tool a check needs is missing
   (for example `detect-secrets`), install it and run the check. If a check fails for a reason that is not this slice's
   (for example the same `npm audit` findings exist on the default branch), report it as `"waived: <the reason>"`: the
   reason is kept on the slice and shown to the owner. Never report a check you did not run as `pass`.
3. Call `check_buildpack_done(bp_id)` and fix what it lists (an AC not covered, a failing VERIFY item, no review).

### 5. Complete, open the PR, have it reviewed

1. Push the branch and open the PR **against this repository's own remote**, never the upstream it was forked from:
   `gh pr create --repo <owner>/<name from 'git remote get-url origin'> --base <default-branch> --head <branch>`.
   Call `get_pr_report(bp_id)` and use its `report` as the body.
2. `report_buildpack_status(bp_id, "complete", files_written=[...], commit=<sha>, branch=..., repo=..., pr_url=<the PR>,
ac_results={"AC-01": "covered", ...}, verify_results={"<item>": "pass" | "waived: <reason>", ...})`.
   If the done gate has failures the slice stays `in_progress` and the reply says what to fix. Pass `accept_failures`
   (a reason) only when the developer explicitly says to finish anyway.
3. Call `review_pull_request(bp_id, pr_url)`. TurboBA reads the PR itself and a team of reviewer agents (spec
   conformance, correctness, security and privacy, tests, architecture, performance, UX where relevant), each using the
   governance rules, reviews it and comments on the PR. Fix every FAIL, push, and call it again. Show the developer the
   verdict and the summary.
4. Read the reply. If `commented_on_pr` is false, TurboBA's GitHub token could not write to the PR: post the review
   yourself with the developer's login, `gh pr comment <n> --repo <owner>/<name> --body-file <file with comment_body>`
   (the review is stored on the slice either way). Mention `comment_error` once so the owner can fix the token.
5. **Merge.** If `merged` is true, TurboBA already did it (the owner switched auto-merge on). Otherwise, when there is no
   FAIL (warnings are fine), the done gate is clear and the slice is reported complete, ask the developer once:
   "Merge PR #n now? (yes/no)". On yes run `gh pr merge <n> --repo <owner>/<name from origin> --squash --delete-branch`,
   then `git checkout <default-branch> && git pull`. Never merge with a FAIL, a failing done gate or an unanswered
   question; if the developer said "merge when clean" at the start, do not ask again.
6. Print: files written, tests added, review verdict, anything left.

## Several slices at once (`/buildpack all`, or a story with independent slices)

1. Call `get_ready_slices(project_id)`: the slices whose dependencies are complete. They do not depend on each other.
2. Give each one to its own subagent, in its own git worktree (`git worktree add ../wt-<BP-id> -b turboba/<BP-id>`), and
   run steps 3–5 above in each, in parallel.
3. When they finish, call `get_ready_slices` again for the next group. Stop when it returns none.
4. If a spec changed mid-run (a story edited after approval), TurboBA marks it "changed" and drops its slices from the
   plan: stop and tell the developer.

## A bug or a small change (`/buildpack fix`)

Chatting is free, but code changes are not: this project's edit guard blocks file edits outside a `turboba/BP-xxx`
branch. When the developer reports a problem, or asks in chat for a change, do not edit: turn it into a slice.

1. If the problem is not described, ask for it in one question: what is wrong, what it should do instead, where.
2. Find the story it belongs to (`list_approved_stories`; if two fit, ask with `AskUserQuestion`). If it breaks an
   acceptance criterion, name it (for example AC-06). If the spec says nothing about it, say so and recommend asking the
   product owner for a criterion; still build the fix if the developer agrees.
3. Call `add_buildpack_slice(thread_id, description)`. The description states what is wrong, the expected behaviour, the
   criterion if any, and how it will be checked (a test, and for visual or layout changes a real browser, not only
   jsdom). The slice is added to the plan, which becomes a draft until a project driver approves it again in TurboBA:
   tell the developer, and continue if they agree.
4. Build that slice with the normal loop (steps 0 to 5 above): branch `turboba/<BP-id>`, test first, review, PR,
   `review_pull_request`, merge.

## Other commands

- **list / status:** call `list_buildpacks(project_id)`; show slices grouped by story with ⬜ not started · 🔄 in progress ·
  ✅ complete · ⏸️ blocked (and "interrupted" for one in progress with no report for 30 minutes).
- **done [BP-001]:** run `check_buildpack_done`, show failures, then `report_buildpack_status(bp_id, "complete")`.
- **verify [BP-001]:** `get_verify_checklists(story_id)`, filter to the slice; check each item in the code and report
  ✅ PASS (file:line) or ❌ FAIL (with the `[source: ko_id]` citation).
- **add:** `add_buildpack_slice(thread_id, description)`. **remove:** show the slice, ask "Remove? yes", then
  `remove_buildpack_slice(slice_id)` (code already written stays). **edit:** ask for the change, then
  `edit_buildpack_slice(slice_id, change_description)`.

## Rules

- Never print or commit tokens. `.turboba-token` stays out of git.
- One branch per slice. Never commit to `main`/`master`/`reflex`. Merge a PR only as step 5 of the loop allows.
- Never guess past a GROUNDING RULE or a blocker: report it.
- **No edits outside a slice.** A hook blocks file edits unless the branch is `turboba/BP-xxx`. If it blocks you, do not
  work around it (no other branch names, no shell redirection): start a slice with `/buildpack next` or `/buildpack fix`.
- **Build only what the spec says.** Do not invent requirements, acceptance criteria, Gherkin scenarios, fields, endpoints,
  libraries or behaviour that the slice and its acceptance criteria do not ask for. A slice with no acceptance criterion
  gets no invented one: say so, name the requirement the tests map to, and note it in the PR.
- **When the slice and the repo disagree** (a file, name or decision the prompt assumes that is not there, or that an
  earlier commit changed on purpose), stop before coding. Say what conflicts, recommend one option, and let the developer
  choose. The repo's existing decisions win over a stale prompt. Then correct the slice with `edit_buildpack_slice` so
  TurboBA's record matches what was built; use `send_back_story` only when the _spec_ is wrong, not the slice.
- **Every question to the developer comes with a recommendation, asked with the `AskUserQuestion` tool** so the developer
  gets selectable options, not a paragraph to answer in free text. Whenever you stop for a decision (a conflict, a
  blocker, a failing check, a review finding, a merge): first say in two or three lines what happened, then call
  `AskUserQuestion` with 2 to 4 options. Put the one you recommend first, label it "(Recommended)", and use each option's
  description for the reason and for the exact action you will take. The developer can always choose "Other" to chat
  instead; answer their questions before acting. If `AskUserQuestion` is not available, fall back to numbered options
  and end with "Reply `ok` to use the suggestion, a number to pick another option, or just tell me what you want."
  Never act on an unanswered question.
- Do not widen a slice: extra fixes, refactors or tests beyond its acceptance criteria go in the PR description as
  follow-ups, not in the code.
