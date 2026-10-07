// Contract test with lightweight DOM/Maps doubles; no API key or browser needed.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL(`../dist/${name}`,import.meta.url)));
const datasets={'./schools.json':read('schools.json'),'./rp-schools.json':read('rp-schools.json')};
class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.value='';this.checked=false;this.hidden=false;this.dataset={};this.events={};this.className='';this.attributes={};}
  get classList(){return {add:c=>this.toggle(c,true),remove:c=>this.toggle(c,false),toggle:(c,b)=>this.toggle(c,b),contains:c=>this.className.split(' ').includes(c)};}
  toggle(c,b){const s=new Set(this.className.split(' ').filter(Boolean));if(b)s.add(c);else s.delete(c);this.className=[...s].join(' ');}
  append(...children){for(const c of children)this.children.push(...(c.tag==='fragment'?c.children:[c]));}
  replaceChildren(...children){this.children=[];this.append(...children);}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(k,f){this.events[k]=f;}
  dispatch(k){this.events[k]?.({preventDefault(){}});}
  scrollIntoView(){}
  querySelector(){return new Element();}
}
const elements=new Map();
const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const panel=new Element(),brand=new Element();
const document={getElementById:get,createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('fragment'),head:new Element(),
  querySelector:s=>s==='.map-panel'?panel:s==='.brand span:last-child'?brand:s==='.result.active'?get('results').children.find(e=>e.classList.contains('active')):null,
  querySelectorAll:s=>s==='.result'?get('results').children.filter(e=>e.classList.contains('result')):[]};
class Marker {
  constructor(options){Object.assign(this,options);this.visible=true;this.events={};}
  addListener(k,f){this.events[k]=f;}
  setVisible(v){this.visible=v;}
  getPosition(){return this.position;}
  setIcon(v){this.icon=v;}
  setLabel(v){this.label=v;}
  setZIndex(v){this.zIndex=v;}
}
class InfoWindow {setContent(c){this.content=c;}open(o){this.anchor=o.anchor;this.opened=true;}close(){this.opened=false;}}
const google={maps:{Marker,InfoWindow,SymbolPath:{CIRCLE:'circle'},Map:class {fitBounds(){}setZoom(){}},LatLngBounds:class {extend(){}}}};
const context=vm.createContext({document,window:{},google,console,localStorage:{getItem(){return '';},setItem(){}},Option:class extends Element {constructor(text,value){super('option');this.textContent=text;this.value=value;}},fetch:async url=>({ok:true,json:async()=>datasets[url]})});
vm.runInContext(readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),context);
await new Promise(resolve=>setImmediate(resolve));
const state=vm.runInContext('state',context);
context.window.initGoogleMap();
assert.equal(state.markers.length,159,'Every school has a marker');
const visible=()=>state.markers.filter(e=>e.marker.visible);
assert.equal(visible().length,138);
assert.equal(get('results').children.length,138);
get('mint-only').checked=true;get('mint-only').dispatch('change');
assert.equal(visible().length,96);assert.ok(visible().every(e=>e.school.mint_ec));
get('search').value='Horkesgath';get('search').dispatch('input');
assert.equal(visible().length,1);
const hork=visible()[0];const row=get('results').children[0];
row.dispatch('mouseenter');assert.equal(state.hovered.id,hork.school.id);assert.equal(hork.marker.zIndex,1000);
assert.ok(state.info.content.children.some(e=>e.href==='https://gymnasium-horkesgath.de'));
row.dispatch('click');assert.equal(state.selected.id,hork.school.id);assert.equal(get('selection-official').href,hork.school.official_url);
row.dispatch('mouseleave');assert.equal(state.info.anchor,hork.marker);
get('search').value='no-school-found';get('search').dispatch('input');
assert.equal(visible().length,0);assert.equal(state.info.opened,false);assert.equal(get('selection').hidden,true);
get('reset').dispatch('click');assert.equal(visible().length,138);assert.equal(get('mint-only').checked,false);
get('region').value='rp';get('region').dispatch('change');assert.equal(visible().length,21);
assert.ok(visible().every(e=>e.school.region==='rp'));
get('city').value='Koblenz';get('city').dispatch('change');assert.equal(visible().length,2);
const koblenz=visible()[0];koblenz.marker.events.click();assert.equal(state.selected.id,koblenz.school.id);
assert.equal(get('selection-rank').textContent,`№ ${koblenz.school.rank}`);
get('reset').dispatch('click');
// Equal ranks must never cause another school's row to highlight.
const a=state.filtered[0],b=state.filtered[1],saved=b.rank;b.rank=a.rank;
vm.runInContext('renderList(false)',context);
get('results').children[0].dispatch('mouseenter');
assert.equal(document.querySelectorAll('.result').filter(e=>e.classList.contains('hovered')).length,1);
b.rank=saved;
console.log('Interactions OK: 159 markers, both regions, MINT/city/search filters, empty results, hover/click, official links, equal ranks.');
