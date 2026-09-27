# Builds the website: src/page.html + src/app.js + data/stats.json -> docs/index.html
# GitHub Pages serves the docs/ folder.
root = File.expand_path('..', __dir__)
page = File.read(File.join(root, 'src/page.html'), encoding: 'UTF-8')
app  = File.read(File.join(root, 'src/app.js'), encoding: 'UTF-8')
data = File.read(File.join(root, 'data/stats.json'), encoding: 'UTF-8').gsub('</', '<\/')
html = page.sub('<!--APP-->') { app.sub('/*DATA*/') { data } }
out  = File.join(root, 'docs/index.html')
File.write(out, html)
warn "built #{out} (#{html.bytesize / 1024} KB)"
