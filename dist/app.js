'use strict';
const $ = (id) => document.getElementById(id);
const panel = document.querySelector('.map-panel');
const state = {schools: [], region: 'nrw', filtered: [], selected: null, hovered: null, map: null, markers: [], info: null};
const keyStorageName = 'nrw-gymnasien-google-maps-key';
const configuredKey = window.schoolMapConfig?.googleMapsApiKey || '';
let pendingKey = '';
function savedKey() { try { return localStorage.getItem(keyStorageName) || ''; } catch { return ''; } }
function rememberKey(key) { try { localStorage.setItem(keyStorageName, key); } catch { /* Private browsing can block storage. */ } }
function showMapError(message) {
  panel.classList.remove('connected'); $('setup').classList.remove('hidden');
  if (configuredKey) {
    $('key-form').hidden = true;
    $('setup-heading').textContent = 'Не удалось открыть Google Maps';
    $('setup').querySelector('.setup-head p').textContent = message;
  } else $('key-error').textContent = message;
}
const mapsLink = (school) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${school.lat},${school.lng}`)}`;
const fold = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function cityOf(address) { return address.match(/\b\d{5}\s+(.+)$/)?.[1] || address.split(',').at(-1).trim(); }
const regionSchools = () => state.schools.filter(s => s.region === state.region);
const schoolLabel = (school) => school.region === 'rp' ? `MINT-EC · ${school.name}` : `№ ${school.rank} · ${school.name}`;
function updateRegionContent() {
  const rp = state.region === 'rp';
  const source = rp ? 'https://netzwerkkarte.mint-ec.de/' : 'https://schulen.de/toplisten/beste-oeffentliche-schulen-nordrhein-westfalen-min/';
  document.querySelector('.brand span:last-child').textContent = rp ? 'Rheinland-Pfalz · 2026' : 'Nordrhein-Westfalen · 2026';
  $('source-date').textContent = rp ? 'Сеть MINT-EC · 25.09.2026' : 'Данные schulen.de · 24.09.2026';
  $('source-link').href = source; $('source-link').textContent = rp ? 'Список MINT-EC ↗' : 'Исходный рейтинг ↗';
  $('heading').innerHTML = rp ? '21 гимназия<br>MINT-EC в RLP<span>.</span>' : '100 гимназий<br>на карте NRW<span>.</span>';
  $('summary').textContent = rp ? 'Гимназии Rheinland-Pfalz, входящие в официальную сеть MINT-EC. Список без ранжирования.' : 'Первые 100 гимназий по MINT в общем рейтинге государственных школ. Gesamtschulen исключены.';
  $('list-label').textContent = rp ? 'номер на карте · не рейтинг' : 'место в рейтинге schulen.de';
  $('source-note').textContent = rp ? 'По данным официальной карты сети MINT-EC. Порядок школ не означает оценку качества.' : 'Рейтинг отражает предложения школ по MINT, а не качество обучения или результаты учеников.';
  $('source-foot-link').href = source; $('source-foot-link').textContent = rp ? 'Карта сети ↗' : 'Методика ↗';
  $('setup-heading').textContent = rp ? 'Показать все 21 отметку' : 'Показать все 100 отметок';
  $('map-state').textContent = state.map ? `${state.filtered.length} отметок · наведите или нажмите` : 'Карта выбранной гимназии';
}
function renderCities() {
  $('city').replaceChildren(new Option('Все города', ''));
  const cities = [...new Set(regionSchools().map(s => cityOf(s.address)))].sort((a,b) => a.localeCompare(b,'de'));
  for (const city of cities) { const option = document.createElement('option'); option.value = city; option.textContent = city; $('city').append(option); }
}
function renderList(shouldFit=true) {
  const query = fold($('search').value.trim()); const city = $('city').value;
  const all = regionSchools();
  state.filtered = all.filter(s => (!city || cityOf(s.address) === city) && (!query || fold(`${s.name} ${s.address}`).includes(query)));
  $('count').textContent = `${state.filtered.length} из ${all.length} гимназий`;
  if (state.map) $('map-state').textContent = `${state.filtered.length} отметок · наведите или нажмите`;
  const fragment = document.createDocumentFragment();
  for (const school of state.filtered) {
    const button = document.createElement('button');
    button.type='button'; button.className=`result${school.region === 'nrw' && school.rank <= 20 ? ' top' : ''}${state.selected === school ? ' active' : ''}`;
    button.dataset.rank=school.rank;
    button.setAttribute('role','listitem'); button.setAttribute('aria-label',school.region === 'rp' ? `MINT-EC, ${school.name}, ${school.address}` : `${school.rank} место, ${school.name}, ${school.address}`);
    const rank=document.createElement('span'); rank.className='rank'; rank.textContent=school.rank;
    const details=document.createElement('span'); details.className='result-text';
    const title=document.createElement('span'); title.className='result-title'; title.textContent=school.name;
    const place=document.createElement('span'); place.className='result-location'; place.textContent=school.address;
    details.append(title,place); const arrow=document.createElement('span'); arrow.className='result-chevron'; arrow.textContent='›';
    button.append(rank,details,arrow);
    button.addEventListener('mouseenter',()=>previewSchool(school));
    button.addEventListener('mouseleave',()=>clearPreview(school));
    button.addEventListener('focus',()=>previewSchool(school));
    button.addEventListener('blur',()=>clearPreview(school));
    button.addEventListener('click',()=>selectSchool(school)); fragment.append(button);
  }
  $('results').replaceChildren(fragment);
  if (!state.filtered.length) { const message=document.createElement('p'); message.className='empty'; message.textContent='Ничего не найдено. Попробуйте другой город или название.'; $('results').append(message); }
  updateMarkers(shouldFit);
}
function selectSchool(school, scroll=false) {
  state.selected=school; state.hovered=null; $('selection').hidden=false; $('selection-rank').textContent=school.region === 'rp' ? 'MINT-EC' : `№ ${school.rank}`;
  $('selection-name').textContent=school.name; $('selection-address').textContent=school.address;
  $('selection-official').href=school.official_url; $('selection-official').textContent=school.official_url;
  $('selection-profile').href=school.url; $('selection-map').href=mapsLink(school);
  if (state.map) { refreshHighlights(); showMarkerInfo(school); }
  else $('embed').src=`https://maps.google.com/maps?q=${encodeURIComponent(`${school.lat},${school.lng}`)}&z=13&output=embed`;
  renderList(false); if (scroll) document.querySelector('.result.active')?.scrollIntoView({block:'nearest'});
}
function updateMarkers(shouldFit=true) {
  if (!state.map) return;
  const visible=new Set(state.filtered);
  const bounds=new google.maps.LatLngBounds();
  for (const {school,marker} of state.markers) { const show=visible.has(school); marker.setVisible(show); if(show) bounds.extend(marker.getPosition()); }
  if (state.filtered.length && shouldFit) { state.map.fitBounds(bounds,55); if (state.filtered.length===1) state.map.setZoom(13); }
}
function markerIcon(school, active) {
  return {path:google.maps.SymbolPath.CIRCLE,fillColor:active?'#174e45':school.region === 'rp'?'#a7d9ec':school.rank<=20?'#bee36f':'#fff',fillOpacity:1,strokeColor:active?'#fff':school.region === 'rp'?'#27718e':'#23755e',strokeWeight:active?3:2,scale:active?21:school.region === 'rp'?16:school.rank<=20?15:14};
}
function refreshHighlights() {
  if(!state.map)return;
  const highlighted=state.hovered || state.selected;
  for(const {school,marker} of state.markers){
    const active=school===highlighted;
    marker.setIcon(markerIcon(school,active));
    marker.setLabel({text:String(school.rank),color:active?'#fff':'#153e35',fontSize:active?'12px':'10px',fontWeight:'700'});
    marker.setZIndex(active?1000:school.region === 'nrw' && school.rank<=20?100:1);
  }
  document.querySelectorAll('.result').forEach(row=>row.classList.toggle('hovered',state.hovered?.region === state.region && Number(row.dataset.rank)===state.hovered?.rank));
}
function showMarkerInfo(school) {
  if(!state.map)return;
  const entry=state.markers.find(item=>item.school===school);
  if(!entry)return;
  if(!state.info)state.info=new google.maps.InfoWindow({disableAutoPan:true});
  const content=document.createElement('div');content.className='marker-info';
  const rank=document.createElement('strong');rank.textContent=school.region === 'rp' ? 'MINT-EC' : `№ ${school.rank}`;
  const name=document.createElement('span');name.textContent=school.name;
  const official=document.createElement('a');official.href=school.official_url;
  official.target='_blank';official.rel='noopener noreferrer';official.textContent=school.official_url;
  content.append(rank,name,official);state.info.setContent(content);state.info.open({map:state.map,anchor:entry.marker,shouldFocus:false});
}
function previewSchool(school){state.hovered=school;refreshHighlights();showMarkerInfo(school);}
function clearPreview(school){if(state.hovered!==school)return;state.hovered=null;refreshHighlights();if(state.selected)showMarkerInfo(state.selected);else state.info?.close();}
function connectMap() {
  const center={lat:51.22,lng:7.32};
  state.map=new google.maps.Map($('map'),{center,zoom:8,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,gestureHandling:'greedy',styles:[{featureType:'poi',elementType:'labels',stylers:[{visibility:'off'}]}]});
  state.markers=state.schools.map(school=>{
    const marker=new google.maps.Marker({position:{lat:school.lat,lng:school.lng},map:state.map,title:schoolLabel(school),label:{text:String(school.rank),color:'#153e35',fontSize:'10px',fontWeight:'700'},icon:markerIcon(school,false)});
    marker.addListener('click',()=>selectSchool(school,true));
    marker.addListener('mouseover',()=>previewSchool(school));
    marker.addListener('mouseout',()=>clearPreview(school));return {school,marker};
  });
  panel.classList.add('connected'); $('setup').classList.add('hidden'); $('map-state').textContent=`${state.filtered.length} отметок · наведите или нажмите`;
  updateMarkers(true);refreshHighlights();if(state.selected)showMarkerInfo(state.selected);
}
window.initGoogleMap=()=>{if(pendingKey)rememberKey(pendingKey);if(state.schools.length)connectMap();else window.googleMapsReady=true;};
window.gm_authFailure=()=>showMapError('Google отклонил ключ сайта. Проверьте Maps JavaScript API, оплату и разрешённый домен в Google Cloud.');
function loadKey(key) {
  $('key-error').textContent='';
  if (state.map) return;
  pendingKey=key;
  $('setup').classList.add('hidden');
  $('map-state').textContent='Загрузка Google Maps…';
  const script=document.createElement('script');script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=initGoogleMap&loading=async&language=ru`;
  script.async=true;script.dataset.googleMaps='';script.onerror=()=>{script.remove();showMapError('Не удалось загрузить карту. Проверьте подключение к интернету и обновите страницу. Ключ сохранён.');};document.head.append(script);
}
$('key-form').addEventListener('submit',e=>{e.preventDefault();const key=$('api-key').value.trim();if(!key){$('key-error').textContent='Введите API-ключ.';return;}if(document.querySelector('script[data-google-maps]')){rememberKey(key);location.reload();return;}loadKey(key);});
$('setup-close').addEventListener('click',()=>$('setup').classList.add('hidden'));
$('selection-close').addEventListener('click',()=>{$('selection').hidden=true;state.selected=null;renderList();});
$('search').addEventListener('input',()=>{state.selected=null;$('selection').hidden=true;renderList();});
$('city').addEventListener('change',()=>{state.selected=null;$('selection').hidden=true;renderList();});
$('reset').addEventListener('click',()=>{$('search').value='';$('city').value='';state.selected=null;$('selection').hidden=true;renderList();});
$('region').addEventListener('change',()=>{
  state.region=$('region').value; state.selected=null; state.hovered=null; state.info?.close();
  $('selection').hidden=true; $('search').value=''; renderCities(); updateRegionContent(); renderList();
  refreshHighlights();
  if (!state.map && state.filtered.length) selectSchool(state.filtered[0]);
});
Promise.all(['./schools.json','./rp-schools.json'].map(url=>fetch(url).then(r=>{if(!r.ok)throw new Error('data');return r.json()}))).then(([nrw,rp])=>{
  state.schools=[...nrw.map(s=>({...s,region:'nrw'})),...rp];renderCities();updateRegionContent();renderList();if(window.googleMapsReady)connectMap();if(nrw.length && !state.map)selectSchool(state.schools[0]);
}).catch(()=>{$('count').textContent='Ошибка загрузки списка';$('results').innerHTML='<p class="empty">Не удалось загрузить школы. Обновите страницу.</p>';});
const rememberedKey=configuredKey || savedKey();if(rememberedKey){if(!configuredKey)$('api-key').value=rememberedKey;loadKey(rememberedKey);}else $('setup').classList.remove('hidden');
