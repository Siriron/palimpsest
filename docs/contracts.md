# Contract reference

File: `contracts/palimpsest.py` (GenVM v0.2 API, runner `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`). Class `Palimpsest`. No constructor arguments. No payable methods. No value transfer.

## Methods

| Method | Kind | Notes |
|---|---|---|
| `file_notice(repository, base_sha, head_sha, scope, summary, covered_json)` | write | Deterministic. Repository `owner/name`, two different 40-hex SHAs, scope one of `typo_fix`, `formatting_only`, `clarification`, `substantive_change`, summary 1 to 400 bytes, 1 to 3 covered paths as a JSON list. One notice per wallet per comparison. |
| `audit_notice(notice_id)` | write | Consensus. Allowed once while status is `filed`. Anyone may call. |
| `object_to_path(notice_id, path, note)` | write | Consensus. Path must not be covered or already decided. Filer must differ from the publisher. Note at most 300 bytes. |
| `get_notice(notice_id)` | view | Notice, audit and objections as JSON. |
| `list_notices(start, limit)` | view | At most 20 rows from `start` (1-based) and the total. |
| `get_standing(address)` | view | Counters for a wallet; case-insensitive lookup; zeros if unknown. |
| `get_policy()` | view | Scopes, ladder, penalty table, limits. |

## Ladder and penalties

`within_scope` 0, `minor_beyond` 1, `material_beyond` 3, `contradicts_note` 6. An objection is upheld from `material_beyond`. Every rung is producible: the model may return any of the four, and anything other than `within_scope` needs a quote that exists in the diff.

## Errors

Expected rejections raise `gl.vm.UserError("[EXPECTED] ...")`. Unverifiable evidence, an unusable model answer, or a failed quote check raise inside the nondet block and no state is written.

## Known gaps

- Standing is per wallet: no sybil resistance, no proof the publisher controls the repository.
- No appeal for a decided objection.
- 12 files per comparison, 4000 bytes per judged patch.
- Penalty rungs and tolerance are fixed constants.
- Real-model accuracy is not covered by the repository tests.
