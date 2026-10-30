import { readFileSync } from 'node:fs';
import path from 'node:path';
export function wishesSql(root) {
  return readFileSync(
    path.join(root, 'supabase/migrations/202610160001_visual_wishes.sql'),
    'utf8',
  );
}
export function wishesSetup() {
  return {
    body: `<main class="panel"><span class="badge">VIRTUAL CLOSET · ATUALIZAÇÃO 10</span><h1>Seus achados, junto do seu closet.</h1><p>Ativa fotos privadas na lista de desejos, detalhes de estilo e composições com suas roupas.</p><div class="steps"><h2>Atualizar o projeto</h2><p>Copie o código. No Supabase, abra <strong>SQL Editor → New query</strong>, cole e clique em <strong>Run</strong>.</p><button id="copy" disabled>Copiar atualização 10</button><p id="status" role="status"></p></div><details><summary>Conferir o SQL</summary><textarea id="sql" aria-label="Atualização 10 do Virtual Closet" rows="18" readonly></textarea></details><p>Este arquivo contém somente a atualização 10 e pressupõe as nove anteriores. Não reaplique o pacote 7–9. Execute uma vez; se houver erro, guarde a mensagem antes de tentar novamente.</p><p>Peças, fotos, looks e dados de apresentação já existentes são preservados.</p><a class="button" href="http://127.0.0.1:4211/wishes">Abrir meus desejos</a></main>`,
    script: `const field=document.getElementById('sql'),button=document.getElementById('copy'),status=document.getElementById('status');fetch('/__wishes-sql').then(async r=>{if(!r.ok)throw Error();field.value=await r.text();button.disabled=false;}).catch(()=>status.textContent='Não foi possível carregar. Reabra esta página.');button.onclick=async()=>{try{await navigator.clipboard.writeText(field.value);status.textContent='Código copiado. Cole na nova consulta e clique em Run.';}catch{field.parentElement.open=true;field.focus();field.select();status.textContent='Pressione Ctrl+C para copiar o SQL selecionado.';}};`,
  };
}
