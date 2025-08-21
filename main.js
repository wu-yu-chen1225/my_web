const el = (q)=>document.querySelector(q);
const app = el('#app');
const routes = {
  '/home': 'pages/home.html',
  '/news': 'pages/news.html',
  '/gas' : 'pages/gas.html',
  '/love': 'pages/love.html',
  '/blog': null, // 由 blog.js 負責渲染
};

async function loadPage(path){
  if(path==='/blog'){
    renderBlog(); // 來自 blog.js
    return;
  }
  const file = routes[path] || routes['/home'];
  const res = await fetch(file);
  const html = await res.text();
  app.innerHTML = `<section class="card">${html}</section>`;
}

function onHashChange(){
  const hash = location.hash.replace('#','') || '/home';
  loadPage(hash);
}

function applyTheme(){
  const t = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('light', t==='light');
}
function toggleTheme(){
  const isLight = document.documentElement.classList.contains('light');
  localStorage.setItem('theme', isLight ? 'dark' : 'light');
  applyTheme();
}

window.addEventListener('hashchange', onHashChange);
el('#themeBtn').addEventListener('click', toggleTheme);
el('#year').textContent = new Date().getFullYear();
applyTheme();
onHashChange();
