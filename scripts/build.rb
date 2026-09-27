# Builds the website: src/page.html + src/app.js + config/conference.json + data/stats.json -> docs/index.html
# GitHub Pages serves the docs/ folder.
require 'json'
require 'cgi'

root   = File.expand_path('..', __dir__)
read   = ->(p) { File.read(File.join(root, p), encoding: 'UTF-8') }
config = read.('config/conference.json')
conf   = JSON.parse(config)['conference']
safe   = ->(json) { json.gsub('</', '<\/') }  # keep inline JSON from closing the <script> tag

app  = read.('src/app.js').sub('/*DATA*/') { safe.(read.('data/stats.json')) }.sub('/*CONFIG*/') { safe.(config) }
html = read.('src/page.html')
         .gsub('{{CONF_SHORT}}') { CGI.escapeHTML(conf['short']) }
         .gsub('{{CONF_FULL}}') { CGI.escapeHTML(conf['full']) }
         .sub('<!--APP-->') { app }

out = File.join(root, 'docs/index.html')
File.write(out, html)
warn "built #{out} (#{html.bytesize / 1024} KB)"
