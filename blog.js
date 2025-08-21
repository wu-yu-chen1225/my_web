
// BLOG (posts.json 版本)：讀取 repo 裡的 posts.json，任何裝置都能看到相同文章。
// - 新增/編輯/刪除後，會提供一個「下載新版 posts.json」的動作，請將它覆蓋你的 repo 再 push。

const POSTS_FILE = "posts.json";

function blogUID(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function dt(ts){ const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

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

async function loadPosts(){
  // 加上時間戳避免快取卡住（GitHub Pages 偶爾會緩存）
  const res = await fetch(`${POSTS_FILE}?v=${Date.now()}`);
  if(!res.ok) throw new Error(`載入 ${POSTS_FILE} 失敗：${res.status} ${res.statusText}`);
  return await res.json();
}

function savePostsToDownload(posts){
  const data = JSON.stringify(posts, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'posts.json';
  a.click();
}

function renderBlog(){
  let posts = [];
  let q = '', tag = null, current = null;

  const tpl = `
    <section class="card grid">
      <div class="grid" style="grid-template-columns: 1fr auto auto; gap:8px">
        <input id="q" class="input" placeholder="搜尋文章或 #標籤…" />
        <button id="newBtn" class="btn">＋ 新文章</button>
        <button id="reloadBtn" class="btn" title="重新從 posts.json 載入">重新載入</button>
      </div>
      <div id="tagNav" class="grid" style="grid-auto-flow: column; overflow:auto"></div>
      <div id="list" class="grid"></div>
    </section>
    <section id="viewer" class="card" style="display:none"></section>
    <section id="editor" class="card" style="display:none">
      <div class="grid">
        <input id="title" class="input" placeholder="標題" />
        <input id="tags" class="input" placeholder="#標籤, 用逗號分隔" />
        <textarea id="body" class="textarea" rows="10" placeholder="支援簡易 Markdown"></textarea>
        <div class="grid" style="grid-auto-flow: column; justify-content:start">
          <button id="save" class="btn">儲存（下載 posts.json）</button>
          <button id="cancel" class="btn">取消</button>
          <button id="del" class="btn">刪除</button>
          <button id="back" class="btn">返回列表</button>
        </div>
        <p class="meta">提示：儲存後會下載 <code>posts.json</code>，請將它覆蓋你的 repo 並 push，上線就會同步。</p>
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
    if(tag) arr = arr.filter(p => (p.tags||[]).includes(tag));
    if(q){
      const qs = q.toLowerCase();
      arr = arr.filter(p => (p.title||'').toLowerCase().includes(qs) || (p.body||'').toLowerCase().includes(qs) || (p.tags||[]).join(' ').toLowerCase().includes(qs));
    }
    listEl.innerHTML = arr.map(p=>`
      <a class="post-item" href="#/blog" data-id="${p.id}">
        <div class="h1" style="font-size:18px">${p.title}</div>
        <div class="meta">${dt(p.ts)}</div>
        <div class="tags">${(p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
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
      <div class="meta">${dt(p.ts)} · ${(p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join(' ')}</div>
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
    $('#title').value = p.title||'';
    $('#tags').value = (p.tags||[]).join(', ');
    $('#body').value = p.body||'';
  }

  function save(){
    const title = $('#title').value.trim() || '未命名文章';
    const tags = $('#tags').value.split(',').map(s=>s.trim()).filter(Boolean);
    const body = $('#body').value;
    let p = posts.find(x=>x.id===current);
    if(!p){ p = {id:current, title, tags, body, ts:Date.now()}; posts.push(p); }
    else { p.title=title; p.tags=tags; p.body=body; p.ts=Date.now(); }
    savePostsToDownload(posts);
    renderList();
    alert("已下載新版 posts.json，請覆蓋 repo 中的 posts.json 並 push，上線就會同步。");
  }

  function del(){
    if(!current) return;
    const i = posts.findIndex(x=>x.id===current);
    if(i>=0){ posts.splice(i,1); savePostsToDownload(posts); }
    renderList();
  }

  async function boot(){
    try{
      posts = await loadPosts();
    }catch(err){
      posts = [];
      console.error(err);
      document.querySelector('#app').innerHTML = `
        <section class="card">
          <h2 style="margin-top:0">讀取 posts.json 失敗</h2>
          <p class="meta">${String(err)}</p>
          <p>請確認專案根目錄存在 <code>posts.json</code> 檔案。</p>
        </section>
      `;
      return;
    }
    renderTags();
    renderList();
  }

  // events
  document.querySelector('#newBtn').onclick = ()=> edit(blogUID());
  document.querySelector('#q').oninput = (e)=>{ q = e.target.value; renderList(); };
  document.querySelector('#save').onclick = save;
  document.querySelector('#cancel').onclick = renderList;
  document.querySelector('#del').onclick = ()=>{ if(confirm('確定刪除？')) del(); };
  document.querySelector('#back').onclick = renderList;
  document.querySelector('#reloadBtn').onclick = boot;

  boot();
}
