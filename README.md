# DLM Studios LLC — company website

Single-page static site for **DLM Studios LLC**, the company behind MyOlive.
Purpose: a clear, verifiable company web presence for Apple Developer Program
(Organization) enrollment, App Store Connect, and Dun & Bradstreet records.

- `index.html` — the whole site (self-contained: inline CSS, SVG favicon, no build step)
- `CNAME` — custom domain for GitHub Pages (`dlmstudiosllc.com`)
- `.nojekyll` — tells GitHub Pages to serve files as-is

## Before you publish

Update these if anything changes — they must match your Apple account,
your D-U-N-S record, and your state LLC filing **exactly**:

- Legal name: `DLM Studios LLC`
- State of formation: Connecticut
- Location shown: Orange, Connecticut, United States
- Phone: (203) 694-1802  → also stored as `+1-203-694-1802` in the JSON-LD
- Email: `hello@dlmstudiosllc.com` — **this address must actually receive mail
  before you start Apple enrollment.** Set up forwarding (see below).

Domain: **`dlmstudiosllc.com`** (registered via AWS Route 53). If it ever changes,
update every occurrence — `CNAME`, the `<link rel="canonical">` tag, the JSON-LD
`url` field, and the `hello@` mailto links:
`grep -rn dlmstudiosllc.com .`

## Deploy to GitHub Pages

1. Create a new **public** repo, e.g. `dlmstudios-website`.
2. From this folder:
   ```sh
   git init
   git add .
   git commit -m "DLM Studios company site"
   git branch -M main
   git remote add origin https://github.com/<you>/dlmstudios-website.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages** → Source: `Deploy from a branch`, Branch: `main` / `/ (root)`.
4. Under **Custom domain**, enter `dlmstudiosllc.com`, Save, then tick
   **Enforce HTTPS** once the certificate is issued (can take ~15–60 min).

## DNS (Route 53 hosted zone for `dlmstudiosllc.com`)

Registering the domain in Route 53 auto-creates the hosted zone. In that zone,
Route 53 console → **Create record** for each of these (keep DNS on Route 53 — do
not move nameservers to Cloudflare, or the email step below changes):

| Type  | Name (Record name) | Value / Route traffic to |
|-------|--------------------|--------------------------|
| A     | *(leave blank = apex)* | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (all four in one record, one per line) |
| CNAME | `www`              | `<you>.github.io` |

Route 53 also lets you make the apex an **A / Alias** record, but Alias only
targets AWS resources, not `github.io` — so use the four plain A values above.

Verify once propagated: `dig dlmstudiosllc.com +short` returns the four GitHub IPs.

## Company-domain email (do this before Apple enrollment)

Keep DNS on Route 53 and use a forwarding provider that only needs DNS records —
no nameserver move:

- **ImprovMX** (free) or **Forward Email** (free) — sign up, add the `MX` and
  `TXT` (SPF) records they give you as records in the Route 53 hosted zone, then
  forward `hello@dlmstudiosllc.com` to your real inbox. To *send* as
  `hello@…`, add their SMTP creds to Gmail (Settings → Accounts → Send mail as).
- Prefer a real mailbox: **AWS WorkMail** (~$4/user/mo, same console, adds its
  own MX records) or **Google Workspace** / **Fastmail** (~$6–7/user/mo).

Cloudflare Email Routing is free but requires moving the domain's nameservers to
Cloudflare — skip it while DNS stays on Route 53.

## Where this URL goes

- **Apple Developer Program enrollment (Organization):** Organization website = `https://dlmstudiosllc.com`
- **App Store Connect (MyOlive):** Marketing URL = `https://myolivehealth.com`,
  Support URL = `https://myolivehealth.com/support.html`,
  Privacy Policy URL = `https://myolivehealth.com/privacy-policy.html`
