# Nightly A-10 volleyball stats import.
# Reads each school's cumulative stats page and writes data/stats.json.
# Usage: ruby scripts/scrape.rb [output path]    (set SEASON=2027 to override the year)
# Handles both versions of the schools' stats platform:
#   classic  – stats live in HTML tables (found by <caption>)
#   nuxt     – stats live in the page's embedded __NUXT_DATA__ JSON
require 'json'
require 'time'

SEASON = ENV['SEASON'] || Time.now.year.to_s
SCHOOLS = {
  'duq' => 'goduquesne.com',  'gmu' => 'gomason.com',        'day' => 'daytonflyers.com',
  'slu' => 'slubillikens.com', 'gw' => 'gwsports.com',        'luc' => 'loyolaramblers.com',
  'vcu' => 'vcuathletics.com', 'dav' => 'davidsonwildcats.com', 'for' => 'fordhamsports.com',
  'uri' => 'gorhody.com'
}
OFF = { 'SP'=>'sp','MP'=>'mp','MS'=>'ms','PTS'=>'pts','K'=>'k','E'=>'e','TA'=>'ta','PCT'=>'pct','A'=>'a','SA'=>'sa','SE'=>'se' }
DEF = { 'SP'=>'sp','DIG'=>'dig','RE'=>'re','TA'=>'rta','Rec%'=>'recp','RE#2'=>'rta','RE#3'=>'recp','BS'=>'bs','BA'=>'ba','BLK'=>'blk','BE'=>'be','BHE'=>'bhe' }

def num(v)
  return nil if v.nil?
  s = v.to_s.strip
  return nil if s.empty? || s == '-'
  s.include?('.') ? s.to_f : s.to_i
end

def fetch(host)
  url = "https://#{host}/sports/womens-volleyball/stats/#{SEASON}"
  html = `curl -sL --max-time 60 -A "Mozilla/5.0 (A-10 VB Stat Hub)" "#{url}"`
  html.force_encoding('UTF-8').scrub
  [url, html]
end

def strip_tags(s)
  s.gsub(/<[^>]+>/, ' ').gsub('&amp;', '&').gsub(/&#x27;|&#39;/, "'").gsub(/\s+/, ' ').strip
end

# ---------- classic (HTML tables) ----------
def classic_table(html, caption, map)
  t = html[/<caption[^>]*>\s*#{Regexp.escape(caption)}\s*<\/caption>(.*?)<\/table>/m, 1] or return nil
  parse_rows = lambda do |chunk|
    (chunk || '').scan(/<tr[^>]*>(.*?)<\/tr>/m).map do |(tr)|
      tds = tr.scan(/<td([^>]*)>(.*?)<\/td>/m)
      next if tds.empty?
      name = tr[/<a[^>]*data-player-id[^>]*>(.*?)<\/a>/m, 1] || tds.find { |a, _| a.include?('text-no-wrap') }&.last&.sub(/<button.*?<\/button>/m, '')
      row = { 'num' => strip_tags(tds[0][1]), 'name' => strip_tags(name.to_s) }
      seen = Hash.new(0)
      tds.each do |attrs, val|
        label = attrs[/data-label="([^"]+)"/, 1]
        # some pages repeat a label (RE, RE, RE for RE / TA / Rec%) - tell them apart by position
        label = (seen[label] += 1) > 1 ? "#{label}##{seen[label]}" : label if label
        row[map[label]] = num(strip_tags(val)) if label && map[label]
      end
      row
    end.compact
  end
  { players: parse_rows.(t[/<tbody>(.*?)<\/tbody>/m, 1]), foot: parse_rows.(t[/<tfoot>(.*?)<\/tfoot>/m, 1]) }
end

def merge_split(off, dfn)
  return nil unless off && dfn
  key = ->(r) { "#{r['num']}|#{r['name']}" }
  d = dfn[:players].map { |r| [key.(r), r] }.to_h
  players = off[:players].map { |r| r.merge(d[key.(r)] || {}) }
  df = dfn[:foot].map { |r| [r['name'], r] }.to_h
  foot = off[:foot].map { |r| r.merge(df[r['name']] || {}) }
  { 'players' => players, 'total' => foot.find { |r| r['name'] == 'Total' }, 'opp' => foot.find { |r| r['name'] == 'Opponents' } }
end

def parse_classic(html)
  {
    'all'  => merge_split(classic_table(html, 'Individual Overall Offensive Statistics', OFF),
                          classic_table(html, 'Individual Overall Defensive Statistics', DEF)),
    'conf' => merge_split(classic_table(html, 'Individual Conference Offensive Statistics', OFF),
                          classic_table(html, 'Individual Conference Defensive Statistics', DEF))
  }
end

# ---------- nuxt (embedded JSON) ----------
WRAP = %w[Reactive ShallowReactive Ref ShallowRef EmptyRef EmptyShallowRef]
def devalue(arr, i, depth = 0)
  return nil if depth > 80
  v = arr[i]
  case v
  when Array
    return (v[1].is_a?(Integer) ? devalue(arr, v[1], depth + 1) : v[1]) if v[0].is_a?(String) && WRAP.include?(v[0])
    v.map { |x| x.is_a?(Integer) ? devalue(arr, x, depth + 1) : x }
  when Hash then v.transform_values { |x| x.is_a?(Integer) ? devalue(arr, x, depth + 1) : x }
  else v
  end
end

def nuxt_row(p)
  a, s, sv, d, b, m = p.values_at('attackStats', 'setStats', 'serveStats', 'defenseStats', 'blockStats', 'miscStats').map { |h| h || {} }
  { 'num' => p['playerUniform'].to_s, 'name' => p['playerName'].to_s,
    'sp' => num(p['setsPlayed']), 'mp' => num(p['gamesPlayed']), 'ms' => num(p['gamesStarted']), 'pts' => num(m['points']),
    'k' => num(a['kills']), 'e' => num(a['errors']), 'ta' => num(a['totalAttempts']), 'pct' => num(a['hittingPercentage']),
    'a' => num(s['assists']), 'sa' => num(sv['serviceAces']), 'se' => num(sv['serviceErrors']),
    'dig' => num(d['digs']), 're' => num(d['receptionErrors']), 'rta' => num(d['totalReceptionAttempts']), 'recp' => num(d['receptionPercentage']),
    'bs' => num(b['solos']), 'ba' => num(b['assists']), 'blk' => num(b['totalBlocks']), 'be' => num(b['errors']), 'bhe' => num(m['ballHandlingErrors']) }
end

def parse_nuxt(html)
  json = html[/<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)<\/script>/m, 1] or return nil
  arr = JSON.parse(json)
  root = devalue(arr, 0)
  cs = root.dig('pinia', 'statsSeason', 'cumulativeStats')&.values&.first or return nil
  build = lambda do |list|
    return nil unless list
    rows = list.map { |p| [p['isAFooterStat'], nuxt_row(p)] }
    { 'players' => rows.reject(&:first).map(&:last),
      'total' => rows.find { |f, r| f && r['name'] == 'Total' }&.last,
      'opp' => rows.find { |f, r| f && r['name'] == 'Opponents' }&.last }
  end
  ind = cs['overallIndividualStats'] || {}
  { 'all' => build.(ind['individualStats']), 'conf' => build.(ind['individualStatsConference']) }
end

# ---------- conference standings (atlantic10.com) ----------
NAMES = { 'Duquesne'=>'duq','George Mason'=>'gmu','Dayton'=>'day','Saint Louis'=>'slu','George Washington'=>'gw',
          'Loyola Chicago'=>'luc','VCU'=>'vcu','Davidson'=>'dav','Fordham'=>'for','Rhode Island'=>'uri' }
def standings
  html = `curl -sL --max-time 60 -A "Mozilla/5.0 (A-10 VB Stat Hub)" "https://atlantic10.com/standings.aspx?path=wvball"`.force_encoding('UTF-8').scrub
  html.scan(/<tr[^>]*>(.*?)<\/tr>/m).each_with_object({}) do |(tr), h|
    cells = tr.scan(/<t[dh][^>]*>(.*?)<\/t[dh]>/m).map { |(c)| strip_tags(c) }
    id = NAMES[cells[0]] || NAMES[cells[1]] or next
    rec = cells.select { |c| c =~ /^\d+-\d+$/ }
    h[id] = { 'conf' => rec[0], 'overall' => rec[2] || rec[1], 'streak' => cells.find { |c| c =~ /^[WL]\d+$/ } }
  end
end

# ---------- run ----------
path = ARGV[0] || File.expand_path('../data/stats.json', __dir__)
prev = (JSON.parse(File.read(path)) rescue {})
prev = {} unless prev['season'] == SEASON
now  = Time.now.utc.iso8601

st = (standings rescue {})
if st.size < SCHOOLS.size && prev['standings']
  warn "standings: only #{st.size} teams read, keeping last night's"
  st = prev['standings']
end
out = { 'season' => SEASON, 'updated' => now, 'standings' => st, 'teams' => {} }
warn "standings: #{st.size} teams"

SCHOOLS.each do |id, host|
  url, html = fetch(host)
  data = begin
    html.include?('Individual Overall Offensive Statistics') ? parse_classic(html) : parse_nuxt(html)
  rescue StandardError => e
    warn "#{id}: couldn't read page (#{e.message})"
    nil
  end
  # drop the placeholder "Team" row some schools include when it's all zeros
  %w[all conf].each do |k|
    next unless data && data[k]
    data[k]['players'].reject! { |p| p['name'] == 'Team' && %w[k a sa dig bs ba].all? { |s| (p[s] || 0).zero? } }
  end
  ok = data && data['all'] && data['all']['players'].any?
  if ok
    warn "#{id}: #{data['all']['players'].size} players (#{url})"
    out['teams'][id] = data.merge('source' => url, 'ok' => true, 'fetched' => now)
  elsif (old = prev.dig('teams', id)) && old['ok']
    # school's site was down or changed tonight: keep the last good stats and flag them
    warn "#{id}: FAILED, keeping stats from #{old['fetched']} (#{url})"
    out['teams'][id] = old.merge('stale' => true)
  else
    warn "#{id}: FAILED, no earlier stats to fall back on (#{url})"
    out['teams'][id] = { 'source' => url, 'ok' => false }
  end
end

fresh = out['teams'].count { |_, t| t['ok'] && !t['stale'] }
abort 'No school could be read tonight. Leaving the site unchanged.' if fresh.zero?
File.write(path, JSON.generate(out))
warn "wrote #{path}: #{fresh}/#{SCHOOLS.size} schools refreshed"
