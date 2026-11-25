# Deployment

## Contract (StudioNet)

1. Open GenLayer Studio and deploy `contracts/palimpsest.py` to StudioNet. There are no constructor arguments.
2. Copy the deployed address into `src/config/chains.ts` as `CONTRACT_ADDRESS`. It is the single place the address lives.
3. Rebuild and redeploy the frontend.

StudioNet is a temporary test network. Deployed addresses may not survive resets, so the repository tests, not the address, are the proof of behaviour.

## Frontend (Vercel)

React + Vite, `index.html` at the project root, `vercel.json` rewrites every path to `/index.html`.

```bash
npm install
npm run build
```

The app shows a "contract address not set" banner and disables reads and writes until `CONTRACT_ADDRESS` is a real address. StudioNet limits each IP to 60 requests a minute, so reads are cached for 15 seconds, lists are not auto-refreshed, and receipts are polled only for the transaction the user just sent. A 429 shows a visible rate-limit message.

## Tests

```bash
pip install "genlayer-test==0.29.2" genvm-linter
genvm-lint download --version v0.2.16
genvm-lint check contracts/palimpsest.py
genvm-lint typecheck contracts/palimpsest.py
pytest tests -q -p no:cacheprovider
```

Never run pytest with `-s`. Every `direct_deploy` pins `sdk_version="v0.2.16"`.

### Testing status

107 tests pass. They run the real contract and validator logic under the GenVM SDK in direct mode, using real GitHub compare responses for `Siriron/palimpsest-demo-docs` as fixtures, with the web and the model mocked. Covered: every write method, every outcome rung, every validator-compared field changed in isolation, HTTP 403/404/429/500 and twelve malformed-evidence shapes, malformed model output, quote matching after sanitisation, standing arithmetic across three notices, wallet-specific rules with `prank`, snapshot and revert, a pickling check, and the timestamp parser. Seven planted bugs were each caught. Not proven: real model judgements, real network behaviour, real multi-node timing, and any live StudioNet transaction.

## Demo documents

The in-app test guide uses `github.com/Siriron/palimpsest-demo-docs`, three commits of fictional policies. The SHAs are constants in `src/config/chains.ts`.
