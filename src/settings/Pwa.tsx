import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { Button, Label, Notice } from '@/components/ui';
import { ideasPreview } from '@/preview/config';
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const usePwa = create<{ registration: ServiceWorkerRegistration | null; install: InstallPrompt | null; update: boolean; error: string | null }>(() => ({ registration: null, install: null, update: false, error: null }));
export function PwaRegistration() {
  useEffect(()=>{
    if (Platform.OS !== 'web' || ideasPreview || !('serviceWorker' in navigator) || !window.isSecureContext) return;
    let alive = true;
    const prompt = (event: Event) => { event.preventDefault();usePwa.setState({ install: event as InstallPrompt }); };
    const installed = () => usePwa.setState({ install: null });
    window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',installed);
    void navigator.serviceWorker.register('/sw.js').then(registration=>{
      if (!alive) return;usePwa.setState({ registration, update: !!registration.waiting });
      registration.addEventListener('updatefound',()=>{ const worker=registration.installing;worker?.addEventListener('statechange',()=>{ if (worker.state==='installed' && navigator.serviceWorker.controller) usePwa.setState({ update:true }); }); });
    }).catch(()=>{ if(alive)usePwa.setState({error:'A instalação offline não ficou disponível neste navegador.'}); });
    return()=>{alive=false;window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',installed);};
  },[]);
  return null;
}
export function PwaSettings() {
  const state=usePwa();
  if (Platform.OS !== 'web') return <Label className="text-sm">Você está usando a versão para aplicativo.</Label>;
  if (ideasPreview) return <Label className="text-sm">A instalação fica disponível na versão conectada à sua conta.</Label>;
  return <><Label className="text-sm">No iPhone, abra no Safari e use Compartilhar → Adicionar à Tela de Início. A instalação exige HTTPS ou o acesso local neste computador.</Label>
    {state.install && <Button title="Instalar Virtual Closet" secondary onPress={()=>{void state.install!.prompt().then(()=>state.install!.userChoice).then(()=>usePwa.setState({install:null}));}} />}
    <Button title="Verificar atualização do app" secondary onPress={()=>void state.registration?.update().catch(()=>usePwa.setState({error:'Não foi possível verificar agora.'}))} />
    {state.update && <><Label className="text-sm">Uma nova versão está pronta. Salve o que estiver editando antes de recarregar.</Label><Button title="Aplicar atualização e recarregar" onPress={()=>{
      navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload(),{once:true});state.registration?.waiting?.postMessage({type:'ACTIVATE_UPDATE'});
    }} /></>}
    <Label className="text-xs text-muted">O app guarda sua estrutura para abrir sem conexão. Imagens privadas não entram no cache de instalação; alterações continuam exigindo internet.</Label><Notice message={state.error} />
  </>;
}
