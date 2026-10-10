# voice-reminder-docs

Public pages for こえリマインド (an iOS voice reminder app by LINKA LLC), served by GitHub Pages at
https://voice-reminder.linka-inc.jp

- `/privacy/` — privacy policy (App Store Connect: Privacy Policy URL)
- `/support/` — support and FAQ (App Store Connect: Support URL)
- `/en/`, `/en/privacy/`, `/en/support/` — the same in English (App Store Connect's English localization)

Each page sets `lang` (default `ja`) and `alternate`, its page in the other language; `_data/i18n.yml` holds the
layout's text per language. The Japanese privacy policy prevails over the English translation.

The top page (`_layouts/home.html`) takes its text from `_data/home.yml` (both languages) and the voice credits from
`_data/voices.yml`. Its voice samples (`assets/voices/`) are rendered with the app's voice workbench, and its
screenshots (`assets/shots/`) come from the app's App Store screenshots. `released` in `_config.yml` switches the
"coming soon" label to the App Store badge once the app is out. `bun scripts/og.ts` remakes the share images.

Checks: `bun run test` builds the site with Jekyll and opens it in Playwright's Chromium (`PW_CHROMIUM` points at
another Chromium build when the bundled one isn't installed); `bun run lint`, `bun run type-check`.
The app's source lives in a separate private repository.
