const BLOG_KEY = 'mini-blog-v1';

function blogUID(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function blogLoad(){
  const raw = localStorage.getItem(BLOG_KEY);
  if(raw) return JSON.parse(raw);
  // 首次預設文
  const seed = [
    {id:blogUID(), title:'你好，部落格！', tags:['#生活','#JS'], body:'支援 **粗體**、*斜體*、`程式碼`。', ts:Date.now()-86400000},
    {id:blogUID(), title:'RWD 筆記', tags:['#CSS','#RWD'], body:'Flex 一維、Grid 二維。', ts:Date.now()-3600000},
  ];
  localStorage.setItem(BLOG_KEY, JSON.stringify(seed));
  return seed;
}
function blogSave(list){ localStorage.setItem(BLOG_KEY, JSON.stringify(list)); }

function mdLite(s=''){
  return s
    .replace(/^### (.*$)/gim,'<h3>$1</h3>')
    .replace(/^## (.*$)/gim,'<h2>$1</h2>')
    .replace(/^# (.*$)/gim,'<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\n\n/g,'</p><p>');
}
function dt(ts){ const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

function renderBlog(){
  let posts = blogLoad();
  let q = '', tag = null, current = null;

  const tpl = `
    <section class="card grid">
      <div class="grid" style="grid-template-columns: 1fr auto; gap:8px">
        <input id="q" class="input" placeholder="搜尋文章或 #標籤…" />
        <button id="newBtn" class="btn">＋ 新文章</button>
      </div>
      <div id="tagNav" class="grid" style="grid-auto-flow: column; overflow:auto"></div>
      <div id="list" class="grid"></div>
    </section>
    <section id="viewer" class="card" style="display:none"></section>
    <section id="editor" class="card" style="display:none">
      <div class="grid">
        <input id="title" class="input" placeholder="標題" />
        <input id="tags" class="input" placeholder="#標籤, 用逗號分隔" />
        <textarea id="body" class="textarea" rows="8" placeholder="支援簡易 Markdown"></textarea>
        <div class="grid" style="grid-auto-flow: column; justify-content:start">
          <button id="save" class="btn">儲存</button>
          <button id="cancel" class="btn">取消</button>
          <button id="del" class="btn">刪除</button>
          <button id="back" class="btn">返回列表</button>
        </div>
      </div>
    </section>
  `;
  document.querySelector('#app').innerHTML = tpl;

  const $ = (s)=>document.querySelector(s);
  const listEl = $('#list'), viewer = $('#viewer'), editor = $('#editor');

  function renderTags(){
    const all = Array.from(new Set(posts.flatMap(p=>p.tags)));
    $('#tagNav').innerHTML = ['<button class="btn" data-tag="">全部</button>']
      .concat(all.map(t=>`<button class="btn" data-tag="${t}">${t}</button>`)).join(' ');
    $('#tagNav').querySelectorAll('button').forEach(b=>{
      b.addEventListener('click',()=>{ tag = b.dataset.tag || null; renderList(); });
    });
  }

  function renderList(){
    viewer.style.display = 'none'; editor.style.display = 'none'; listEl.parentElement.style.display='block';
    let arr = [...posts].sort((a,b)=>b.ts-a.ts);
    if(tag) arr = arr.filter(p => p.tags.includes(tag));
    if(q){
      const qs = q.toLowerCase();
      arr = arr.filter(p => p.title.toLowerCase().includes(qs) || p.body.toLowerCase().includes(qs) || p.tags.join(' ').toLowerCase().includes(qs));
    }
    listEl.innerHTML = arr.map(p=>`
      <a class="post-item" href="#/blog" data-id="${p.id}">
        <div class="h1" style="font-size:18px">${p.title}</div>
        <div class="meta">${dt(p.ts)}</div>
        <div class="tags">${p.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
      </a>
    `).join('');
    listEl.querySelectorAll('.post-item').forEach(a=>{
      a.addEventListener('click',(e)=>{ e.preventDefault(); open(a.dataset.id);});
    });
  }

  function open(id){
    const p = posts.find(x=>x.id===id); if(!p) return;
    current = id;
    listEl.parentElement.style.display='none'; viewer.style.display='block'; editor.style.display='none';
    viewer.innerHTML = `
      <h1 class="h1">${p.title}</h1>
      <div class="meta">${dt(p.ts)} · ${p.tags.map(t=>`<span class="tag">${t}</span>`).join(' ')}</div>
      <hr style="border:0;border-top:1px solid var(--border);margin:12px 0"/>
      <p>${mdLite(p.body||'')}</p>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button id="edit" class="btn">編輯</button>
        <button id="back2" class="btn">返回列表</button>
      </div>
    `;
    viewer.querySelector('#edit').onclick = ()=> edit(id);
    viewer.querySelector('#back2').onclick = renderList;
  }

  function edit(id){
    const p = posts.find(x=>x.id===id) || {id:blogUID(), title:'', tags:[], body:'', ts:Date.now()};
    current = p.id;
    listEl.parentElement.style.display='none'; viewer.style.display='none'; editor.style.display='block';
    $('#title').value = p.title;
    $('#tags').value = p.tags.join(', ');
    $('#body').value = p.body||'';
  }

  function save(){
    const title = $('#title').value.trim() || '未命名文章';
    const tags = $('#tags').value.split(',').map(s=>s.trim()).filter(Boolean);
    const body = $('#body').value;
    let p = posts.find(x=>x.id===current);
    if(!p){ p = {id:current, title, tags, body, ts:Date.now()}; posts.push(p); }
    else { p.title=title; p.tags=tags; p.body=body; p.ts=Date.now(); }
    blogSave(posts); renderList();
  }
  function del(){
    if(!current) return;
    const i = posts.findIndex(x=>x.id===current);
    if(i>=0){ posts.splice(i,1); blogSave(posts); }
    renderList();
  }

  // events
  document.querySelector('#newBtn').onclick = ()=> edit(blogUID());
  document.querySelector('#q').oninput = (e)=>{ q = e.target.value; renderList(); }
  document.querySelector('#save').onclick = save;
  document.querySelector('#cancel').onclick = renderList;
  document.querySelector('#del').onclick = ()=>{ if(confirm('確定刪除？')) del(); };
  document.querySelector('#back').onclick = renderList;

  renderTags(); renderList();
}
