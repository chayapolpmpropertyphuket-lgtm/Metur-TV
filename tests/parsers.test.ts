import test from 'node:test';
import assert from 'node:assert/strict';
import { parseM3U } from '../src/utils/m3uParser';
import { parseW3U } from '../src/utils/w3uParser';

test('M3U: parses BOM, CRLF, metadata, and channel number', () => {
  const source = '\uFEFF#EXTM3U\r\n#EXTINF:-1 tvg-name="News HD" tvg-logo="https://img.test/news.png" tvg-chno="7" group-title="News",News HD\r\nhttps://stream.test/news.m3u8';
  const result = parseM3U(source, 'My Playlist');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, 'News HD');
  assert.equal(result.items[0].poster, 'https://img.test/news.png');
  assert.equal(result.items[0].channelNumber, '7');
  assert.equal(result.items[0].group, 'News');
  assert.equal(result.items[0].serverName, 'My Playlist');
  assert.deepEqual(result.groups, ['News']);
});

test('M3U: parses VLC request headers and resets them between entries', () => {
  const source = [
    '#EXTM3U',
    '#EXTINF:-1,One',
    '#EXTVLCOPT:http-user-agent=MeturTV',
    '#EXTVLCOPT:http-referrer=https://origin.test/',
    'https://stream.test/one',
    '#EXTINF:-1,Two',
    'https://stream.test/two',
  ].join('\n');
  const { items } = parseM3U(source);
  assert.deepEqual(items[0].headers, { 'User-Agent': 'MeturTV', Referer: 'https://origin.test/' });
  assert.equal(items[1].headers, undefined);
});

test('M3U: resolves relative stream URLs against the source URL', () => {
  const result = parseM3U('#EXTM3U\n#EXTINF:-1,Relative\n../live/channel.m3u8', 'Relative', 'https://host.test/lists/main.m3u');
  assert.equal(result.items[0].streamUrl, 'https://host.test/live/channel.m3u8');
});

test('M3U: ignores comments, blank lines, and unsupported schemes', () => {
  const result = parseM3U('#EXTM3U\n\n# comment\n#EXTINF:-1,Invalid\nfile:///tmp/a\n#EXTINF:-1,Valid\nhttps://host.test/a');
  assert.deepEqual(result.items.map(item => item.title), ['Valid']);
});

test('W3U: parses grouped stations and playlist metadata', () => {
  const source = JSON.stringify({
    name: 'Wiseplay Test', author: 'Tester', info: 'Sample',
    groups: [{ name: 'Sports', stations: [{ name: 'Sport One', image: 'https://img.test/sport.png', url: 'https://stream.test/sport.m3u8' }] }],
  });
  const result = parseW3U(source);
  assert.equal(result.playlist.name, 'Wiseplay Test');
  assert.equal(result.playlist.author, 'Tester');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, 'Sport One');
  assert.equal(result.items[0].type, 'channel');
  assert.equal(result.items[0].group, 'Sports');
  assert.deepEqual(result.groups, ['Sports']);
});

test('W3U: parses direct stations and merges header directives', () => {
  const result = parseW3U(JSON.stringify({
    stations: [{ name: 'Radio', url: 'https://stream.test/radio', headers: { Authorization: 'Bearer test' }, userAgent: 'MeturTV', referer: 'https://origin.test' }],
  }));
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].type, 'stream');
  assert.deepEqual(result.items[0].headers, {
    Authorization: 'Bearer test', 'User-Agent': 'MeturTV', Referer: 'https://origin.test',
  });
  assert.equal(result.items[0].group, 'General');
});

test('W3U: resolves relative URLs against the source URL', () => {
  const result = parseW3U(JSON.stringify({ stations: [{ name: 'Relative', url: '../live/a.m3u8' }] }), 'List', 'https://host.test/playlists/list.w3u');
  assert.equal(result.items[0].streamUrl, 'https://host.test/live/a.m3u8');
});

test('W3U: supports a root array and rejects malformed JSON', () => {
  const result = parseW3U(JSON.stringify([{ name: 'Root item', url: 'https://stream.test/root' }]));
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].group, 'Imported');
  assert.throws(() => parseW3U('{not-json'), /รูปแบบไฟล์ W3U ไม่ถูกต้อง/);
});

test('Playlist resolver detects M3U regardless of URL/file extension', async () => {
  const { resolvePlaylistContent } = await import('../src/utils/playlistResolver');
  const result = resolvePlaylistContent('#EXTM3U\n#EXTINF:-1,News\nhttps://stream.test/news');
  assert.equal(result.type, 'm3u');
  assert.equal(result.items[0].title, 'News');
});
test('Playlist resolver detects W3U JSON without a .w3u extension', async () => {
  const { resolvePlaylistContent } = await import('../src/utils/playlistResolver');
  const result = resolvePlaylistContent(JSON.stringify({ stations: [{ name: 'Radio', url: 'https://stream.test/radio' }] }));
  assert.equal(result.type, 'w3u');
  assert.equal(result.items[0].title, 'Radio');
});
test('Playlist resolver extracts embedded M3U and W3U from HTML wrappers', async () => {
  const { resolvePlaylistContent } = await import('../src/utils/playlistResolver');
  const m3u = resolvePlaylistContent('<html><body><pre>#EXTM3U\n#EXTINF:-1,HTML News\nhttps://stream.test/html</pre></body></html>');
  assert.equal(m3u.type, 'm3u');
  assert.equal(m3u.items[0].title, 'HTML News');
  const payload = JSON.stringify({ stations: [{ name: 'Embedded', url: 'https://stream.test/embedded' }] });
  const w3u = resolvePlaylistContent('<html><body><textarea>' + payload + '</textarea></body></html>');
  assert.equal(w3u.type, 'w3u');
  assert.equal(w3u.items[0].title, 'Embedded');
});
test('Playlist resolver rejects HTML pages without an embedded playlist', async () => {
  const { resolvePlaylistContent } = await import('../src/utils/playlistResolver');
  assert.throws(() => resolvePlaylistContent('<html><body><h1>Please sign in</h1></body></html>'), /ไม่พบข้อมูล Playlist/);
});
