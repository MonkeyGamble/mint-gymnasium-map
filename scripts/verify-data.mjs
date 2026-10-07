import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = name => JSON.parse(readFileSync(new URL(`../dist/${name}`, import.meta.url)));
const sets = {nrw:read('schools.json'),rp:read('rp-schools.json')};
const metadata = read('data-sources.json');
const schools = Object.values(sets).flat();
assert.equal(new Set(schools.map(s=>s.id)).size, schools.length, 'Unique school IDs');
assert.equal(new Set(schools.map(s=>s.url)).size, schools.length, 'No duplicated school profiles');
assert.equal(new Set(metadata.membership_review.map(s=>s.mint_ec_id)).size,132,'Review every regional network entry');
for (const [region, rows] of Object.entries(sets)) {
  assert.equal(rows.length,metadata.counts[region].total);
  assert.equal(rows.filter(s=>s.mint_ec).length,metadata.counts[region].mint_ec);
  assert.equal(rows.filter(s=>s.collection==='mint_ec_top_300').length,metadata.counts[region].added);
  let previous=0;
  for (const s of rows) {
    assert.equal(s.region,region);
    assert.ok(Number.isInteger(s.rank) && s.rank>=1 && s.rank<=300);
    assert.ok(s.rank>=previous,'Sorted by regional rank'); previous=s.rank;
    assert.ok(s.name && /\d{5}/.test(s.address));
    assert.ok(Number.isFinite(s.lat) && Number.isFinite(s.lng));
    assert.ok(s.lat>48.9 && s.lat<52.6 && s.lng>5.8 && s.lng<9.6,`Regional coordinates: ${s.name}`);
    for (const key of ['url','official_url','rank_source']) assert.ok(['http:','https:'].includes(new URL(s[key]).protocol));
    assert.equal(s.verified_at,metadata.checked_at);
    if(s.mint_ec) {
      assert.equal(new URL(s.mint_ec_url).hostname,'netzwerkkarte.mint-ec.de');
      const entry=metadata.membership_review.find(m=>m.mint_ec_id===s.mint_ec_id);
      assert.equal(entry?.status,'included');
      assert.equal(entry.rank,s.rank);
      assert.equal(entry.ranking_profile,s.url);
      assert.equal(entry.region,s.region);
    } else assert.equal(s.collection,'original','Only verified MINT-EC schools may be added');
  }
}
for(const m of metadata.membership_review) {
  const included=schools.filter(s=>s.mint_ec_id===m.mint_ec_id);
  assert.equal(included.length,m.status==='included'?1:0,`Membership coverage: ${m.name}`);
  if(m.status==='outside_top_300') assert.ok(m.rank>300);
}
const horkesgath=schools.find(s=>s.mint_ec_id===3941);
assert.ok(horkesgath?.mint_ec && horkesgath.region==='nrw');
assert.equal(new URL(horkesgath.official_url).hostname,'gymnasium-horkesgath.de');
assert.equal(sets.nrw.filter(s=>s.collection==='original').length,100);
assert.equal(sets.rp.filter(s=>s.collection==='original').length,21);
console.log(`Data OK: ${schools.length} schools, ${schools.filter(s=>s.mint_ec).length} MINT-EC, all 132 network records reviewed.`);
