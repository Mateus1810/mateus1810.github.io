/* MAPOS-CATALOGO-PUBLICO v1.0.7 */
(function(){
'use strict';
var cfg=window.CATALOGO_CONFIG||{},data=null,query='',category='all';
var el={loading:document.getElementById('loading-state'),error:document.getElementById('error-state'),featuredSection:document.getElementById('featured-section'),featuredGrid:document.getElementById('featured-grid'),servicesSection:document.getElementById('services-section'),categorySections:document.getElementById('category-sections'),filters:document.getElementById('category-filters'),search:document.getElementById('service-search'),clear:document.getElementById('clear-search'),empty:document.getElementById('empty-state'),reset:document.getElementById('reset-filters'),count:document.getElementById('result-count'),updated:document.getElementById('catalog-updated'),headerWhats:document.getElementById('header-whatsapp'),footer:document.getElementById('footer-text')};
function normalize(v){return(v||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function visibleServices(){var q=normalize(query);return(data.services||[]).filter(function(s){if(category!=='all'&&String(s.category_id)!==String(category))return false;if(!q)return true;var c=categoryName(s.category_id);return normalize(s.name+' '+s.description+' '+c).indexOf(q)!==-1})}
function categoryObj(id){return(data.categories||[]).find(function(x){return String(x.id)===String(id)})||null}
function categoryName(id){var c=categoryObj(id);return c?c.name:'Outros'}
function waUrl(service){var phone=((data.settings||{}).whatsapp||'').replace(/\D/g,'');if(!phone)return'';var msg='Olá! Gostaria de solicitar um orçamento para o serviço de '+service.name+'.';return'https://wa.me/'+phone+'?text='+encodeURIComponent(msg)}
function money(value){try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0)}catch(e){return'R$ '+(Number(value)||0).toFixed(2).replace('.',',')}}
function priceBlock(service){var box=document.createElement('div');box.className='price';if(service.price_type==='orcamento'){box.className+=' price-quote';box.textContent='Sob orçamento';return box}if(service.price_type==='a_partir'){var small=document.createElement('small');small.textContent='A partir de';box.appendChild(small)}box.appendChild(document.createTextNode(money(service.price)));return box}
function card(service,featured){
  var article=document.createElement('article');article.className='service-card'+(featured?' featured':'');article.id='servico-'+service.id;
  var top=document.createElement('div');top.className='service-card-top';
  var cat=document.createElement('span');cat.className='category';cat.textContent=categoryName(service.category_id);top.appendChild(cat);
  var h=document.createElement('h3');h.textContent=service.name;
  var p=document.createElement('p');p.className='service-description';p.textContent=service.description||'Consulte detalhes e disponibilidade para este serviço.';
  var foot=document.createElement('div');foot.className='service-card-footer';
  var price=priceBlock(service);
  var a=document.createElement('a');a.className='quote-button';var url=waUrl(service);a.textContent='Solicitar orçamento';
  if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer'}else{a.href='#';a.className+=' disabled';a.setAttribute('aria-disabled','true');a.title='WhatsApp não configurado'}
  foot.append(price,a);article.append(top,h,p,foot);return article
}
function renderFilters(){el.filters.textContent='';el.filters.appendChild(filterButton('Todos','all'));(data.categories||[]).forEach(function(c){el.filters.appendChild(filterButton(c.name,c.id))})}
function filterButton(label,id){var b=document.createElement('button');b.type='button';b.className='filter-button'+(String(category)===String(id)?' active':'');b.textContent=label;b.setAttribute('aria-pressed',String(String(category)===String(id)));b.addEventListener('click',function(){category=id;render()});return b}
function render(){
  renderFilters();var services=visibleServices();el.featuredGrid.textContent='';el.categorySections.textContent='';
  var featured=services.filter(function(s){return !!s.featured});featured.forEach(function(s){el.featuredGrid.appendChild(card(s,true))});el.featuredSection.hidden=featured.length===0;
  var grouped={};services.forEach(function(s){var k=String(s.category_id);(grouped[k]=grouped[k]||[]).push(s)});
  (data.categories||[]).forEach(function(c){var list=grouped[String(c.id)]||[];if(!list.length)return;var section=document.createElement('section');section.className='category-block';var head=document.createElement('div');head.className='category-title';var copy=document.createElement('div');copy.className='category-title-copy';var h=document.createElement('h3');h.textContent=c.name;copy.appendChild(h);if(c.description){var desc=document.createElement('p');desc.textContent=c.description;copy.appendChild(desc)}var n=document.createElement('span');n.textContent=list.length+' '+(list.length===1?'serviço':'serviços');head.append(copy,n);var grid=document.createElement('div');grid.className='service-grid';list.forEach(function(s){grid.appendChild(card(s,false))});section.append(head,grid);el.categorySections.appendChild(section)});
  el.count.textContent=services.length+' '+(services.length===1?'serviço encontrado':'serviços encontrados');el.servicesSection.hidden=services.length===0;el.empty.hidden=services.length!==0;el.clear.hidden=!query;
  if(location.hash&&document.querySelector(location.hash)){setTimeout(function(){document.querySelector(location.hash).scrollIntoView({behavior:'smooth',block:'center'})},80)}
}
function start(payload){data=payload||{categories:[],services:[],settings:{}};el.loading.hidden=true;el.error.hidden=true;if(el.updated&&data.updated_at){try{el.updated.textContent='Atualizado em '+new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(data.updated_at))}catch(e){el.updated.textContent='Atualizado recentemente'}}if(el.footer&&(data.settings||{}).footer_text)el.footer.textContent=data.settings.footer_text;var phone=((data.settings||{}).whatsapp||'').replace(/\D/g,'');if(phone&&el.headerWhats){el.headerWhats.hidden=false;el.headerWhats.href='https://wa.me/'+phone+'?text='+encodeURIComponent('Olá! Gostaria de informações sobre os serviços.');el.headerWhats.target='_blank';el.headerWhats.rel='noopener noreferrer'}render()}
function fail(){el.loading.hidden=true;el.error.hidden=false}
if(el.search){el.search.addEventListener('input',function(){query=this.value;render()})}
if(el.clear){el.clear.addEventListener('click',function(){query='';el.search.value='';render();el.search.focus()})}
if(el.reset){el.reset.addEventListener('click',function(){query='';category='all';el.search.value='';render()})}
if(cfg.previewData){start(cfg.previewData)}else if(cfg.dataUrl){fetch(cfg.dataUrl,{cache:'no-store',headers:{Accept:'application/json'}}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(start).catch(fail)}else{fail()}
})();
