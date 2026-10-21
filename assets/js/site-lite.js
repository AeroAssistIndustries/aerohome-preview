(function(){var h=document.getElementById('head'),t=document.querySelector('.totop'),m=document.querySelector('.menu-btn');
function s(){var y=window.scrollY||0;h.classList.toggle('scrolled',y>8);t.classList.toggle('show',y>900);}
window.addEventListener('scroll',s,{passive:true});s();t.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});
function set(o){if(o)document.documentElement.style.setProperty('--drawer-top',Math.max(0,h.getBoundingClientRect().bottom)+'px');document.body.classList.toggle('menu-open',o);m.setAttribute('aria-expanded',String(o));document.documentElement.style.overflow=o?'hidden':'';}
m.addEventListener('click',function(){set(!document.body.classList.contains('menu-open'));});
document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false);});})();
