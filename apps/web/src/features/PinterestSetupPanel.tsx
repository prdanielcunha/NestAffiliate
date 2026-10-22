import {useEffect,useRef,useState} from 'react';
import {useAuth} from '../lib/auth';
import {useI18n} from '../lib/i18n-context';
import {PINTEREST_CALLBACK,pinterestRequest,pinterestError,startPinterestConnection,type PinterestStatus,type PinterestBoard} from '../services/pinterestBroker';
import './pinterest-setup.css';

export function PinterestSetupPanel() {
  const auth=useAuth(),{locale}=useI18n();
  const pick=(pt:string,en:string,es:string)=>locale==='pt-BR'?pt:locale==='es'?es:en;
  const [status,setStatus]=useState<PinterestStatus|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [secret,setSecret]=useState(''),[boards,setBoards]=useState<PinterestBoard[]>([]),[bookmark,setBookmark]=useState<string|null>(null);
  const [board,setBoard]=useState(''),[boardName,setBoardName]=useState('NestAffiliate Sandbox'),[boardConsent,setBoardConsent]=useState(false);
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[link,setLink]=useState('https://nestaffiliate.millionsnest.com/');
  const [alt,setAlt]=useState(''),[image,setImage]=useState(''),[rights,setRights]=useState(false),[consent,setConsent]=useState(false);
  const boardRequest=useRef<string|null>(null),pinRequest=useRef<string|null>(null);
  const identity=auth.user&&auth.organizationId?{user:auth.user,organizationId:auth.organizationId}:null;
  useEffect(()=>{
    let active=true;
    setStatus(null);setBoards([]);setBoard('');setSecret('');setMessage('');
    if(auth.user&&auth.organizationId)void pinterestRequest<PinterestStatus>({user:auth.user,organizationId:auth.organizationId},'/status')
      .then(s=>{if(active)setStatus(s);}).catch(e=>{if(active)setMessage(pinterestError(e,locale));});
    return ()=>{active=false;};
  },[auth.user,auth.organizationId,locale]);
  async function run(action:()=>Promise<void>) {
    if(busy)return;setBusy(true);setMessage('');
    try {await action();}catch(e){setMessage(pinterestError(e,locale));}finally{setBusy(false);}
  }
  async function loadBoards(next=false) {
    if(!identity)return;
    const path='/sandbox/boards'+(next&&bookmark?'?bookmark='+encodeURIComponent(bookmark):'');
    const result=await pinterestRequest<{items:PinterestBoard[];bookmark:string|null}>(identity,path);
    setBoards(old=>next?[...old,...result.items.filter(x=>!old.some(y=>y.id===x.id))]:result.items);setBookmark(result.bookmark);
  }
  async function chooseImage(file:File|undefined) {
    if(!file)return;
    if(!['image/png','image/jpeg'].includes(file.type)||file.size>5_000_000)throw new Error('PINTEREST_IMAGE_INVALID');
    const data=await new Promise<string>((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);
    });
    setImage(data);setRights(false);setConsent(false);pinRequest.current=null;
  }
  return <section className="surface pinterest-setup" aria-label="Pinterest Trial Sandbox">
    <p className="eyebrow">PINTEREST · APP 1625057 · TRIAL</p>
    <h2>{pick('Conectar e testar o Pinterest','Connect and test Pinterest','Conectar y probar Pinterest')}</h2>
    <p>{pick('Trial aprovado em 22/10/2026. Prepare a demonstração do Standard com uma pasta e um Pin de teste. Esses itens são visíveis apenas para o criador.','Trial approved on October 22, 2026. Prepare the Standard demo with a test board and Pin, visible only to their creator.','Trial aprobado el 22/10/2026. Prepara la demostración de Standard con un tablero y un Pin de prueba, visibles solo para su creador.')}</p>
    <p className="notice">{status?.connected?pick('Conexão autorizada · ambiente Sandbox','Authorized connection · Sandbox','Conexión autorizada · Sandbox'):
      status?.configured?pick('Credencial configurada · falta autorizar sua conta','Credential configured · account authorization required','Credencial configurada · falta autorizar tu cuenta'):
      pick('Configure a credencial e o endereço de retorno antes de conectar.','Configure the credential and redirect URI before connecting.','Configura la credencial y la URL de retorno antes de conectar.')}</p>
    <ol>
      <li>{pick('No Pinterest Developers, abra o app 1625057 → Configure → Redirect URIs. Cadastre exatamente:','In Pinterest Developers, open app 1625057 → Configure → Redirect URIs. Register exactly:','En Pinterest Developers, abre la app 1625057 → Configure → Redirect URIs. Registra exactamente:')}<p><code className="pinterest-callback-url">{PINTEREST_CALLBACK}</code></p></li>
      <li>{pick('O administrador da MillionsNest configura a chave abaixo. Depois, conecte sua conta nesta mesma aba.','The MillionsNest operator configures the secret below. Then connect your account in this same tab.','El administrador de MillionsNest configura la clave abajo. Después conecta tu cuenta en esta misma pestaña.')}</li>
      <li>{pick('Crie uma pasta Sandbox, carregue as pastas, escolha uma e revise cada campo do Pin antes do teste.','Create a Sandbox board, load boards, select one and review each Pin field before testing.','Crea un tablero Sandbox, carga los tableros, elige uno y revisa cada campo del Pin antes de probar.')}</li>
    </ol>
    {status?.canConfigure&&!status.configured&&<div className="meli-setup-grid">
      <label>{pick('Chave secreta do app 1625057','App 1625057 secret','Clave secreta de la app 1625057')}<input type="password" autoComplete="new-password" value={secret} onChange={e=>setSecret(e.target.value)} /></label>
      <button className="button secondary" disabled={busy||!secret} onClick={()=>void run(async()=>{
        if(!identity)return;const value=secret;setSecret('');
        await pinterestRequest(identity,'/operator-credentials',{secret:value});
        setStatus(await pinterestRequest<PinterestStatus>(identity,'/status'));
      })}>{pick('Salvar chave no servidor','Save secret on server','Guardar clave en el servidor')}</button>
    </div>}
    <p className="muted">{pick('A chave não é validada apenas por ser salva. A conexão OAuth confirma se ela funciona. Nunca envie chaves, tokens ou códigos por chat.','Saving does not validate the secret; the OAuth connection verifies it. Never send secrets, tokens or codes in chat.','Guardar no valida la clave; la conexión OAuth confirma si funciona. No envíes claves, tokens ni códigos por chat.')}</p>
    <div className="actions"><button className="button primary" disabled={busy||!status?.configured} onClick={()=>void run(async()=>{if(identity)await startPinterestConnection(identity);})}>
      {pick('Conectar Pinterest','Connect Pinterest','Conectar Pinterest')}</button>
      {status?.connected&&<button className="button secondary" disabled={busy} onClick={()=>void run(async()=>{
        if(!identity)return;await pinterestRequest(identity,'/disconnect',{});setBoards([]);setBoard('');
        setStatus(await pinterestRequest<PinterestStatus>(identity,'/status'));
      })}>{pick('Desconectar deste aplicativo','Disconnect from this app','Desconectar de esta app')}</button>}</div>
    {status?.connected&&<>
      <p className="muted">{pick('Para revogar também a autorização no Pinterest, use as configurações de aplicativos conectados da sua conta.','To also revoke Pinterest authorization, use your account connected-app settings.','Para revocar también la autorización de Pinterest, usa la configuración de apps conectadas de tu cuenta.')}</p>
      <h3>{pick('1. Pasta de teste','1. Test board','1. Tablero de prueba')}</h3>
      <label>{pick('Nome da pasta','Board name','Nombre del tablero')}<input value={boardName} maxLength={100} onChange={e=>{setBoardName(e.target.value);boardRequest.current=null;setBoardConsent(false);}} /></label>
      <label><input type="checkbox" checked={boardConsent} onChange={e=>setBoardConsent(e.target.checked)} />{pick('Quero criar esta pasta no Sandbox.','I want to create this board in Sandbox.','Quiero crear este tablero en Sandbox.')}</label>
      <div className="actions"><button className="button secondary" disabled={busy||!boardConsent||!boardName.trim()} onClick={()=>void run(async()=>{
        if(!identity)return;boardRequest.current??=crypto.randomUUID();
        const b=await pinterestRequest<PinterestBoard>(identity,'/sandbox/boards',{name:boardName,consent:boardConsent,requestId:boardRequest.current});
        setBoards(old=>[...old.filter(x=>x.id!==b.id),b]);setBoard(b.id);setBoardConsent(false);
        setMessage(pick('Pasta criada no Sandbox. Aguarde 30 segundos antes do próximo envio.','Sandbox board created. Wait 30 seconds before the next write.','Tablero creado en Sandbox. Espera 30 segundos antes del próximo envío.'));
      })}>{pick('Criar pasta Sandbox','Create Sandbox board','Crear tablero Sandbox')}</button>
      <button className="button secondary" disabled={busy} onClick={()=>void run(()=>loadBoards())}>{pick('Carregar pastas Sandbox','Load Sandbox boards','Cargar tableros Sandbox')}</button>
      {bookmark&&<button className="button secondary" disabled={busy} onClick={()=>void run(()=>loadBoards(true))}>{pick('Próxima página de pastas','Next page of boards','Siguiente página de tableros')}</button>}</div>
      <h3>{pick('2. Pin de teste — revisão individual','2. Test Pin — individual review','2. Pin de prueba — revisión individual')}</h3>
      <div className="meli-setup-grid">
        <label>{pick('Pasta Sandbox','Sandbox board','Tablero Sandbox')}<select aria-label={pick('Pasta Sandbox','Sandbox board','Tablero Sandbox')} value={board} onChange={e=>{setBoard(e.target.value);pinRequest.current=null;setConsent(false);}}><option value="">{pick('Escolha uma pasta','Select a board','Elige un tablero')}</option>{boards.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>{pick('Imagem própria ou autorizada (PNG/JPG, até 5 MB)','Own or authorized image (PNG/JPG, up to 5 MB)','Imagen propia o autorizada (PNG/JPG, hasta 5 MB)')}<input type="file" accept="image/png,image/jpeg" onChange={e=>void run(()=>chooseImage(e.target.files?.[0]))} /></label>
        <label>{pick('Título','Title','Título')}<input value={title} maxLength={100} onChange={e=>{setTitle(e.target.value);pinRequest.current=null;setConsent(false);}} /></label>
        <label>{pick('Descrição — identifique links afiliados','Description — disclose affiliate links','Descripción — identifica enlaces de afiliados')}<textarea value={description} maxLength={800} onChange={e=>{setDescription(e.target.value);pinRequest.current=null;setConsent(false);}} /></label>
        <label>{pick('Link de destino HTTPS','HTTPS destination link','Enlace de destino HTTPS')}<input type="url" value={link} onChange={e=>{setLink(e.target.value);pinRequest.current=null;setConsent(false);}} /></label>
        <label>{pick('Texto alternativo','Alternative text','Texto alternativo')}<input value={alt} maxLength={500} onChange={e=>{setAlt(e.target.value);pinRequest.current=null;setConsent(false);}} /></label>
      </div>
      {image&&<img className="pinterest-test-preview" src={image} alt={pick('Prévia do Pin de teste','Test Pin preview','Vista previa del Pin de prueba')} />}
      <label><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)} />{pick('Tenho direitos sobre a imagem e revisei a transparência comercial do conteúdo.','I have image rights and reviewed the commercial disclosure.','Tengo derechos sobre la imagen y revisé la divulgación comercial.')}</label>
      <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />{pick('Revisei esta imagem, pasta, título, descrição e link e autorizo somente este Pin no Sandbox.','I reviewed this image, board, title, description and link and authorize only this Pin in Sandbox.','Revisé esta imagen, tablero, título, descripción y enlace y autorizo solo este Pin en Sandbox.')}</label>
      <button className="button primary" disabled={busy||!rights||!consent||!image||!title.trim()||!board} onClick={()=>void run(async()=>{
        if(!identity)return;pinRequest.current??=crypto.randomUUID();
        const result=await pinterestRequest<{id:string}>(identity,'/sandbox/pins',{boardId:board,title,description,link,altText:alt,imageData:image,
          rightsConfirmed:rights,consent,requestId:pinRequest.current});
        setConsent(false);setMessage(pick('Pin criado no Sandbox. ID: ','Pin created in Sandbox. ID: ','Pin creado en Sandbox. ID: ')+result.id);
      })}>{pick('Criar somente este Pin no Sandbox','Create only this Pin in Sandbox','Crear solo este Pin en Sandbox')}</button>
    </>}
    {busy&&<p role="status">{pick('Concluindo…','Working…','Procesando…')}</p>}
    {message&&<p role="status" className="notice">{message}</p>}
  </section>;
}
