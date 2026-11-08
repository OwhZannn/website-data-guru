# Dashboard UI/UX Audit & Improvement Plan

Date: 2026-11-08 · Status: implemented (Phases 0–6) on branch `feat/dasbor-ui-ux`
Scope: every screen (admin + teacher + auth). Builds on [Tampilan "Bersih Modern"](../specs/2026-11-06-tampilan-bersih-modern-design.md) — keeps its colors, logo, and font. Flows stay the same. The only database change is the `AlasanTolak` table (Phase 3); new API routes are listed in their phases.


> **Implementation status (2026-11-08):** all phases done, one Indonesian spec per phase in `docs/superpowers/specs/2026-11-08-fase{0..6}-*.md`.
> Changes from the plan: bulk approve takes the exact list of files shown in the confirmation (a file replaced by the teacher after the page loaded is skipped, not approved unseen); Phase 6 added the `--garis-input` contrast fix and replaced all hard-coded colors with tokens.

---

## 1. Audit

### 1.1 What exists today

| Screen | File | Current content |
|---|---|---|
| Admin home | `src/app/admin/page.tsx` | Open period name, 2 download buttons, one table "Menunggu pemeriksaan" (name, NIP/NIK, count) |
| Teacher list | `src/app/admin/guru/page.tsx` | Status chips (`.ringkas`), search box, page-size picker, table, pagination |
| Teacher detail | `src/app/admin/guru/[id]/page.tsx` | Two columns: profile `<dl>` + progress ring / stack of document cards with SAH/Tolak buttons and plain-text history |
| Periods / documents | `src/app/admin/periode/**`, `KelolaPeriode`, `KelolaDokumen` | Forms + lists |
| Admins | `src/app/admin/admin/page.tsx`, `KelolaAdmin` | Form + list |
| Teacher dashboard | `src/app/dokumen/page.tsx` | Progress ring, SIAGA notice, one card per document |
| Profile / auth | `profil`, `masuk`, `daftar`, `ganti-sandi` | Single-column forms |

Design system: one `globals.css` (≈400 lines), CSS variables, no component library, no icon set (status icons are text glyphs `↑ ⏳ ✓ !`). Header is `Kepala` with a horizontal tab bar for admins.

### 1.2 Findings

Severity: **H** = hurts daily work, **M** = noticeable friction, **L** = polish.

#### Information architecture & dashboard value
| # | Sev | Finding |
|---|---|---|
| A1 | H | Admin home shows almost no information. No totals (teachers, docs submitted, verified, rejected, pending), no progress for the period, no trend. Admin has to open "Guru" to learn anything. |
| A2 | H | No "work queue" thinking. The pending table lists teachers but not *which* documents or *how long* they have waited. Oldest-first ordering is missing; it is alphabetical. |
| A3 | M | Pending registrations (`disetujui = false`) are only visible inside the teacher list, not on home. |
| A4 | M | No recent activity feed even though `Riwayat` already records every action. |
| A5 | M | Rekap download is the only report. No per-document breakdown (which document is most often rejected/missing). |
| A6 | L | When no period is open, home is just one sentence; no call to action to open/create one. |

#### Navigation & layout
| # | Sev | Finding |
|---|---|---|
| N1 | M | Top tab bar with 4 items works now but does not scale (Periode → Dokumen is a hidden 3rd level, Impor/Tambah are buttons). No breadcrumbs on deep pages (`/admin/guru/[id]`, `/admin/periode/[id]/dokumen`). |
| N2 | M | Teacher detail has no "next / previous pending teacher" — reviewing 50 teachers means back → click → back. |
| N3 | L | Admin pages are `max-width: 1440px` but content is mostly narrow; large screens get wide empty tables. |
| N4 | L | No active-period indicator in the header; period context changes per page via `PilihPeriode`. |

#### Review workflow (biggest time sink)
| # | Sev | Finding |
|---|---|---|
| R1 | H | To check a file the admin clicks "Buka file", which opens Google Drive in a new tab, then returns to click SAH/Tolak. No inline preview. |
| R2 | H | One decision at a time; no bulk "SAH semua yang menunggu" for a teacher, no keyboard shortcuts. |
| R3 | M | Rejection reason is free text every time; no common reasons to pick from. |
| R4 | M | History (`.riwayat`) is a plain `<ul>` of sentences; hard to scan. |
| R5 | L | Status of the document is shown only as a label; card border only changes for DITOLAK. |

#### Tables & lists
| # | Sev | Finding |
|---|---|---|
| T1 | M | No sortable columns (by name, school, progress, last activity). |
| T2 | M | Status filter chips and search are separate; filters are not combinable with school/employee type. |
| T3 | M | Progress per teacher is text only; a small bar would make the list scannable. |
| T4 | L | No sticky table header, no row hover/click-anywhere, no zebra or density option. |
| T5 | L | Mobile: tables scroll horizontally (`.geser`); no card layout on small screens. |

#### Teacher experience
| # | Sev | Finding |
|---|---|---|
| G1 | M | Documents shown in admin-defined order only; no grouping by status ("Perlu tindakan" first: DITOLAK, BELUM). |
| G2 | M | Rejected reason is shown, but there is no clear single "what do I do now" summary at the top. |
| G3 | L | Upload has no drag-and-drop and no visible progress percentage. |
| G4 | L | Profile completeness is a blocking message, not a checklist of missing fields. |

#### Visual design & consistency
| # | Sev | Finding |
|---|---|---|
| V1 | M | Text glyphs as icons render differently per OS and look unfinished. |
| V2 | M | ~40 inline `style={{…}}` across 16 files → inconsistent spacing; no spacing/typography scale tokens. |
| V3 | M | Flat hierarchy: h1, panels and cards all look similar; no stat cards, no section headers with actions. |
| V4 | L | No dark mode; not required but cheap once tokens exist. |
| V5 | L | `--emas` is used only for the tab underline; the brand accent is barely present. |

#### Feedback, states & accessibility
| # | Sev | Finding |
|---|---|---|
| F1 | M | No `loading.tsx` / skeletons; server pages show a blank screen while loading. |
| F2 | M | Success feedback after actions (SAH, Tolak, save) relies on page refresh; no toast. |
| F3 | M | Empty states are a single grey sentence with no guidance or action. |
| F4 | L | Status uses color + text (good), but check contrast of `--tunggu` on `--tunggu-bg` and `--redup` on `--latar` (AA). |
| F5 | L | Confirm dialogs (`Konfirmasi`) are inline; verify focus is moved into them and returned after. |

### 1.3 What already works (keep)
- Clear brand: Kemenag logo and green palette, Plus Jakarta Sans.
- Status always has text, not color only.
- Mobile-first teacher pages, 16px inputs (no iOS zoom).
- In-page confirmation instead of `confirm()`.
- URL-driven filters/pagination (shareable, back button works).

---

## 2. Target experience

**Admin home = "control center"**: in 5 seconds the admin knows how the open period is going and what to do next.

```
┌ Header: logo · Panel Admin · [Periode: 2026 Semester 1 ▾] · nama · Keluar ┐
├ Sidebar ───┬──────────────────────────────────────────────────────────────┤
│ Beranda    │ Breadcrumb                                                  │
│ Antrean  ● │ ┌Stat┐ ┌Stat┐ ┌Stat┐ ┌Stat┐ ┌Stat┐                          │
│ Guru       │ │Guru│ │Lengk│ │Menu│ │Tolak│ │Belum│   (clickable → filter)│
│ Periode    │ └────┘ └────┘ └────┘ └────┘ └────┘                          │
│ Admin      │ ┌ Progress periode (bar stacked by status) ───────────────┐ │
│            │ └─────────────────────────────────────────────────────────┘ │
│            │ ┌ Antrean pemeriksaan (oldest first) ┐ ┌ Perlu persetujuan ┐│
│            │ │ teacher · doc · waiting 3 hari [▶] │ │ 4 pendaftar [Lihat]││
│            │ └────────────────────────────────────┘ ├ Aktivitas terbaru ─┤│
│            │ ┌ Per dokumen: sah/menunggu/tolak/belum┐│ timeline          ││
│            │ └──────────────────────────────────────┘└───────────────────┘│
└────────────┴──────────────────────────────────────────────────────────────┘
```

**Review = focused mode**: file preview on the left, decision panel on the right, keyboard `S` (SAH) / `T` (Tolak) / `J`/`K` (next/prev), auto-advance to the next pending document.

---

## 3. Plan

Each phase is shippable alone. Effort: S ≤ 1 day, M 2–3 days, L ≈ 1 week.

### Phase 0 — Design foundation (M)
Fixes V1, V2, V3, V5, F4.
- [x] Add tokens to `globals.css`: spacing scale (`--s-1…--s-8`), type scale (`--t-xs…--t-2xl`), radii, elevation levels, status colors already exist → add `--info`.
- [x] Add an icon set: `lucide-react` (tree-shaken, MIT). Replace `↑ ⏳ ✓ !` in `KartuDokumen`, labels, buttons.
- [x] New small primitives in `src/components/ui/`: `StatCard`, `Badge` (wraps `.label`), `Section` (title + actions slot), `EmptyState` (icon, text, action), `ProgressBar` (single + stacked), `Breadcrumb`.
- [x] Replace inline `style={{}}` with utility classes or primitives (16 files).
- [x] Contrast check all text/background pairs to WCAG AA; adjust `--redup`/`--tunggu` if needed.
- Done when: no glyph icons, no inline margin styles, Lighthouse a11y ≥ 95 on all pages.

### Phase 1 — Admin layout & navigation (M)
Fixes N1, N3, N4.
- [x] `AdminShell` layout (`src/app/admin/layout.tsx`): collapsible left sidebar on ≥1024px, bottom/drawer nav on mobile. Items: Beranda, Antrean (badge = pending count), Guru, Periode, Alasan penolakan, Admin.
- [x] Global period switcher in header (reuses `pilihPeriode`, stored in `?periode=`), so every admin page shares one period context.
- [x] Breadcrumbs on detail pages.
- [x] Make `Kepala` tab prop optional/legacy; teacher pages keep the simple header.
- Done when: every admin page reachable in ≤ 2 clicks; existing e2e nav tests updated.

### Phase 2 — Admin home dashboard (L)
Fixes A1–A6, F3.
- [x] New `src/lib/dasbor.ts` with one aggregated query per period: totals by teacher status (reuse `hitungStatusGuru`), docs by status, docs by type × status, pending registrations, oldest pending items (`DokumenGuru` MENUNGGU ordered by last `Riwayat.waktu` asc), last 15 `Riwayat` rows.
- [x] Stat cards row (Total guru aktif, Lengkap, Menunggu diperiksa, Ada ditolak, Belum mulai) — each links to `/admin/guru?status=…`.
- [x] Stacked progress bar for the period + "x% lengkap".
- [x] "Antrean pemeriksaan": teacher, document, waiting time ("3 hari"), button to review; oldest first; top 10 + "Lihat semua".
- [x] "Perlu persetujuan" card for unapproved registrations.
- [x] "Per dokumen" table/bar chart (pure CSS bars, no chart lib) to show which document is most often rejected or missing.
- [x] "Aktivitas terbaru" timeline from `Riwayat`.
- [x] Rekap buttons move into a "Unduh" dropdown in the section header.
- [x] No-period state: `EmptyState` with "Buka periode" action.
- [x] Unit tests for `dasbor.ts`; e2e for counts and links.
- Done when: an admin can answer "how many are done / what's next" without leaving home.

### Phase 3 — Review workflow (L)
Fixes R1–R5, N2, F2.
- [x] Queue route `/admin/antrean` (list of all MENUNGGU docs, filter by document type / school).
- [x] Review view on teacher detail: split pane — left `<iframe>` Drive preview (`https://drive.google.com/file/d/{id}/preview`), right decision panel + history. Fallback link if preview blocked.
- [x] Keyboard shortcuts `S`, `T`, `J`, `K`, `?` (help overlay); skip when focus is in an input.
- [x] Auto-advance to next pending doc; "Teacher berikutnya ›" at the end.
- [x] Rejection reason presets (chips: "File tidak terbaca", "Bukan dokumen yang diminta", "Sudah kedaluwarsa", "Tanda tangan/stempel kurang") + free text. Editable by admins:
  - New Prisma model `AlasanTolak { id, teks, urutan, aktif, dibuatPada }` + migration; seed with the four reasons above.
  - New API `src/app/api/admin/alasan/route.ts` (list/create/update/reorder/deactivate; admin only, zod validation).
  - New page `/admin/alasan` (sidebar item "Alasan penolakan") using the same list/form pattern as `KelolaDokumen`.
  - The stored rejection reason stays plain text on `DokumenGuru`/`Riwayat`, so editing or deactivating a preset never changes past decisions.
- [x] Bulk "Sahkan semua yang menunggu" for one teacher (approved): behind `Konfirmasi` that lists every document affected; new batch endpoint that runs in one transaction and writes one `Riwayat` row per document.
- [x] History as a vertical timeline with icons and actor badges.
- [x] Toast component for action results (`role="status"`, aria-live).
- Done when: reviewing 10 documents needs no tab switching and ≤ 2 actions per document.

### Phase 4 — Teacher list (M)
Fixes T1–T5, A3.
- [x] Sortable columns via `?urut=nama|sekolah|progres|aktivitas&arah=asc|desc`.
- [x] Inline mini progress bar column (sah / wajib).
- [x] Combined filter bar: status chips + search + school + employee type (`LABEL_PEGAWAI`), with "Hapus filter".
- [x] Sticky header, whole-row click, hover state.
- [x] Card layout below 640px instead of horizontal scroll.
- [x] "Belum disetujui" as its own chip with count (already sorted to top).
- Done when: `paginasi.spec.ts` and new sort/filter e2e pass.

### Phase 5 — Teacher experience (M)
Fixes G1–G4.
- [x] Top "what to do next" card: counts of Ditolak / Belum / Menunggu with one primary action.
- [x] Group document cards: *Perlu tindakan* (DITOLAK, BELUM) → *Sedang diperiksa* → *Sah* (collapsed by default).
- [x] Drag-and-drop on `TombolUnggah` + upload percentage (XHR progress) while keeping current validation (`periksaBerkas`, `kecilkanGambar`).
- [x] Profile completeness checklist linking to the exact missing fields.
- Done when: `guru.spec.ts`, `guru-periode.spec.ts` pass with updated selectors.

### Phase 6 — States, polish & quality (S–M)
Fixes F1, F2, F5, V4, T4.
- [x] `loading.tsx` skeletons for admin home, guru list, detail, dokumen.
- [x] `EmptyState` everywhere a list can be empty.
- [x] Focus management for `Konfirmasi` and toasts.
- [x] Dark mode (approved): `prefers-color-scheme: dark` overrides of the Phase 0 tokens; logo kept as-is on a light badge; recheck AA contrast for all status colors in dark.
- [x] Playwright visual snapshots for key screens at 375px and 1440px.

---

## 4. Order, risks, decisions

**Suggested order:** 0 → 1 → 2 → 3 → 4 → 5 → 6. Phase 0 is required first; 2 and 3 give the most value; 4–6 can run in parallel after 1.

**Risks**
- Drive `/preview` iframe may be blocked for some files/accounts → always keep "Buka di Drive" fallback.
- Dashboard aggregation on large teacher counts → keep it in one `groupBy` per dimension; avoid loading every `DokumenGuru` row.
- Selector changes break e2e tests → update tests in the same PR as each phase; prefer `getByRole`/`data-testid`.
- New dependency (`lucide-react`) → only one; no chart or UI framework.

**Decisions (confirmed 2026-11-08)**
| # | Question | Decision |
|---|---|---|
| 1 | Admin layout | Left sidebar (Phase 1) |
| 2 | Bulk approve | Yes, per teacher, with confirmation listing affected documents (Phase 3) |
| 3 | Rejection reasons | Editable by admins: new `AlasanTolak` table + `/admin/alasan` page (Phase 3). This is the only database change in the plan. |
| 4 | Dark mode | Yes, follows device setting (Phase 6) |
| 5 | Spec language | Indonesian, one spec per phase in `docs/superpowers/specs/` |

---

## Fase 7 — Tema, menu profil, sidebar baru, gerak, perbaikan tata letak (cabang `feat/tema-dan-tata-letak`)
Detail: [spesifikasi Fase 7](../specs/2026-11-08-fase7-tema-dan-tata-letak-design.md).
- [x] Perbaikan tata letak: hamburger hanya <1024 px, tanpa jalur kosong di sidebar, tombol filter rata dengan isian, tautan tabel jadi tombol halus, konten admin dipusatkan.
- [x] Tema Terang / Gelap / Sistem (`data-tema`, `localStorage['tema']`, skrip awal tanpa kilatan).
- [x] Menu profil kanan atas (avatar, nama, peran, tema, Keluar) dengan papan ketik penuh.
- [x] Sidebar berkelompok, bisa dilipat ke mode ikon, lencana antrean, laci ponsel senada.
- [x] Gerak CSS (transisi halaman, hover kartu, dropdown) dengan dukungan `prefers-reduced-motion`.
- [x] Kontras AA terang dan gelap diuji otomatis; snapshot visual dibuat ulang.
