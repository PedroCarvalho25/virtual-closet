// Local presentation only; navigation targets are fixed and never take arbitrary URLs.
export const presentationSteps = [
  [
    'discover',
    'Um novo olhar',
    'Comece com uma decisão real: o que vestir hoje? Explore o cenário e troque a combinação.',
  ],
  [
    'hub',
    'Explore seu espaço',
    'Um mapa visual para escolher, criar e cuidar. Cada cartão abre uma área funcional.',
  ],
  [
    'today',
    'Três caminhos para hoje',
    'Compare seguro, criativo e redescoberta. Toque numa peça para substituí-la e guarde o look.',
  ],
  [
    'inspirations',
    'Inspiração que vira ação',
    'Abra uma receita e recrie com as peças disponíveis. As imagens mostram possibilidades do próprio closet.',
  ],
  [
    'wishlist',
    'Antes de comprar',
    'Compare dois desejos, veja semelhantes e experimente o custo por uso. Os cálculos são estimativas.',
  ],
  [
    'travel',
    'Uma mala mais leve',
    'Escolha a viagem, confira o plano B e marque peças separadas. Planejar não registra uso.',
  ],
  [
    'stories',
    'Roupas com história',
    'Revisite as lembranças escritas nas peças. Tudo permanece no espaço pessoal.',
  ],
  [
    'challenges',
    'Mais possibilidades',
    'Veja pequenas descobertas baseadas em usos reais. Participar é opcional.',
  ],
  [
    'circles',
    'Criar junto',
    'Crie um círculo de exemplo e uma enquete. A demonstração não envia mensagens a pessoas reais.',
  ],
  [
    'wrapped',
    'Seu estilo, com o tempo',
    'Veja os usos do período e gere o cartão da retrospectiva. Preços ficam ocultos por padrão.',
  ],
];
export function presentation(nonce) {
  const style = `
  .presentation{max-width:1280px;margin:auto;min-height:100dvh;padding:16px 36px;display:grid;grid-template-columns:minmax(270px,360px) minmax(390px,1fr);gap:48px;align-items:center}
  .presenter{display:flex;flex-direction:column;gap:12px}.wordmark{font-size:20px;font-weight:700;letter-spacing:-.7px}.wordmark span{color:#41573c}.presenter h1{font-size:32px;max-width:350px;margin:0}.presenter p{margin:0}.demo-note{font-size:12px;line-height:1.6;max-width:350px}
  .chapters{display:grid;grid-template-columns:1fr 1fr;gap:4px}.chapter{display:flex;align-items:center;gap:9px;text-align:left;background:transparent;color:#646b5e;padding:7px 10px;border:1px solid transparent;border-radius:13px;font-size:12px;font-weight:500;min-height:38px}.chapter b{font-size:10px;font-weight:500;color:#73786c}.chapter[aria-current=step]{background:#fff;border-color:#d9dfce;color:#292d25}.chapter[aria-current=step] b{color:#41573c}.chapter:hover{background:#ffffff90}.guide{background:#faf9f6;border-radius:20px;padding:14px;min-height:96px}.guide h2{margin:0 0 8px;font-size:15px}.guide p{font-size:13px;line-height:1.6}.stage{display:flex;flex-direction:column;align-items:center;gap:12px;min-width:0}.stage .phone{width:390px;height:min(844px,calc(100dvh - 180px));min-height:490px;border:6px solid white;border-radius:30px;position:relative;box-shadow:0 20px 60px #29352614}.stage-head{width:390px;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;color:#73786c}.stage-head button{padding:8px 10px;font-size:11px;border-radius:10px;min-height:36px}.pager{width:390px;display:flex;align-items:center;justify-content:space-between;gap:12px}.pager button{font-size:12px;min-height:42px;padding:10px 14px}.pager button:disabled{cursor:default}.count{font-size:11px;color:#646b5e}.presenter .actions{margin:0;gap:8px}.presenter .actions button{font-size:12px;padding:10px 12px}.reset-confirm{padding:12px;background:#f7eae4;border-radius:14px;font-size:12px}.reset-confirm[hidden]{display:none}.reset-confirm p{margin-bottom:10px}.screen-status{font-size:11px;min-height:17px;margin:0;text-align:center;color:#646b5e}.presentation:fullscreen{max-width:none;background:#eceee6;overflow:auto}.presentation:fullscreen .stage .phone{height:calc(100dvh - 180px)}button:focus-visible,a:focus-visible{outline:3px solid #41573c;outline-offset:3px}.stage iframe{opacity:1;transition:opacity .16s ease}.stage iframe.loading{opacity:.5}@media(prefers-reduced-motion:reduce){.stage iframe{transition:none}}@media(max-width:850px){.presentation{padding:20px 14px;grid-template-columns:1fr;gap:24px}.presenter{max-width:540px;margin:auto}.presenter h1{font-size:28px;max-width:none}.chapters{grid-template-columns:repeat(2,minmax(0,1fr))}.stage .phone,.stage-head,.pager{width:min(390px,100%)}.stage .phone{height:760px;min-height:490px}.guide{min-height:0}.demo-note{max-width:none}}`;
  const body = `<style>${style}</style><main class="presentation" id="presentation"><section class="presenter"><div class="wordmark">virtual closet<span>.</span></div><span class="badge" style="align-self:flex-start">PRÉVIA INTERATIVA · DADOS DE EXEMPLO</span><h1>Um novo olhar para o que já é seu.</h1><p>Menos dúvida na hora de vestir. Mais possibilidades no seu closet.</p><nav class="chapters" aria-label="Roteiro da apresentação">${presentationSteps.map(([, title], i) => `<button class="chapter" data-step="${i}" ${i === 0 ? 'aria-current="step"' : ''}><b>${String(i + 1).padStart(2, '0')}</b>${title}</button>`).join('')}</nav><div class="guide" aria-live="polite"><h2 id="step-title">${presentationSteps[0][1]}</h2><p id="step-note">${presentationSteps[0][2]}</p></div><p class="demo-note">Explore à vontade: as alterações ficam apenas nesta demonstração. Para a apresentação, use fotos de exemplo.</p><div class="actions"><button class="secondary" id="reset">Recomeçar a prévia</button><a class="button secondary" href="/preview-app" target="_blank" rel="noopener" style="font-size:12px;padding:10px 12px">Abrir só o app ↗</a></div><div class="reset-confirm" id="reset-confirm" hidden><p>Apagar as alterações da demonstração e restaurar os exemplos? Sua conta real não será alterada.</p><button id="confirm-reset">Restaurar exemplos</button> <button class="secondary" id="cancel-reset">Cancelar</button></div></section><section class="stage" aria-label="Aplicativo interativo"><div class="stage-head"><span>Aplicativo interativo</span><button class="secondary" id="fullscreen">Tela cheia</button></div><div class="phone"><iframe id="closet-app" src="/preview-app" title="Aplicativo Virtual Closet com dados de exemplo"></iframe></div><div class="pager"><button class="secondary" id="previous" disabled>← Anterior</button><span class="count" id="count">1 de ${presentationSteps.length}</span><button id="next">Próximo →</button></div><p class="screen-status" id="screen-status" role="status"></p></section></main>`;
  const script = `const steps=${JSON.stringify(presentationSteps)};let current=0;const frame=document.getElementById('closet-app'),status=document.getElementById('screen-status');let loadTimer;function go(index){if(index<0||index>=steps.length)return;current=index;const step=steps[index];document.getElementById('step-title').textContent=step[1];document.getElementById('step-note').textContent=step[2];document.getElementById('count').textContent=(index+1)+' de '+steps.length;document.getElementById('previous').disabled=index===0;document.getElementById('next').disabled=index===steps.length-1;document.querySelectorAll('[data-step]').forEach((el,i)=>{if(i===index)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')});frame.classList.add('loading');status.textContent='Abrindo…';frame.src='/preview-app?view='+step[0];clearTimeout(loadTimer);loadTimer=setTimeout(()=>{frame.classList.remove('loading');status.textContent='Se a tela não abrir, use “Abrir só o app”.'},15000)}frame.addEventListener('load',()=>{clearTimeout(loadTimer);frame.classList.remove('loading');status.textContent=''});document.querySelectorAll('[data-step]').forEach(el=>el.onclick=()=>go(Number(el.dataset.step)));document.getElementById('previous').onclick=()=>go(current-1);document.getElementById('next').onclick=()=>go(current+1);document.getElementById('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.getElementById('presentation').requestFullscreen()}catch{status.textContent='Use F11 para ampliar o navegador.'}};document.addEventListener('fullscreenchange',()=>{document.getElementById('fullscreen').textContent=document.fullscreenElement?'Sair da tela cheia':'Tela cheia'});const confirmation=document.getElementById('reset-confirm');document.getElementById('reset').onclick=()=>{confirmation.hidden=false;document.getElementById('cancel-reset').focus()};document.getElementById('cancel-reset').onclick=()=>{confirmation.hidden=true;document.getElementById('reset').focus()};document.getElementById('confirm-reset').onclick=async()=>{const button=document.getElementById('confirm-reset');button.disabled=true;try{const response=await fetch('/__reset',{method:'POST',headers:{'Content-Type':'application/json','X-Closet-Nonce':'${nonce}'},body:JSON.stringify({showcase:true})});if(!response.ok)throw Error();confirmation.hidden=true;go(0);status.textContent='Exemplos restaurados.'}catch{status.textContent='Não foi possível restaurar. Tente novamente.'}finally{button.disabled=false}};`;
  return { body, script };
}
