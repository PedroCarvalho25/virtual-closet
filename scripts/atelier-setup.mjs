import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const atelierMigrations = [
  '202610150002_atelier.sql',
  '202610150003_capture_planning.sql',
  '202610150004_account_control.sql',
];
export function atelierSql(root) {
  // Preserve transaction boundaries: PostgreSQL must commit enum additions before using them.
  return (
    '-- Virtual Closet: atualizações 7, 8 e 9. Aplicar depois das seis anteriores.\n' +
    atelierMigrations
      .map(
        (name) =>
          `\n-- ${name}\n${readFileSync(path.join(root, 'supabase/migrations', name), 'utf8')}`,
      )
      .join('\n')
  );
}
export function atelierSetup() {
  return {
    body: `<main class="panel"><span class="badge">VIRTUAL CLOSET · ATELIÊ E PLANEJAMENTO</span><h1>Da inspiração à sua próxima combinação.</h1><p>Coleções privadas e compartilhadas por convite, composições com versões, novas categorias de roupas, planejamento e controles dos seus dados.</p><div class="steps"><h2>Atualizar seu projeto</h2><p>Clique em <strong>Copiar atualização</strong>. No Supabase, abra <strong>SQL Editor → New query</strong>, cole e clique em <strong>Run</strong>.</p><button id="copy" disabled>Copiar atualização</button><p id="status" role="status" aria-live="polite"></p></div><details><summary>Conferir o SQL</summary><textarea id="sql" aria-label="Atualizações 7 a 9 do Virtual Closet" rows="18" readonly></textarea></details><p>As seis migrações anteriores já foram aplicadas. Este pacote preserva seus registros e adiciona três migrações, com transações separadas. Execute o pacote uma vez; se houver erro, copie a mensagem para verificarmos antes de executar novamente.</p><p>Adicionar os controles de exclusão não exclui nenhuma conta. O usuário precisa confirmar a ação na própria conta com um novo código de e-mail.</p><p>O provador realista é validado separadamente; esta atualização não o ativa.</p><div class="actions"><a class="button" href="http://127.0.0.1:4211/discover">Abrir minha conta</a><a class="button secondary" href="/preview-app">Explorar com exemplos</a></div></main>`,
    script: `const field=document.getElementById('sql'),button=document.getElementById('copy'),status=document.getElementById('status');fetch('/__atelier-sql').then(async r=>{if(!r.ok)throw Error();field.value=await r.text();button.disabled=false;}).catch(()=>status.textContent='Não foi possível carregar. Reabra esta página.');button.onclick=async()=>{try{await navigator.clipboard.writeText(field.value);status.textContent='Atualização copiada. Cole no SQL Editor do Supabase e clique em Run.';}catch{field.parentElement.open=true;field.focus();field.select();status.textContent='SQL selecionado. Pressione Ctrl+C para copiar.';}};`,
  };
}
const root = fileURLToPath(new URL('..', import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(path.join(root, 'supabase/ATUALIZACAO-ATELIE-7-A-9.sql'), atelierSql(root));
  console.log('Pacote SQL 7–9 atualizado. As fronteiras de transação foram preservadas.');
}
