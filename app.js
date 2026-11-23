(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').toLocaleLowerCase('ru').replace(/ё/g,'е');
const link=(url,label)=>/^https?:\/\//.test(url||'')?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'';
const groups=[['Камера',['angles','movement','shotscale','optics']],['Кадр и свет',['composition','lighting','miseen','mirror']],['Цвет и фактура',['color','texture','eravisual','vfx']],['Монтаж и время',['editing','transitions','rhythm','format']],['Звук и текст',['sound','typography','infographic']],['История и герои',['narrative','metaphor','surreal','character']],['Форматы и задачи',['modern','documentary','television']],['Авторский почерк',['directors']]];
const names={vfx:'Спецэффекты',angles:'Ракурсы',movement:'Движение',shotscale:'Крупности',optics:'Оптика',composition:'Композиция',lighting:'Свет',miseen:'Мизансцена',mirror:'Отражения',color:'Цвет',texture:'Текстура',eravisual:'Эпохи',editing:'Монтаж',transitions:'Переходы',rhythm:'Время и ритм',format:'Формат экрана',sound:'Звук',typography:'Типографика',infographic:'Инфографика',narrative:'История',metaphor:'Метафоры',surreal:'Сюрреализм',character:'Персонаж',modern:'Реклама',documentary:'Документалистика',television:'Сериалы',directors:'Режиссёры'};
const bookmark='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
const plural=(n,forms)=>forms[n%100>=11&&n%100<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2];
const play='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 2 10 6-10 6z"/></svg>';
const {categories,references,videos}=window.CINEMA;
const aiDemo=d=>/ИИ|Melies|GrokCine|Higgsfield|Риачи|AI Camera/i.test(d.label||'')||/aicameramovements|fashion-camera-movements|melies.co|grokcine|higgsfield/.test(d.page);
const cards=categories.flatMap(category=>category.techniques.map(tech=>{
 const ref=references[tech.refId]||{},examples=[],seen=new Set();
 for(const d of [...(ref.demos||[])].sort((a,b)=>Number(aiDemo(a))-Number(aiDemo(b)))) { const clip=videos[d.page];if(clip&&!seen.has(clip.src)){seen.add(clip.src);examples.push({...d,...clip,type:'video',ai:aiDemo(d)});} }
 for(const f of ref.frames||[]) { if(!seen.has(f.id)){seen.add(f.id);examples.push({...f,type:'photo',src:`frames/${f.id}.webp`,poster:`frames/${f.id}.webp`,label:f.title||f.collection,caption:f.caption||ref.caption,ai:!!f.ai});} }
 for(const d of ref.demos||[]) for(const f of (videos[d.page]?[]:d.frames||[])) {if(!seen.has(f.id)){seen.add(f.id);examples.push({...f,type:'photo',src:`frames/${f.id}.webp`,poster:`frames/${f.id}.webp`,label:f.title||d.label,caption:d.caption,ai:aiDemo(d)});}}
 return {...tech,category,ref,examples,search:norm([tech.name,tech.nameEn,tech.desc,tech.usage,tech.films,tech.aliases,tech.searchDetails,category.title,ref.caption,...examples.map(e=>[e.label,e.caption,e.credit].join(' '))].join(' '))};
}));
const byId=new Map(cards.map(c=>[String(c.refId),c]));
let saved=new Set();try{saved=new Set(JSON.parse(localStorage.getItem('cinema-guide-favorites-v1')||'[]').map(String));}catch{}
let state={mode:'all'};
let renderedSearch='',scrollFrame=0;
let current=null,selectedExample=0,zoomIndex=0,trail=[],routeOwned=false,hoverObserver,toastTimer;
const dialog=$('#detailDialog');
const available=c=>c.examples;
const preview=c=>{const a=available(c);return a.find(e=>e.type==='video')||a[0];};
function readFilters(){const p=new URLSearchParams(location.search);state.mode=['all','video','saved'].includes(p.get('mode'))?p.get('mode'):'all';}
function syncURL(){const p=new URLSearchParams();if(state.mode!=='all')p.set('mode',state.mode);history.replaceState(null,'',location.pathname+(p.size?'?'+p:'')+location.hash);renderedSearch=location.search;}
function updateCurrentCard(){ $$('[data-open]').forEach(b=>b.setAttribute('aria-expanded',!!current&&String(current.refId)===b.dataset.open)); }
function setPanelLayout(){
 const open=dialog.open,compact=matchMedia('(max-width: 760px)').matches;
 const changing=document.body.classList.contains('detail-open')!==open;
 const selected=current?document.querySelector(`[data-open="${current.refId}"]`):null;
 const visible=el=>{const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;};
 const anchor=changing&&!compact?(selected&&visible(selected)?selected:$$('.card-open').find(visible)):null;
 const before=anchor?.getBoundingClientRect().top;
 document.body.classList.toggle('detail-open',open);
 $('.library-layout').inert=open&&compact;$('.site-footer').inert=open&&compact;
 dialog.setAttribute('aria-modal',open&&compact?'true':'false');
 if(anchor)window.scrollBy(0,anchor.getBoundingClientRect().top-before);
 updateCurrentCard();
}
function notify(s){clearTimeout(toastTimer);$('#toast').textContent=s;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,2400);}
function toggleSaved(id){id=String(id);saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('cinema-guide-favorites-v1',JSON.stringify([...saved]));}catch{notify('Избранное доступно до закрытия этой страницы');}updateSaved();if(state.mode==='saved')render();}
function updateSaved(){ $('#savedCount').textContent=saved.size;$$('[data-save]').forEach(b=>{const yes=saved.has(b.dataset.save);b.setAttribute('aria-pressed',yes);b.setAttribute('aria-label',yes?'Убрать из избранного':'В избранное');});if(current){$('#saveDetail').textContent=saved.has(String(current.refId))?'В избранном · убрать':'Сохранить в избранное';$('#saveDetail').setAttribute('aria-pressed',saved.has(String(current.refId)));}}
const orderedCategories=groups.flatMap(([,ids])=>ids).map(id=>categories.find(c=>c.id===id)).filter(Boolean);
function renderNavigation(result){
 const entries=orderedCategories.map(category=>({category,count:result.filter(c=>c.category.id===category.id).length})).filter(x=>x.count);
 $('#sectionNavigation').style.setProperty('--nav-count',entries.length||1);
 $('#sectionNavigation').innerHTML=entries.map(({category:c,count})=>`<a href="#section-${c.id}" data-section="${c.id}"><span>${names[c.id]}</span></a>`).join('')||'<p class="nav-empty">Нет разделов в этом режиме</p>';
 updateActiveSection();
}
function updateActiveSection(){
 const sections=$$('.catalog-section');if(!sections.length)return;
 const offset=matchMedia('(max-width: 760px)').matches?85:100;
 let active=sections[0];for(const section of sections){if(section.getBoundingClientRect().top<=offset)active=section;else break;}
 $$('#sectionNavigation a').forEach(a=>{if(a.dataset.section===active.dataset.section){a.setAttribute('aria-current','location');}else a.removeAttribute('aria-current');});

}
function jumpToSection(){const match=/^#section-([a-z]+)$/.exec(location.hash);if(match)document.getElementById('section-'+match[1])?.scrollIntoView({block:'start'});updateActiveSection();}
function closeSectionMenu(){ $('.section-sidebar').classList.remove('menu-open');$('#toggleSections').setAttribute('aria-expanded','false');$('#toggleSections').textContent='Открыть меню'; }
function pausePreviews(){ $$('.card-media video').forEach(v=>{v.pause();v.parentElement.classList.remove('is-playing');}); }
function render(){pausePreviews();hoverObserver?.disconnect();$$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===state.mode));
 const result=cards.filter(c=>(state.mode!=='saved'||saved.has(String(c.refId)))&&(state.mode!=='video'||c.examples.some(e=>e.type==='video')));
 $('#resultCount').textContent=`${result.length} ${plural(result.length,['приём','приёма','приёмов'])}`;$('#videoCount').textContent=cards.filter(c=>c.examples.some(e=>e.type==='video')).length;
 const cardHTML=c=>{const e=preview(c),vc=available(c).filter(e=>e.type==='video').length;return `<article class="card"><button class="card-open" type="button" data-open="${c.refId}" aria-controls="detailDialog" aria-expanded="false" aria-label="Открыть разбор: ${esc(c.name)}"><span class="card-media${e?'':' no-media'}">${e?`<img src="${esc(e.poster)}" alt="${esc(e.label)}" loading="lazy" decoding="async">${e.type==='video'?`<video muted loop playsinline preload="none" data-src="${esc(e.src)}" aria-hidden="true" tabindex="-1"></video><span class="media-label">${play} ${vc>1?vc+' видео':'Видео'}</span>`:''}`:'Разбор приёма'}</span><span class="card-copy"><span class="card-meta">${names[c.category.id]||esc(c.category.title)}</span><span class="card-name">${esc(c.name)}</span><span class="card-name-en">${esc(c.nameEn)}</span><span class="card-description">${esc(c.desc)}</span><span class="card-tags"><span class="${e?.ai?'ai-tag':''}">${e?(e.ai?'ИИ-пример':e.type==='video'?'Кино · видео':'Кинокадр / фото'):'Разбор'}</span>${c.examples.length>1?`<span>${c.examples.length} ${plural(c.examples.length,['пример','примера','примеров'])}</span>`:''}</span></span></button><button class="bookmark" type="button" data-save="${c.refId}">${bookmark}</button></article>`;};
 $('#cards').innerHTML=orderedCategories.map(category=>{const items=result.filter(c=>c.category.id===category.id);return items.length?`<section class="catalog-section" id="section-${category.id}" data-section="${category.id}" aria-labelledby="heading-${category.id}"><div class="category-heading"><h2 id="heading-${category.id}" tabindex="-1">${esc(names[category.id])}</h2><span>${items.length} ${plural(items.length,['приём','приёма','приёмов'])}</span></div><div class="cards">${items.map(cardHTML).join('')}</div></section>`:'';}).join('');
 renderNavigation(result);
 $('#empty').hidden=!!result.length;$('#emptyText').textContent=state.mode==='saved'&&!saved.size?'Сохрани приёмы кнопкой с закладкой на карточках.':'В этом режиме пока нет карточек.';
 updateSaved();updateCurrentCard();hoverObserver=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{if(!isIntersecting){target.pause();target.parentElement.classList.remove('is-playing');}}));
 $$('.card-open').forEach(b=>{const v=b.querySelector('video');if(!v)return;hoverObserver.observe(v);b.addEventListener('pointerenter',async event=>{if(event.pointerType!=='mouse'||matchMedia('(prefers-reduced-motion: reduce)').matches||document.querySelector('dialog:modal'))return;if(!v.src)v.src=v.dataset.src;try{v.muted=true;await v.play();if(b.matches(':hover'))v.parentElement.classList.add('is-playing');else v.pause();}catch{}});b.addEventListener('pointerleave',()=>{v.pause();v.parentElement.classList.remove('is-playing');});});
 syncURL();
}
function reset(){state={mode:'all'};render();}
function routeId(){return /^#tech-(\d+)$/.exec(location.hash)?.[1];}
function closeDetail(){if(!dialog.open)return;$('#exampleStage video')?.pause();dialog.close();if(routeOwned&&routeId()){routeOwned=false;history.back();}else if(routeId())history.replaceState(null,'',location.pathname+location.search);}
function openDetail(id,related=false,fromRoute=false){const c=byId.get(String(id));if(!c)return;pausePreviews();if(related&&current)trail.push(current.refId);else if(!related)trail=[];current=c;
 if(!fromRoute){if(!dialog.open){history.pushState(null,'',location.pathname+location.search+'#tech-'+id);routeOwned=true;}else history.replaceState(null,'',location.pathname+location.search+'#tech-'+id);}
 const guide=window.CINEMA_DETAILS[id]||{}, reading=window.CINEMA_GUIDES[c.category.id];
 const comparisons=(guide.comparisons||[]).filter(x=>byId.has(String(x.id)));
 const peers=c.category.techniques, position=peers.findIndex(t=>t.refId===c.refId);
 const relatedIds=[...peers.slice(position+1),...peers.slice(0,position)].slice(0,3).map(t=>t.refId);
 const signs=guide.signs?.length?`<section class="recognition"><h3>Как распознать</h3><ul>${guide.signs.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></section>`:'';
 const comparisonHTML=comparisons.length?`<section class="related"><h3>Не путать с</h3><div class="comparison-list">${comparisons.map(x=>`<article><button type="button" data-related="${x.id}">${esc(byId.get(String(x.id)).name)} <span aria-hidden="true">↗</span></button><p>${esc(x.text)}</p></article>`).join('')}</div></section>`:`<section class="related"><h3>Ещё в этом разделе</h3><div class="related-list">${relatedIds.map(id=>`<button type="button" data-related="${id}">${esc(byId.get(String(id)).name)}</button>`).join('')}</div></section>`;
 $('#detailContent').innerHTML=`<header class="detail-heading"><p class="eyebrow">${esc(c.category.title)}${c.era?' · '+esc(c.era):''}</p><h2 id="detailTitle">${esc(c.name)}</h2><p class="detail-en">${esc(c.nameEn)}</p></header><div class="detail-layout"><div class="detail-media"><div class="gallery-bar"><h3>Галерея примеров</h3><div class="gallery-navigation"><button class="text-btn" type="button" id="previousExample" aria-label="Предыдущий пример">←</button><span id="galleryPosition" aria-live="polite"></span><button class="text-btn" type="button" id="nextExample" aria-label="Следующий пример">→</button></div></div><div id="exampleStage"></div><div class="example-thumbs" id="exampleThumbs"></div><details class="reading-guide"${guide.signs?'':' open'}><summary>${esc(reading.title)} · на что смотреть</summary><ul>${reading.watch.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></details></div><div class="detail-text"><h3>Суть приёма</h3><p class="lead-detail">${esc(c.desc)}</p>${signs}${guide.effect?`<section class="scene-effect"><h3>Что меняется в сцене</h3><p>${esc(guide.effect)}</p></section>`:''}${c.refId===21?`<figure class="mechanism"><figcaption>Как устроен dolly zoom</figcaption><div class="mechanism-row"><span>Камера ближе</span><span aria-hidden="true">⇄</span><span>Угол обзора шире</span></div><p>Или наоборот: камера дальше + угол уже. Изменения компенсируют размер героя, но не перспективу фона.</p></figure>`:''}${c.usage?`<h3>Где пригодится</h3><div class="usage-tags">${c.usage.split(',').map(s=>`<span>${esc(s.trim())}</span>`).join('')}</div>`:''}${comparisonHTML}${c.films?`<details class="film-notes"><summary>${c.category.id==='narrative'?'Фильмы для дальнейшего разбора · возможны спойлеры':'Фильмы для дальнейшего разбора'}</summary><p class="film-list">${esc(c.films)}</p><p class="provenance-note">Список из исходного гайда. Конкретные кадры, фрагменты и их источники — в галерее.</p></details>`:''}<div class="original-links">${link(c.link,'Материал к приёму')}${(c.extraLinks||[]).map((u,i)=>link(typeof u==='string'?u:u.url,'Дополнительный материал '+(i+1))).join('')}${(c.ref.demos||[]).filter(d=>!videos[d.page]).map(d=>link(d.page,d.label)).join('')}</div></div></div>`;
 $('#backDetail').hidden=!trail.length;updateSaved();
 const initial=Math.max(0,c.examples.indexOf(preview(c)));selectExample(initial);
 if(!dialog.open)dialog.show();setPanelLayout();dialog.scrollTop=0;
}
function selectExample(index){const c=current;selectedExample=index;$('#galleryPosition').textContent=c.examples.length?`${index+1} / ${c.examples.length}`:'0 / 0';$('#previousExample').disabled=index<=0;$('#nextExample').disabled=index>=c.examples.length-1;$('#exampleStage video')?.pause();const e=c.examples[index];if(!e){$('#exampleStage').innerHTML='<div class="no-exact">Для этого приёма пока нет точного визуального примера. Доступны описание, признаки и пояснения к приёму.</div>';return;}
 const license=typeof e.license==='object'?e.license:null;
 $('#exampleStage').innerHTML=`<div class="detail-stage">${e.type==='video'?`<video src="${esc(e.src)}" poster="${esc(e.poster)}" controls playsinline preload="metadata" loop></video>`:`<img src="${esc(e.src)}" alt="${esc(e.label)}" id="detailPhoto" role="button" tabindex="0" aria-label="Открыть кадр крупнее">`}</div><div class="detail-controls"><span class="media-kind">${e.ai?'ИИ-демонстрация':e.type==='video'?'Кино / учебная съёмка':'Кинокадр / фотография'}</span>${e.type==='video'&&e.sound?'<button type="button" class="text-btn" id="soundToggle" aria-pressed="false">Включить звук</button>':''}</div>${e.caption||c.ref.caption?`<section class="example-analysis" aria-labelledby="exampleAnalysisTitle"><h3 id="exampleAnalysisTitle">Разбор выбранного примера</h3><p class="example-caption">${esc(e.caption||c.ref.caption)}</p></section>`:''}<p class="example-source">${link(e.page,e.label||e.title||e.collection||'Источник')}${e.credit?' · '+esc(e.credit):''}${license?' · '+link(license.url,license.name):e.license?' · '+(/^https?:/.test(e.license)?link(e.license,e.lic||'Лицензия'):esc(e.license)):e.lic?' · '+esc(e.lic):''}${e.time?' · '+esc(e.time):''}</p>`;
 $('#exampleThumbs').innerHTML=c.examples.length>1?c.examples.map((x,i)=>`<button type="button" class="example-thumb" data-example="${i}" aria-pressed="${i===index}" title="${esc(x.label||'Пример '+(i+1))}" aria-label="${esc(x.label||'Пример '+(i+1))}"><img src="${esc(x.poster)}" alt="" loading="lazy"><span class="thumb-count">${x.type==='video'?'▶ Видео':'Кадр'}${x.ai?' · ИИ':''}</span></button>`).join(''):'';
 const v=$('#exampleStage video');if(v){v.muted=true;v.addEventListener('error',()=>{notify('Не удалось загрузить ролик. Проверь доступность файлов.');});$('#soundToggle')?.addEventListener('click',()=>{v.muted=!v.muted;$('#soundToggle').textContent=v.muted?'Включить звук':'Выключить звук';$('#soundToggle').setAttribute('aria-pressed',!v.muted);v.play().catch(()=>{});});}
 const photo=$('#detailPhoto');if(photo){const zoom=()=>{showLargeImage(index);$('#imageDialog').showModal();};photo.addEventListener('click',zoom);photo.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();zoom();}});}
}
function showLargeImage(index){const e=current.examples[index];if(!e||e.type!=='photo')return;zoomIndex=index;const photos=current.examples.map((e,i)=>e.type==='photo'?i:null).filter(i=>i!==null),n=photos.indexOf(index);$('#largeImage').src=e.src;$('#largeImage').alt=e.label||'';$('#imageCaption').textContent=[e.label,e.caption,e.credit].filter(Boolean).join(' · ');$('#imagePosition').textContent=`${n+1} / ${photos.length}`;$('#previousImage').disabled=n===0;$('#nextImage').disabled=n===photos.length-1;}
function moveImage(direction){const photos=current.examples.map((e,i)=>e.type==='photo'?i:null).filter(i=>i!==null),n=photos.indexOf(zoomIndex)+direction;if(n>=0&&n<photos.length)showLargeImage(photos[n]);}
$('#previousImage').onclick=()=>moveImage(-1);$('#nextImage').onclick=()=>moveImage(1);
$('#toggleSections').onclick=()=>{const open=$('.section-sidebar').classList.toggle('menu-open');$('#toggleSections').setAttribute('aria-expanded',open);$('#toggleSections').textContent=open?'Закрыть меню':'Открыть меню';};
$('#sectionNavigation').addEventListener('click',event=>{const a=event.target.closest('[data-section]');if(!a||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;closeSectionMenu();requestAnimationFrame(()=>{jumpToSection();document.getElementById('heading-'+a.dataset.section)?.focus({preventScroll:true});});});
window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;updateActiveSection();});},{passive:true});
window.addEventListener('resize',()=>{closeSectionMenu();updateActiveSection();setPanelLayout();});
document.addEventListener('click',event=>{if(!event.target.closest('.section-sidebar'))closeSectionMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('.section-sidebar').classList.contains('menu-open')){closeSectionMenu();$('#toggleSections').focus();}});
$$('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;render();});
$('#emptyReset').onclick=reset;
$('#cards').addEventListener('click',event=>{const save=event.target.closest('[data-save]');if(save){toggleSaved(save.dataset.save);return;}const open=event.target.closest('[data-open]');if(open)openDetail(open.dataset.open);});
$('#detailContent').addEventListener('click',event=>{if(event.target.closest('#previousExample'))selectExample(selectedExample-1);if(event.target.closest('#nextExample'))selectExample(selectedExample+1);const related=event.target.closest('[data-related]');if(related)openDetail(related.dataset.related,true);const thumb=event.target.closest('[data-example]');if(thumb){selectExample(Number(thumb.dataset.example));$('#exampleThumbs [aria-pressed=true]')?.focus({preventScroll:true});}});
$('#saveDetail').onclick=()=>{if(current)toggleSaved(current.refId);};$('#closeDetail').onclick=closeDetail;dialog.addEventListener('cancel',event=>{event.preventDefault();closeDetail();});dialog.addEventListener('close',()=>{$('#exampleStage video')?.pause();current=null;setPanelLayout();});$('#backDetail').onclick=()=>{const id=trail.pop(),rest=[...trail];openDetail(id,false);trail=rest;$('#backDetail').hidden=!trail.length;};
for(const [id,close] of [['aboutDialog','closeAbout'],['imageDialog','closeImage']]){const d=$('#'+id);$('#'+close).onclick=()=>d.close();d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();}});}
$('#aboutButton').onclick=()=>$('#aboutDialog').showModal();
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDetail();}});
window.addEventListener('popstate',()=>{if(location.search!==renderedSearch){readFilters();render();}const id=routeId();if(id)openDetail(id,false,true);else{routeOwned=false;if(dialog.open)dialog.close();requestAnimationFrame(updateActiveSection);}});
document.addEventListener('keydown',event=>{if($('#imageDialog').open&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();moveImage(event.key==='ArrowRight'?1:-1);return;}if(dialog.open&&dialog.contains(event.target)&&!$('#imageDialog').open&&!/INPUT|TEXTAREA|SELECT|VIDEO/.test(event.target.tagName)&&['ArrowLeft','ArrowRight'].includes(event.key)){const next=selectedExample+(event.key==='ArrowRight'?1:-1);if(next>=0&&next<current.examples.length){event.preventDefault();selectExample(next);}return;}});
document.addEventListener('keydown',event=>{
 if(!dialog.open||document.querySelector('dialog:modal'))return;
 if(event.key==='Escape'){event.preventDefault();closeDetail();return;}
 if(event.key==='Tab'&&matchMedia('(max-width: 760px)').matches){
  const focusable=[...dialog.querySelectorAll('button,a[href],video[controls],summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
  const first=focusable[0],last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pausePreviews();$('#exampleStage video')?.pause();}});
const legacySection=new URLSearchParams(location.search).get('sections')?.split(',')[0];if(!location.hash&&categories.some(c=>c.id===legacySection))history.replaceState(null,'',location.pathname+location.search+'#section-'+legacySection);
readFilters();render();if(routeId())openDetail(routeId(),false,true);else requestAnimationFrame(jumpToSection);
})();
