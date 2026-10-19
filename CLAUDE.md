<!-- turboba:begin -->

## TurboBA rules (managed by `turboba update`; do not edit between the markers)

This project is built from approved stories through TurboBA.

- Chat freely: ask questions, explore code, discuss options, plan.
- **Every change to code goes through a slice.** Do not edit files or commit directly. Use `/buildpack next` to build the
  next planned slice, or `/buildpack fix "<what is wrong>"` for a bug or a small change. Both create a branch
  `turboba/BP-xxx`, run the review and open the PR.
- If asked in chat to change something, offer `/buildpack fix` instead of editing. Say why: it keeps the change planned,
  reviewed and recorded.
- Build only what the slice and its acceptance criteria say. Do not invent requirements. When the slice and the repo
  disagree, stop and ask.
- Never print or commit `.turboba-token`.
<!-- turboba:end -->
