# geeksecurity.in

The GeekSecurity website. Plain HTML, CSS and JavaScript with a three.js background, hosted free on GitHub Pages. No build step.

- **Change the content:** edit `js/data.js` (scams, resource links, checkup items, follower count).
- **Change the text of fixed sections:** edit `index.html`.
- **Preview locally:** `python3 -m http.server 8000` in this folder, then open http://localhost:8000.
- **Publish:** `git add -A && git commit -m "update" && git push`. The site updates in about a minute.

`CNAME` holds the custom domain. three.js is vendored in `vendor/` (MIT licence).
