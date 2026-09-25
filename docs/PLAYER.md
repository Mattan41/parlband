# Sticky player

`components/StickyPlayer.tsx` is the app-wide audio player: one fixed bar at the
bottom of the viewport, mounted once from `app/layout.tsx` (after `{children}`) so
playback survives client-side navigation. It is the **only** place in the app that
owns an `<audio>` element, and the only place that talks to `POST /api/plays`.

## File map

| Piece                    | File                          | Responsibility                                             |
| ------------------------ | ----------------------------- | ---------------------------------------------------------- |
| Bar, transport, panels   | `components/StickyPlayer.tsx` | playback, transport UI, sleeve/queue state                 |
| Track sleeve ("Låtinfo") | `components/TrackSleeve.tsx`  | cover backdrop, credits, recording info, `/texter` link    |
| Song row                 | `components/SongRow.tsx`      | hands a song to the store (play / add to queue / download) |
| Playback state           | `store/playerStore.ts`        | `currentSong`, `queue`, `isPlaying`, `playbackId`          |
| Round icon buttons       | `components/iconButton.ts`    | shared `iconButtonClass` / `iconButtonDisabledClass`       |
| Credits line             | `components/songCredits.ts`   | `formatSongCredits` for the list and the sleeve            |
| Play counting            | `functions/api/plays.ts`      | `POST /api/plays` (see [DATABASE.md](./DATABASE.md))       |
| Download counting        | `functions/api/downloads.ts`  | `GET /api/downloads` (see [DATABASE.md](./DATABASE.md))    |

## State ownership

The state is split on purpose:

| State                                             | Lives in                   | Why                                                                                                              |
| ------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `currentSong`, `queue`, `isPlaying`, `playbackId` | Zustand (`playerStore`)    | the song list must know which row is active and must be able to queue a song; the bar must be reachable anywhere |
| `currentTime`, `duration`                         | `StickyPlayer` local state | `timeupdate` fires several times per second; keeping it out of the store avoids re-rendering the whole song list |
| `queueOpen`, `sleeveOpen`                         | `StickyPlayer` local state | pure UI state                                                                                                    |

**Invariant:** no playback state lives in the panel state. Opening or closing the
sleeve or the queue never touches the media element, so a panel can never pause,
restart or otherwise interrupt a track.

## Playback rules

- The bar is always mounted but hidden with `display: none` (`hidden`) until
  `currentSong` exists, so the `<audio>` element and its listeners stay stable for
  the whole session.
- `<audio preload="metadata">` with `src={currentSong.src}`.
- **`playbackId` is the restart trigger.** The (re)start effect keys on the counter
  rather than on the song object, because a queue may contain the same song twice –
  the newly current entry can be reference-equal to the previous one. Bumping the
  counter also resets the play-count guard, so a replay counts as a new listening.
- `isPlaying` is mirrored onto the element (play/pause effect), and the element's
  own `play`/`pause` events write back through `setIsPlaying`, so the UI follows a
  browser-initiated pause too.
- `ended`: with a queue → `playNext()` (pops the first entry and bumps
  `playbackId`); with an empty queue → `setIsPlaying(false)` and reset the elapsed
  time.
- Seek writes `audio.currentTime` directly and mirrors it into `currentTime`; the
  slider is a plain `<input type="range">` bound to the local state.
- Skip ("Spela nästa") is disabled while the queue is empty
  (`iconButtonDisabledClass`); the queue button shows an amber count badge when the
  queue is not empty.

## Play counting

`PLAY_THRESHOLD_MS = 5000` – the request is sent only after 5 s of **continuous**
playback. Pausing, switching tracks or unmounting cancels the pending timer
(`hasCountedRef` plus the effect cleanup), and one listening is counted at most
once. The endpoint contract is in [DATABASE.md](./DATABASE.md).

## Layout rules

Both breakpoints share one DOM tree; there is deliberately **one** transport strip,
not a variant per state, so the controls keep the same size and order whether or not
the sleeve is open.

- **Below `sm` (640 px) – two rows.** Row 1 is the timeline across the full width
  (elapsed – slider – duration). Row 2 is the transport row: info button on the
  left, play/skip centred in the middle, queue on the right. The two 40 px edge
  buttons are what make the 48 px pair sit centred.
- **`sm` and up – one row.** Both row wrappers switch to `sm:contents`, which takes
  them out of the box tree, so their children become items of the single row again;
  `sm:order-*` restores the reading order.

| Item         | `sm:order` | Size                                 |
| ------------ | ---------- | ------------------------------------ |
| info (i)     | 1          | `h-10 w-10`, icon `h-5`              |
| play / pause | 2          | `h-12 w-12`, icon `h-6`              |
| skip         | 3          | `h-12 w-12`, icon `h-6`              |
| elapsed      | 4          | `w-10 sm:w-12`, `text-xs sm:text-sm` |
| seek slider  | 5          | `h-2 flex-1`                         |
| duration     | 6          | `w-10 sm:w-12`, `text-xs sm:text-sm` |
| queue        | 7          | `h-10 w-10`, icon `h-5`              |

The bar itself is `fixed inset-x-0 bottom-0 z-50` with an inner
`mx-auto w-full max-w-2xl px-4 py-3`; the strip uses `gap-2` (which becomes the row
gap on phones).

Two things to know before editing these classes:

- `iconButtonClass` hard-codes `h-8 w-8`, so the larger sizes need Tailwind v4's
  important suffix (`h-12! w-12!`, `h-10! w-10!`).
- Tailwind emits the `sm:` variants **after** the base utilities, so `sm:contents`
  (display) wins over the wrapper's `flex`, and `sm:flex-row` over `flex-col`. That
  is what makes the flattening work; if a `sm:` override ever stops applying, check
  the emitted order in the built CSS before debugging the component.

## Panels

### Track sleeve ("Låtinfo")

- Rendered above the bar while `sleeveOpen`: a blurred, full-bleed cover backdrop
  (falls back to the app icon when the recording has no cover, or when the cover URL
  fails to load), the title, the credits, the recording metadata, the musicians with
  their instruments, and a "Visa text" link to `/texter?song=<id>` – the link is only
  offered when the song actually has lyrics.
- Toggles: the tappable title row above the strip (hidden while the sleeve is open,
  since the sleeve already shows the title) and the permanent info button in the
  strip. Both carry `aria-expanded`.
- Closing: the × button, the "Visa text" link (plain left click only – with a
  modifier the link opens a new tab and deliberately leaves the sleeve alone), and a
  background click anywhere in the bar or on the sleeve.

### Queue ("Spellista")

- A floating panel anchored directly above the bar with `absolute bottom-full`, so it
  never pushes the bar or the page. The outer wrapper is `pointer-events-none` and
  the panel `pointer-events-auto`, so only the panel itself takes clicks.
- Styling is deliberately high-contrast against the page: `rounded-2xl`,
  `border-zinc-300 dark:border-zinc-700`, `bg-white/98 dark:bg-zinc-800/98`,
  `shadow-2xl`, `backdrop-blur-md`, and a list capped at
  `max-h-[min(60vh,20rem)]` with `p-2` padding and `rounded-xl` rows.
- Rows show the title, the artist (from `sm` up) and a remove button.
- Opening the queue folds the sleeve and vice versa – they share the same space
  above the bar.

## Interaction invariants

```ts
const PLAYER_CONTROL_SELECTOR = "button, input, a, [data-player-time]";
```

- The background dismiss is attached to the bar container, so it covers the sleeve,
  the queue and the bar in one place. `closest` walks up from the event target, so a
  press on an icon inside a button still counts as that button.
- Both time labels carry `data-player-time`, which makes the whole time block
  (labels + slider) one control: pressing it never folds the sleeve.
- Left click only (`event.button !== 0` returns early), and a drag that selected text
  is a read, not a tap (`window.getSelection()?.isCollapsed`).
- The handler is a no-op unless `sleeveOpen`, and it only sets UI state – it can
  never touch audio state.

## Manual checklist

1. Play a song from the list: the bar appears, the row is highlighted amber, skip is
   disabled while the queue is empty.
2. Queue two songs: the badge shows `2`, and the panel floats above the bar without
   shifting the layout – check both themes.
3. Drag the slider, press the time labels, play/pause, skip: the sleeve stays open.
   Click anywhere else on the bar or on the sleeve: it folds.
4. On a phone (~360 px) row 2 reads `[i]` left, `[▶ ⏭]` centred, `[☰]` right; from
   `sm` up it is one row with the info button first.
5. A song without a cover and a song with a broken cover URL: the sleeve falls back
   to the app icon and the list thumbnail is dropped.
6. Use `npm run dev:d1` for the full stack (plain `npm run dev` does not serve
   `/api/songs`). If a change seems to be missing, clear stale state first – see
   [PWA.md](./PWA.md).

## Related documentation

- [README.md](../README.md) – project overview, scripts and structure
- [DATABASE.md](./DATABASE.md) – `/api/plays` and `/api/downloads`, data flow
- [PWA.md](./PWA.md) – offline behaviour (audio is never cached) and how to clear
  stale state while verifying a change
- [ADMIN.md](./ADMIN.md) – the admin-side "Låtinfo" section, which is a different
  thing from the player's sleeve
