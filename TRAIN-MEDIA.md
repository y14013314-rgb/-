# Train collection — supplied material integration

This is a local update, not a deployment. The original four main navigation entries and product-category URL `/silk-road-luxury-trains/` remain. No original user PDF or video was modified.

## Source inventory

All material was read from `/Users/shy/Desktop/列车/`. Eight PDFs (168 pages in total) were inspected using page previews, embedded text and macOS Vision OCR for scanned pages. The Chinese and English Jinxiu Dongfang documents describe one product and are not duplicated as separate products.

| Detail URL under `/silk-road-luxury-trains/` | Documents |
| --- | --- |
| `chengdu/` | `成都号列车手册（定）.pdf`; `21/2027成都号南北疆(秋韵鎏境0515GX).pdf`; `22/2027成都号南北疆(仲夏长卷0515GX).pdf` |
| `jinxiu-dongfang/` | `8/非独库版2027年锦绣东方南北疆行程10.23.pdf`; `9/（非独库版）英文版 2027年锦绣东方南北疆行.pdf` |
| `jinxiu-tianfu/` | `12/【天山牧歌版】2027天府号新疆16日行程手册.pdf` |
| `baiyun/` | `16/【金风画卷版】2027年白云号新疆18日行程  07.1.pdf`; `17/【天山锦书版】2027年白云号新疆18日行程  07.1.pdf` |

The supplied English Dongfang PDF uses “Golden Panda Express”; this is explicitly paired with 锦绣东方号, rather than being confused with Chengdu’s Golden Panda Restaurant. Tianfu’s 92 seats and Chengdu’s 18 cars / 54 compartments / 108 standard places are brochure specifications, not live inventory. Only Chengdu’s supplied materials specify cabin sizes used on these pages. No cabin dimensions were invented for the other trains.

Routes are English summaries of the supplied documents. Seasonal editions and touring-section options remain distinct. Pages retain the brochures’ limitations on combining section options and describe applicable supplements. Duku-road and border-access restrictions are flagged; nationality, access, season, high-altitude suitability, operating dates, final hotel selection, service languages and cabin availability require confirmation in the proposal. No new public sales price or live availability is asserted. Brochure contract provisions were not adopted as SUKHA website booking terms.

## Images

All seven content photographs/illustrations are PDF-derived WebP files in `public/assets/trains/`:

- `chengdu-exterior.webp`: embedded image from handbook PDF page 2.
- `chengdu-cabin.webp`: embedded image from handbook PDF page 5.
- `chengdu-dining.webp`: embedded image from handbook PDF page 7.
- `chengdu-lounge.webp`: embedded image from handbook PDF page 8.
- `tianfu-sayram.webp`: crop of PDF 12, page 9; Sayram Lake route illustration, not a train view.
- `dongfang-kanas.webp`: crop of Chinese PDF 8, page 6; Kanas route illustration, not a train view.
- `baiyun-salon.webp`: crop of PDF 16, page 4; promotional interior illustration, not verified final configuration.

The eighth image, `silk-road-film-poster.webp`, is only the poster for the supplied Silk Road Express video, extracted from that video. No Chengdu photograph is used to represent Silk Road Express. No AI-generated imagery was added. Page captions distinguish brochure illustrations from train photography.

## Videos

- `成都号首发(终稿 定).mp4` → `chengdu-film.mp4`, full approximately 50.367-second film on the Chengdu detail page; Chinese titles.
- `宣传片产品向.mp4` → `collection-film.mp4`, full 190-second Silk Road Express / 丝路梦享号 film on the category page; English subtitles already in the original. This is a separate train from the four PDF products. Its current operating itinerary and detailed cabins were not provided, so no unsupported detail page was invented.

Both are optimized 960×540 MP4 web derivatives retaining audio. Videos use native controls, playsinline and preload=none, with no autoplay. The category and Chengdu detail pages do not repeat the same film. The Worker build includes video/mp4 assets and supports single byte ranges, suffix ranges, open-ended ranges, HEAD and invalid-range responses so browser seeking works. The original preview server was replaced on the same 127.0.0.1:8765 address with a static server supporting video ranges; its script is `/tmp/sukha-preview.py`.

## About Us and inquiries

`public/our-story/index.html` contains the full user-provided English company introduction, with existing planning steps, legal company name and Devin’s verified project contacts. Original page URL is retained. No unrelated destination/cruise content or media was changed in this update.

The four train detail CTAs prefill product name, route, duration and Luxury rail style using the existing quote builder. Its rail path detection now covers the nested detail URLs. No actual messages were sent, and automatic CRM/email receipt remains disabled.

Evidence, source mapping, OCR records and screenshots are under `../outputs/train-materials/`. Public text is maintained in the existing static HTML. Rebuild using `node scripts/build-worker.mjs`; validate with `node scripts/validate-worker.mjs`. New details are listed in the sitemap. Do not run the historical content-generation scripts over the maintained public HTML.

## Latest layout revision (2026-11-06)

The user's later instruction selects the existing cruise layout as the reference. Both overview pages now use `.cruise-collection-list` / `.cruise-collection-card` from the original cruise stylesheet. Neither overview contains a video, film button or iframe. Train details reuse the cruise hero/gallery component; Chengdu's four distinct PDF images form a gallery, while other products keep a single image rather than duplicating images to simulate a carousel.

Chengdu retains its own launch film. The three trains without their own film share the newly supplied `6.24安逸号2.MP4`, clearly labelled as Anyi train reference footage, not footage of the selected product. The old Silk Road Express video file is retained but its overview display has been removed.

Gold details use the supplied Gold promotional film. Miracle uses the supplied Gold/Miracle/Memory collection film, labelled as a shared film. Explorer and Century details offer the existing English Three Gorges regional report, explicitly identified as regional footage rather than vessel footage. The files `长江记忆宣传片.mp4` and `纯净版.mp4` (whose frames identify Changjiang Memory) were inspected and left unused because no existing Changjiang Memory product page is present. They were not assigned to unrelated ships. Original files remain untouched.

Video posters come from their respective supplied films. All video playback remains user initiated, with preload=none. Cruise galleries and voyage/ship JSON data were compared byte-for-byte with the pre-revision snapshot and retained. Verification and screenshots for this revision supersede the previous layout screenshots: `../outputs/collection-layout/`.

## Publication packaging repair

Version 26 was saved but its ~95 MiB single-file bundle failed platform startup twice (`no healthy upstream`), with no Worker error logs returned. Before the next publication, the build was adjusted to exclude locally stored MP4 files not referenced by a page, and the four active films were encoded as full-length 640×360 H.264/AAC web copies. Original web encodes and original cruise JPEGs are preserved in `../outputs/publish-video-backups/` and `../outputs/publish-image-backups/`; the user's desktop originals were untouched. Brochure JPEG resources were optimized for web display without changing the depicted scenes or their URLs. Runtime features and page content are unchanged. This packaging revision supersedes the earlier 960×540 derivative specification.
