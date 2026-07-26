# OpenLibreLinkUp 1.2.0 Release Checklist

## Repository

- [ ] `git status` shows only intended release changes
- [ ] No LibreLinkUp credentials, tokens, glucose data, or `emu-settings.json`
      are tracked
- [ ] `package.json` and `package-lock.json` both show version `1.2.0`
- [ ] README screenshots are current
- [ ] License and credits are present

## Static checks

```sh
node --check src/pkjs/index.js
node --check src/pkjs/config.js
node --check src/pkjs/i18n.js
python3 -m py_compile scripts/inject-emu-settings.py
npm audit
```

## Clean build

```sh
rm -rf build
npm install
npm run build
```

Confirm that the build output reports:

```text
open-libre-link-up@1.2.0
```

## Installation

```sh
pebble install --phone PHONE_IP build/OpenLibreLinkUp.pbw
```

## Watchface test

- [ ] Time and German date are correct
- [ ] Current glucose value and unit are visible
- [ ] Delta and trend arrow agree
- [ ] Horizontal arrow at `-0.1` through `+0.1 mmol/L`
- [ ] Diagonal arrow at `+/-0.2 mmol/L`
- [ ] Vertical arrow from `+/-0.3 mmol/L`
- [ ] Chart uses the expected 210-minute window
- [ ] Hour labels and moving grid are correct
- [ ] Minimum and maximum labels are positioned correctly
- [ ] Dotted minimum and maximum guides span the chart
- [ ] Warning and alarm threshold lines use the configured colors
- [ ] Normal view shows the divider
- [ ] Quick View hides the divider and uses black foreground elements
- [ ] Reversed mode remains readable
- [ ] Stale data hides the glucose value after 60 minutes

## Settings test

- [ ] Saved settings reopen with their current values
- [ ] Automatic language follows the phone language
- [ ] English, German, French, and Italian can be selected manually
- [ ] Switching units converts all four threshold fields
- [ ] All Pebble Time 2 colors are available
- [ ] Account fields are collapsed initially
- [ ] Restore Defaults keeps email, password, and server region
- [ ] Restore Defaults produces green `00AA00`, yellow `FFAA00`, red `AA0000`

## Alarm test

Temporarily move an alarm threshold across the current glucose value.

- [ ] A genuinely new low reading triggers the low alarm once
- [ ] A genuinely new high reading triggers the high alarm once
- [ ] Fetching the same reading again does not repeat the alarm
- [ ] Muted sound falls back to vibration
- [ ] Restore the real alarm thresholds after testing

## Release

- [ ] Commit the tested release state
- [ ] Push `main`
- [ ] Create tag `v1.2.0`
- [ ] Build the final PBW from the tagged clean tree
- [ ] Upload the exact tagged PBW to the appstore
- [ ] Keep the final PBW and screenshots with the release notes
