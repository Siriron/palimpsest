<div align="center">

<img src="./public/favicon.svg" width="88" alt="Palimpsest logo" />

# Palimpsest

### A public ledger of honest edit notes: validators judge the real GitHub diff against what the publisher said the change did.

<br />

![Status](https://img.shields.io/badge/status-building-yellow?style=flat-square)
![Network](https://img.shields.io/badge/network-StudioNet-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20GenVM-e3b35a?style=flat-square)

<br />

**[Documentation](./docs/architecture.md)** &nbsp;·&nbsp; **[Smart Contract](./contracts/palimpsest.py)** &nbsp;·&nbsp; **[Demo documents](https://github.com/Siriron/palimpsest-demo-docs)**

</div>

<br />

---

## What this is

Policies, terms and charters kept in git get rewritten in place, and the note describing the change is written by the party that benefits from it being vague. Palimpsest locks that note first (two commits, a declared scope, a summary, the files it covers), then asks GenLayer validators to judge the actual GitHub diff against it. Anyone can object to a file the note left out. Each verdict moves a public, wallet-scoped standing ledger. There is no stake and no payout.

<br />

<div align="center">

| | |
|---|---|
| **Concept** | Edit-note honesty for documents in git, scored on a public standing ledger |
| **Consensus need** | A publisher wants "within scope", an objector wants "material", and neither controls the evidence |
| **Evidence source** | api.github.com compare diffs, fetched by every validator from a repository and two SHAs locked in the notice |
| **Network** | StudioNet (temporary test network; see Status) |

</div>

<br />

---

## How it works

**Boundary.** Publisher files a notice -> validators fetch the GitHub comparison -> model judges the diff against the declared scope -> validators compare evidence digest, outcome rung and the "material" flag -> verdict and cited line are stored -> standing moves by a fixed penalty table.

- **Frontend owns:** forms, wallet connection, read views, GitHub-side evidence re-verification in the browser, the in-app test guide.
- **Contract owns:** the locked statement, the evidence checks, the validator comparison rule, the verdict ladder and the standing ledger.
- **External sources own:** the raw diff. Validators re-fetch it; the browser can recompute the stored SHA-256 digest from GitHub.

**Evidence sources**

| Host | URL pattern | Fetch method | Deciding field |
|---|---|---|---|
| api.github.com | `/repos/{owner}/{repo}/compare/{base}...{head}` built from locked fields only | `web.request` (JSON) | `files[].patch` |

1. `file_notice` locks repository, baseline, head, scope, summary and 1 to 3 covered files. No model call.
2. `audit_notice` judges the covered files' diffs. Anyone can call it, once.
3. `object_to_path` judges one uncovered file against the same notice. Each path is decided once.
4. A model cannot claim a mismatch without quoting a real added or removed line; the contract checks the quote against the diff bytes.

<br />

<details>
<summary><b>The four-rung ladder</b></summary>
<br />

`within_scope` (0 points), `minor_beyond` (1), `material_beyond` (3), `contradicts_note` (6). The penalty is a table lookup. Validators may differ by one rung but must agree on whether the change was material (rung 2 or higher), which is also what makes an objection "upheld".

</details>

<br />

---

## Deployed contracts

<div align="center">

| Network | Address | Explorer |
|---|---|---|
| StudioNet | `0xC5D719A0C0898de4408d80608d512Ef4cc580A2A` | [View](https://explorer-studio.genlayer.com/address/0xC5D719A0C0898de4408d80608d512Ef4cc580A2A) |

StudioNet is a temporary test network: deployed addresses may not survive resets. The repository tests below are the proof of behavior, not the address.

</div>

<br />

---

## Quick start

```bash
npm install
npm run dev
```

Run the contract tests (they execute the real contract under the GenVM SDK in direct mode):

```bash
pip install "genlayer-test==0.29.2" genvm-linter
genvm-lint check contracts/palimpsest.py
genvm-lint typecheck contracts/palimpsest.py
pytest tests -q -p no:cacheprovider
```

The tests pin GenVM v0.2.16 (`sdk_version` in every deploy). Unpinned, `genlayer-test` resolves GitHub's latest GenVM release, which can be a release candidate whose bundle is not published.

Full deployment instructions: [`docs/deployment.md`](./docs/deployment.md)

<br />

---

## Project structure

```
contracts/palimpsest.py            The GenVM contract
tests/                             Direct-mode tests plus real GitHub compare fixtures
pytest.ini                         Makes unused test mocks fail the suite
.github/workflows/ci.yml           Lint, typecheck and tests on every push
src/                               React + Vite app (pages, components, lib, state)
docs/                              architecture.md, deployment.md, contracts.md, frontend.md
LICENSE                            MIT
```

<br />

---

## Status

<div align="center">

![Tested](https://img.shields.io/badge/contract%20logic-tested-brightgreen?style=flat-square)
![Untested](https://img.shields.io/badge/live%20network%20and%20real%20LLM-untested-yellow?style=flat-square)

</div>

107 direct-mode tests pass (`pytest tests -q -p no:cacheprovider`), `genvm-lint check` and `typecheck` pass, and the frontend builds (`npm run build`). The tests run the real contract and its real validator logic, using real GitHub compare responses as fixtures, with the web and the model mocked. Seven planted bugs (HTTP status attribute, material-flag check, evidence digest check, validator quote check, repository echo, baseline echo, additions/deletions check) were each caught by at least one test. The tests do NOT prove how a real model judges a diff, real network behavior or real multi-node timing. The contract is deployed to StudioNet, but no live transaction has been exercised through the app yet.

<br />

---

<div align="center">

Built on [GenLayer](https://genlayer.com) · Portal submission pending

</div>
