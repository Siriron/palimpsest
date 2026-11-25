# Architecture

Palimpsest has three parts: one GenVM contract, a React + Vite single-page app, and GitHub as the only evidence source.

## Boundary

Publisher files a notice -> notice is locked -> anyone triggers a consensus round -> validators fetch the GitHub comparison themselves -> a model judges the diff against the declared scope -> validators compare the evidence digest, the outcome rung and the "material" flag -> the verdict, the cited line and the digest are stored -> the standing ledger moves by a fixed penalty table.

| Layer | Owns |
|---|---|
| Frontend | forms, wallet connection, read views, in-browser digest verification, the test guide |
| Contract | the locked statement, evidence checks, validator rule, ladder, standing ledger |
| GitHub | the raw diff. It is immutable per commit pair and carries its own commit dates |

## Evidence sources

| Host | URL pattern | Fetch method | Deciding field |
|---|---|---|---|
| api.github.com | `/repos/{owner}/{repo}/compare/{base}...{head}` | `gl.nondet.web.request` (JSON) | `files[].patch` |

The URL is built only from the repository and SHAs locked in the notice. The response must satisfy all of: `html_url` starts with the locked repository, `status` is `ahead`, `base_commit.sha` and `merge_base_commit.sha` equal the baseline, the last commit equals the head, `total_commits` equals the commit list length (1 to 100), the comparison has 1 to 12 files, every judged file appears exactly once with a text patch of at most 4000 bytes, and its `additions` and `deletions` equal the counts in the patch. Anything else makes the evidence unavailable and the transaction reverts with no state change.

## Entities

- **Notice**: locked at `file_notice`. Fields: publisher, repository, base, head, scope, summary, covered files, status (`filed` or `audited`), audit result, objection ids.
- **Objection**: terminal at creation. Fields: filer, path, note (human-only), outcome, cited quote, evidence digest, upheld flag.
- **Standing**: per wallet, keyed by lower-cased address. Publisher counters (notices, clean audits, penalty, objections against, upheld against) and objector counters (filed, upheld, dismissed).

## Lifecycle

`file_notice` (deterministic) -> `audit_notice` (consensus, once) and any number of `object_to_path` calls (consensus, once per uncovered path, at most 12 per notice because a comparison is capped at 12 files). Objections do not depend on the audit and may come first. No state can dead-end: every consensus call either completes or reverts without writing, and can be retried.

## Validator rule

The leader fetches the evidence, judges it and returns `{outcome, file, quote, evidence_sha256}`. Each validator independently:

1. fetches the evidence and requires the same SHA-256 digest;
2. requires the leader's file and quote to be a real added or removed line in its own copy of the diff (quote not compared for equality, verified against the bytes);
3. judges the diff itself;
4. requires the two outcomes to be at most one rung apart AND to agree on whether the outcome is material (rung 2 or higher).

The penalty is a lookup in a table the contract controls. The model never supplies a number.

## Safety measures

Summary and diffs are sanitised and wrapped as untrusted data. The objector's note is stored for readers and never sent to the model. Quotes are matched against the raw line or its sanitised form so markdown rules such as `---` do not break matching, and the raw line is what gets stored.
