/* MAPOS-CATALOGO-PUBLICO v1.0.8 - render imediato + revalidacao segura */
(function(){
'use strict';
var cfg=window.CATALOGO_CONFIG||{},data=null,query='',category='all';
var el={
  loading:document.getElementById('loading-state'),error:document.getElementById('error-state'),errorDetail:document.getElementById('error-detail'),
  featuredSection:document.getElementById('featured-section'),featuredGrid:document.getElementById('featured-grid'),
  servicesSection:document.getElementById('services-section'),categorySections:document.getElementById('category-sections'),
  filters:document.getElementById('category-filters'),search:document.getElementById('service-search'),clear:document.getElementById('clear-search'),
  empty:document.getElementById('empty-state'),reset:document.getElementById('reset-filters'),count:document.getElementById('result-count'),
  updated:document.getElementById('catalog-updated'),headerWhats:document.getElementById('header-whatsapp'),footer:document.getElementById('footer-text')
};
function hide(node){if(node)node.hidden=true}
function show(node){if(node)node.hidden=false}
function normalize(v){
  var s=(v||'').toString();
  try{s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')}catch(e){}
  return s.toLowerCase();
}
function validPayload(payload){return !!payload&&Array.isArray(payload.categories)&&Array.isArray(payload.services)}
function categoryObj(id){return(data.categories||[]).find(function(x){return String(x.id)===String(id)})||null}
function categoryName(id){var c=categoryObj(id);return c?c.name:'Outros'}
function visibleServices(){
  var q=normalize(query);
  return(data.services||[]).filter(function(s){
    if(category!=='all'&&String(s.category_id)!==String(category))return false;
    if(!q)return true;
    return normalize((s.name||'')+' '+(s.description||'')+' '+categoryName(s.category_id)).indexOf(q)!==-1;
  });
}
function waUrl(service){
  var phone=((data.settings||{}).whatsapp||'').replace(/\D/g,'');
  if(!phone)return'';
  var msg='Olá! Gostaria de solicitar um orçamento para o serviço de '+service.name+'.';
  return'https://wa.me/'+phone+'?text='+encodeURIComponent(msg);
}
function money(value){
  try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0)}
  catch(e){return'R$ '+(Number(value)||0).toFixed(2).replace('.',',')}
}
function priceBlock(service){
  var box=document.createElement('div');box.className='price';
  if(service.price_type==='orcamento'){box.className+=' price-quote';box.textContent='Sob orçamento';return box}
  if(service.price_type==='a_partir'){var small=document.createElement('small');small.textContent='A partir de';box.appendChild(small)}
  box.appendChild(document.createTextNode(money(service.price)));return box;
}
function card(service,featured){
  var article=document.createElement('article');article.className='service-card'+(featured?' featured':'');article.id='servico-'+service.id;
  var top=document.createElement('div');top.className='service-card-top';
  var cat=document.createElement('span');cat.className='category';cat.textContent=categoryName(service.category_id);top.appendChild(cat);
  var h=document.createElement('h3');h.textContent=service.name||'Serviço';
  var p=document.createElement('p');p.className='service-description';p.textContent=service.description||'Consulte detalhes e disponibilidade para este serviço.';
  var foot=document.createElement('div');foot.className='service-card-footer';
  var price=priceBlock(service),a=document.createElement('a'),url=waUrl(service);a.className='quote-button';a.textContent='Solicitar orçamento';
  if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer'}else{a.href='#';a.className+=' disabled';a.setAttribute('aria-disabled','true');a.addEventListener('click',function(ev){ev.preventDefault()})}
  foot.appendChild(price);foot.appendChild(a);article.appendChild(top);article.appendChild(h);article.appendChild(p);article.appendChild(foot);return article;
}
function filterButton(label,id){
  var b=document.createElement('button');b.type='button';b.className='filter-button'+(String(category)===String(id)?' active':'');
  b.textContent=label;b.setAttribute('aria-pressed',String(String(category)===String(id)));
  b.addEventListener('click',function(){category=id;render()});return b;
}
function renderFilters(){
  if(!el.filters)return;el.filters.textContent='';el.filters.appendChild(filterButton('Todos','all'));
  (data.categories||[]).forEach(function(c){el.filters.appendChild(filterButton(c.name,c.id))});
}
function safeHashScroll(){
  if(!location.hash)return;
  try{var target=document.querySelector(location.hash);if(target)setTimeout(function(){target.scrollIntoView({behavior:'smooth',block:'center'})},80)}catch(e){}
}
function render(){
  if(!data)return;
  renderFilters();
  var services=visibleServices();
  if(el.featuredGrid)el.featuredGrid.textContent='';
  if(el.categorySections)el.categorySections.textContent='';
  var featured=services.filter(function(s){return !!s.featured});
  featured.forEach(function(s){el.featuredGrid.appendChild(card(s,true))});
  if(featured.length)show(el.featuredSection);else hide(el.featuredSection);

  var regular=services.filter(function(s){return !s.featured});
  var grouped={};
  regular.forEach(function(s){var k=String(s.category_id);(grouped[k]=grouped[k]||[]).push(s)});
  (data.categories||[]).forEach(function(c){
    var list=grouped[String(c.id)]||[];if(!list.length)return;
    var section=document.createElement('section');section.className='category-block';section.dataset.categoryId=String(c.id);
    var head=document.createElement('div');head.className='category-title';
    var copy=document.createElement('div');copy.className='category-title-copy';
    var h=document.createElement('h3');h.textContent=c.name;copy.appendChild(h);
    if(c.description){var desc=document.createElement('p');desc.textContent=c.description;copy.appendChild(desc)}
    var n=document.createElement('span');n.textContent=list.length+' '+(list.length===1?'serviço':'serviços');head.appendChild(copy);head.appendChild(n);
    var grid=document.createElement('div');grid.className='service-grid';list.forEach(function(s){grid.appendChild(card(s,false))});
    section.appendChild(head);section.appendChild(grid);el.categorySections.appendChild(section);
  });
  if(el.count)el.count.textContent=regular.length+' '+(regular.length===1?'serviço':'serviços');
  if(regular.length)show(el.servicesSection);else hide(el.servicesSection);
  if(services.length)hide(el.empty);else show(el.empty);
  if(el.clear)el.clear.hidden=!query;
  safeHashScroll();
}
function applyMeta(){
  if(el.updated&&data.updated_at){
    try{el.updated.textContent='Atualizado em '+new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(data.updated_at))}
    catch(e){el.updated.textContent='Atualizado recentemente'}
  }
  if(el.footer&&(data.settings||{}).footer_text)el.footer.textContent=data.settings.footer_text;
  var phone=((data.settings||{}).whatsapp||'').replace(/\D/g,'');
  if(phone&&el.headerWhats){show(el.headerWhats);el.headerWhats.href='https://wa.me/'+phone+'?text='+encodeURIComponent('Olá! Gostaria de informações sobre os serviços.');el.headerWhats.target='_blank';el.headerWhats.rel='noopener noreferrer'}
  else hide(el.headerWhats);
}
function start(payload){
  if(!validPayload(payload))throw new Error('Dados públicos inválidos.');
  data=payload;hide(el.loading);hide(el.error);applyMeta();render();
}
function fail(message){
  hide(el.loading);hide(el.featuredSection);hide(el.servicesSection);hide(el.empty);show(el.error);
  if(el.errorDetail&&message)el.errorDetail.textContent=message;
}
function refreshFromJson(){
  if(!cfg.dataUrl||typeof fetch!=='function')return;
  var controller=typeof AbortController==='function'?new AbortController():null;
  var timer=controller?setTimeout(function(){controller.abort()},8000):null;
  var options={cache:'no-store',headers:{Accept:'application/json'}};if(controller)options.signal=controller.signal;
  fetch(cfg.dataUrl,options).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(payload){
    if(!validPayload(payload))throw new Error('JSON inválido');
    if(!data||String(payload.version||'')!==String(data.version||''))start(payload);
  }).catch(function(){if(!data)fail('Não foi possível carregar os dados publicados.')}).finally(function(){if(timer)clearTimeout(timer)});
}
if(el.search)el.search.addEventListener('input',function(){query=this.value;render()});
if(el.clear)el.clear.addEventListener('click',function(){query='';if(el.search){el.search.value='';el.search.focus()}render()});
if(el.reset)el.reset.addEventListener('click',function(){query='';category='all';if(el.search)el.search.value='';render()});
try{
  if(validPayload(cfg.embeddedData||cfg.previewData)){start(cfg.embeddedData||cfg.previewData);refreshFromJson()}
  else if(cfg.dataUrl){refreshFromJson()}
  else{fail('Nenhum dado público foi encontrado.')}
}catch(e){fail('Não foi possível montar o catálogo. Atualize a página e tente novamente.')}
})();
