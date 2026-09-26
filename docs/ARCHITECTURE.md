# Architecture

This document explains the _why_ behind the project's structural decisions —
not what exists (see [README.md](../README.md) for stack, folder structure and
routes, and the feature docs in `docs/` for how each piece works). It exists so
a decision that isn't visible in the code itself doesn't get accidentally
undone later.

## Static export + Cloudflare Functions, not a Next.js server

`next.config.ts` uses `output: "export"`: the whole app builds to static
HTML/CSS/JS, with no Next.js server at runtime. Everything dynamic — the song
catalogue, play counts, gig dates, admin writes — is a separate Cloudflare
Pages Function under `functions/api/*`, backed by D1 and R2.

This keeps hosting to a single static site plus small, independently
deployable Functions, with no Node server to run or scale. The trade-off is
that every page is a client component that fetches its own data at runtime
(`useEffect` + `fetch`) instead of using server-side rendering or static
props — acceptable here since the content changes at the pace of a small
band's admin edits, not per-request.

## The public site is one SPA route, not one route per page

`/`, `/texter` and `/about` are rendered from a single route (`app/page.tsx`).
Switching between them is a client-side view change driven by the URL
(`?view=`/`?song=`, read with `useSearchParams`), never a route navigation — no
`<Link>` between them, no separate `app/texter/page.tsx` or `app/about/page.tsx`.
Old `/texter` and `/about` URLs are kept alive by 301s in `public/_redirects`,
which let the query string through so a `?song=<id>` deep link still selects the
song.

**This one is load-bearing, not a style choice.** `components/StickyPlayer.tsx`
and the Zustand store in `store/playerStore.ts` are mounted once in
`app/layout.tsx`, outside `{children}`, specifically so the audio player
survives while the visitor moves around the site. Giving `/texter` and
`/about` their own routes was tried and caused the player to lose its state
on real navigations — reproducible on mobile Chrome and the installed PWA,
though not on desktop Chrome. Reintroducing separate routes for these three
views will very likely reintroduce that bug. If per-route URLs or metadata
are wanted again for SEO, that needs to be solved without a real navigation
between them (e.g. metadata generated for the single route, or redirects that
resolve into the SPA's own view state) rather than by going back to one
`page.tsx` per view.

`/admin` and its sub-routes are the deliberate exception: a genuinely
different, denser UI (`components/admin/*`, its own nav) that never needs to
share state with the public player, so real Next.js routes are the right fit
there.

## Folder structure

```
app/                        Next.js App Router — routes only, no business logic
├── layout.tsx               root layout: fonts, metadata, <StickyPlayer>, SW registrar
├── page.tsx                 / — the whole public SPA (Lyssna/Texter/Om oss views, see above)
├── admin/
│   ├── page.tsx              /admin — song & recording catalogue editor
│   ├── gigs/page.tsx         /admin/gigs — gig calendar editor
│   └── about/page.tsx        /admin/about — welcome-text + Om oss copy editor
├── robots.ts                 /robots.txt
└── sitemap.ts                /sitemap.xml
components/
├── home/                     Hero, GigList, SongList — the "Lyssna" view
├── about/                    AboutView, install-app card + its pure detection helpers
├── texter/                   TexterView + lyricsLines.ts (pure lyric/chord line filtering)
├── admin/                    admin-only UI — currently flat, target split below
├── publicView.ts             PublicView type + readPublicView() (query string → active view)
├── PublicShell.tsx           shared page chrome (background, padding, SiteNav) for the public SPA
├── SiteNav.tsx               public view switcher — see "The public site is one SPA route"
├── StickyPlayer.tsx          the app-wide audio player — see docs/PLAYER.md
├── TrackSleeve.tsx           the player's expandable "Låtinfo" panel
├── SongRow.tsx               a song-list row: play / queue / download
├── ServiceWorkerRegistrar.tsx
├── iconButton.ts             shared icon-button styles
└── songCredits.ts            shared credits-line formatting
data/                        typed request/response shapes + fetch helpers, one file per resource
                             (songs.ts, gigs.ts, content.ts, admin.ts, siteLinks.ts)
store/
└── playerStore.ts            the one global store — see "Where state lives"
functions/api/               Cloudflare Pages Functions — the actual backend
├── admin/                    write endpoints + _middleware.ts (Access JWT guard), behind Access
└── songs.ts, gigs.ts, content.ts, plays.ts, downloads.ts    public read endpoints
public/                      static assets + the PWA shell (manifest.json, sw.js, icons/)
migrations/                  versioned D1 schema
tests/                       Vitest unit tests — pure helpers only, no component tests
docs/                        one file per feature: DATABASE, UPLOADING, ADMIN, PWA, PLAYER + ARCHITECTURE
```

**Grouping convention:** components are grouped by which public view they
belong to (`home/`, `about/`, `texter/`); anything shared across every view
stays at the top level of `components/`. `data/` and `functions/api/` are one
file per resource, named the same on both sides, so a resource is easy to
trace end-to-end (`gigs.ts` appears in `data/`, `functions/api/` and
`tests/`).

`components/admin/` doesn't follow the group-by-feature convention yet — all
~19 files sit flat in one folder, mixing genuinely shared admin UI with
things that belong to one feature (songs, gigs, site content). Target split
for the upcoming restructuring:

```
components/admin/
  shared/            AdminModal.tsx, adminStyles.ts, adminForms.ts,
                     AdminNav.tsx, Toasts.tsx
                     — used across every admin feature; nothing here should
                     import from songs/, gigs/ or content/
  songs/             SongSection.tsx, SongFields.tsx, NewSongForm.tsx,
                     LyricsEditor.tsx, RecordingCard.tsx, NewRecordingModal.tsx,
                     SheetMusicUpload.tsx, CreditsEditor.tsx,
                     MusicianOverview.tsx, musicianOverview.ts
                     — the song/recording/musician catalogue, i.e. everything
                     behind app/admin/page.tsx
  gigs/              GigsSection.tsx, GigFields.tsx, TimePickerPopover.tsx
                     — behind app/admin/gigs/page.tsx
  content/           ContentEditor.tsx
                     — the welcome-text/Om-oss copy editor, behind
                     app/admin/about/page.tsx
```

This is a proposed grouping, not yet applied — a reference for whoever (or
whichever agent) does the reorg, so the split follows the existing
`app/admin/*/page.tsx` boundaries rather than an arbitrary one. Update this
list if the actual split ends up differing once the work is done.

## Where state lives

| State                                                                          | Lives in                              | Why                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `currentSong`, `queue`, `catalog`, `isPlaying`, `playbackId`                   | Zustand (`store/playerStore.ts`)      | Must be reachable from the song list, the track sleeve and the bar itself, and must survive the visitor switching views                                                                                           |
| Active public view (`lyssna` / `texter` / `about`), selected lyrics song       | URL query string (`?view=`, `?song=`) | Makes the current view shareable and bookmarkable, and restores it on a reload, a shared link or a redirect from an old `/texter` or `/about` URL (switches use `router.replace`, so they add no history entries) |
| Everything else UI-local (`currentTime`, panel open/closed, form drafts, etc.) | Local component state                 | Changes too often or is too view-specific to belong in a global store; keeping it local avoids re-rendering unrelated parts of the tree                                                                           |

See [docs/PLAYER.md](docs/PLAYER.md) for the player's own, more detailed
breakdown of this split.

## Auth boundary

Cloudflare Access protects `/admin*` and `/api/admin*` at the edge; the
Functions layer re-checks the same JWT as defense in depth
(`functions/api/admin/_middleware.ts`). Everything else — the public routes
and their read-only API endpoints — is open by design; there's no user
accounts or auth concept on the public side to protect.
