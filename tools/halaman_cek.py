"""Landing page check (Vera). Run from the project folder.

usage: python tools/halaman_cek.py <file.html> [--utm launch/<kode>-utm.csv] [--copy launch/<kode>-SP.md] [--record halaman/halaman.json]
  --utm     every link to a checkout or opt-in domain in the sheet must be one of its url_utm values, and every
            checkout or opt-in row of this page (kode_aset = file name, e.g. LN1-SP) must appear as a link on it
  --copy    every Headline:, Subhead:, Button: value and every > "testimonial" of the copy file appears word for word
  --record  the page has a consistent entry in halaman.json
Always: a button (class btn/button/cta, or role=button) whose href is empty, '#' or '#price' is a dead button (PROBLEM).
Exit 0 = OK, 1 = problems, 2 = usage. Storage rule is a heuristic: every localStorage/sessionStorage
use must come after a 'try {' with no 'catch' in between, inside the same inline script.
"""
import csv, json, os, re, sys
from html.parser import HTMLParser
from urllib.parse import urlsplit

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
TRACKERS = ["fbq(", "gtag(", "googletagmanager.com", "google-analytics.com", "connect.facebook.net",
            "analytics.tiktok.com", "ttq.load", "static.hotjar.com", "clarity.ms"]
PLACEHOLDER = re.compile(r"\[___\]|\[LINK[^\]]*\]?|\[CERITA PENULIS")


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags, self.text, self.scripts, self._skip, self._script = [], [], [], 0, None

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        self.tags.append((tag, a))
        if tag in ("script", "style"):
            self._skip += 1
            self._script = [] if tag == "script" else self._script

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self._skip:
            self._skip -= 1
            if tag == "script" and self._script is not None:
                self.scripts.append("".join(self._script)); self._script = None

    def handle_data(self, data):
        if self._skip:
            if self._script is not None:
                self._script.append(data)
        else:
            self.text.append(data)


def norm(s):
    s = re.sub(r"\*\*|__|(?<!\w)[*_]|[*_](?!\w)", "", s)
    return re.sub(r"\s+", " ", s).strip().lower()


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith("-") or len(args) % 2 == 0:
        print(__doc__); sys.exit(2)
    path, opts = args[0], dict(zip(args[1::2], args[2::2]))
    if set(opts) - {"--utm", "--copy", "--record"} or not os.path.isfile(path):
        print(__doc__ if os.path.isfile(path) else f"file not found: {path}"); sys.exit(2)
    raw = open(path, "rb").read()
    html = raw.decode("utf-8", errors="replace")
    probs, warns = [], []
    size = len(raw)
    if size > 61440:
        probs.append(f"size {size / 1024:.1f} KB, limit 60 KB (61,440 bytes)")
    elif size > 51200:
        warns.append(f"size {size / 1024:.1f} KB, above 50 KB: little room for revisions")
    b64 = sum(len(m) for m in re.findall(r"data:[\w/+.-]+;base64,([A-Za-z0-9+/=\s]+)", html))
    if b64 > 30720:
        probs.append(f"base64 data URIs {b64 / 1024:.1f} KB, limit 30 KB: use image URLs")
    pg = Page()
    pg.feed(html)
    tags = pg.tags
    if not any(t == "meta" and a.get("name", "").lower() == "viewport" for t, a in tags):
        probs.append('missing <meta name="viewport">')
    n_h1 = sum(t == "h1" for t, _ in tags)
    if n_h1 != 1:
        probs.append(f"{n_h1} <h1> elements, need exactly 1")
    if not any(t == "title" for t, _ in tags):
        warns.append("missing <title>")
    if not any(t == "html" and a.get("lang") for t, a in tags):
        warns.append("missing <html lang>")
    imgs = [a for t, a in tags if t == "img"]
    for a in imgs:
        if "alt" not in a:
            probs.append(f"<img> without alt: {a.get('src', '')[:60]}")
    lazy_missing = sum(1 for a in imgs[1:] if a.get("loading") != "lazy")
    if lazy_missing:
        warns.append(f"{lazy_missing} image(s) after the first without loading=\"lazy\"")
    for t, a in tags:
        if t == "form":
            if a.get("method", "").lower() == "post":
                probs.append(f"<form method=post> (action {a.get('action', '')[:50]}): link to the user's own form instead")
            else:
                probs.append("<form> found: forms are blocked on karyawan.ai pages; link to the user's own form instead")
        for k in ("href", "src"):
            v = a.get(k, "")
            if v.startswith("http://"):
                probs.append(f"not https: {v[:70]}")
            elif v.startswith("//"):
                warns.append(f"protocol-relative URL, write https: {v[:70]}")
            if "picsum.photos" in v:
                warns.append(f"placeholder image: {v[:60]}")
        if a.get("target") == "_blank" and "noopener" not in a.get("rel", "").split():
            probs.append(f'target="_blank" without rel="noopener": {a.get("href", "")[:60]}')
    low = html.lower()
    for tr in TRACKERS:
        if tr in low:
            probs.append(f"tracking script '{tr}': measure with UTM links instead")
    for s in pg.scripts:
        for m in re.finditer(r"\b(localStorage|sessionStorage)\b", s):
            before = s[:m.start()]
            t = [x.end() for x in re.finditer(r"\btry\s*\{", before)]
            if not t or re.search(r"\bcatch\b", before[t[-1]:]):
                probs.append(f"{m.group(1)} outside a try block (blocked in the sandbox)")
    for m in sorted(set(PLACEHOLDER.findall(html))):
        probs.append(f"placeholder left: {m}")
    if "lorem ipsum" in low:
        warns.append("lorem ipsum text left")
    links = [a.get("href", "") for t, a in tags if t == "a"]
    for t, a in tags:
        is_btn = re.search(r"\b(btn|button|cta)\b", a.get("class", ""), re.I) or a.get("role", "").lower() == "button"
        if t == "a" and is_btn and a.get("href", "").strip() in ("", "#", "#price"):
            probs.append(f'dead button: href="{a.get("href", "")}" (class "{a.get("class", "")}"): it needs its url_utm before publishing')
    if "--utm" in opts:
        with open(opts["--utm"], encoding="utf-8-sig", newline="") as fh:
            rows = list(csv.DictReader(fh))
        good = {r.get("url_utm", "").strip() for r in rows if r.get("url_utm", "").strip()}
        doms = {urlsplit(r.get(c, "")).netloc.lower() for r in rows for c in ("url_dasar", "url_utm")
                if r.get("tujuan", "").strip() in ("checkout", "opt-in")} - {""}
        for h in links:
            if urlsplit(h).netloc.lower() in doms and h not in good:
                probs.append(f"link to {urlsplit(h).netloc} not in the UTM sheet url_utm: {h[:80]}")
        if not doms:
            warns.append("UTM sheet has no checkout or opt-in rows")
        page, hrefs = os.path.splitext(os.path.basename(path))[0], set(links)
        for r in rows:
            u, tj = r.get("url_utm", "").strip(), r.get("tujuan", "").strip()
            if r.get("kode_aset", "").strip() != page or (u and u in hrefs):
                continue
            msg = f"UTM row {page} {r.get('content', '')} ({tj}) has no matching link on the page" + ("" if u else ": url_utm empty, Kemal runs --fill")
            (probs if tj in ("checkout", "opt-in") else warns).append(msg)
    if "--copy" in opts:
        text = norm(" ".join(pg.text))
        omit, sec_lines, cur = False, [], []
        for line in open(opts["--copy"], encoding="utf-8-sig").read().splitlines() + ["## end |"]:
            if re.match(r"^##\s+[\w-]+\s*\|", line):
                if cur and "\n".join(cur).strip() != "(omit)":
                    sec_lines += cur
                cur = []
            else:
                cur.append(line)
        for line in sec_lines:
            m = re.match(r"^(Headline|Subhead|Button):\s*(.+)$", line) or re.match(r'^\s*>\s*["“](.+)["”]\s*$', line)
            if m:
                want = m.group(m.lastindex)
                if norm(want) not in text:
                    probs.append(f"copy not on the page word for word: {want[:70]}")
    if "--record" in opts:
        rec = opts["--record"]
        data = json.load(open(rec, encoding="utf-8")) if os.path.isfile(rec) else []
        mine = [e for e in data if os.path.basename(str(e.get("file", ""))) == os.path.basename(path)]
        if not mine:
            warns.append(f"no entry for {os.path.basename(path)} in {rec} yet (fine before the first save)")
        for e in mine:
            miss = [k for k in ("kode", "file", "pageId", "title", "preview_url", "public_url", "published", "size_kb", "updated") if k not in e]
            if miss:
                probs.append(f"{rec}: entry missing {', '.join(miss)}")
            if abs(float(e.get("size_kb") or 0) - size / 1024) > 1:
                warns.append(f"{rec}: size_kb {e.get('size_kb')} but file is {size / 1024:.1f} KB (save again and update)")
            if e.get("published") is True and not e.get("public_url"):
                probs.append(f"{rec}: published true without public_url")
    for p in probs:
        print("PROBLEM", p)
    for w in warns:
        print("WARN", w)
    print("OK" if not probs else f"{len(probs)} problems", f"({len(warns)} warnings, {size / 1024:.1f} KB, base64 {b64 / 1024:.1f} KB)")
    sys.exit(1 if probs else 0)


if __name__ == "__main__":
    main()
