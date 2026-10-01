import type { UserPreferences } from '../services/preferencesRepository';
import { useI18n } from '../lib/i18n-context';

export function SettingsPanel({
  preferences,
  editable,
  onChange,
}:{
  preferences:UserPreferences;
  editable:boolean;
  onChange:(next:UserPreferences)=>void;
}){
  const { locale }=useI18n();
  const pt=locale==='pt-BR';
  const es=locale==='es';
  const words=pt ? {
    title:'Configurações operacionais',sub:'Preferências que mudam o comportamento do NestAffiliate sem liberar serviços pagos.',
    brand:'Marca pública',username:'Pinterest desejado',mode:'Modo de publicação',guided:'Sempre guiado',api:'API quando houver Standard Access',
    daily:'Máximo de publicações em 24h',gap:'Intervalo mínimo entre publicações (min)',none:'Sem limite configurado',
    learning:'Permitir aprendizado após amostra mínima',readonly:'Seu papel é somente leitura.',
  } : es ? {
    title:'Configuración operativa',sub:'Preferencias que cambian el comportamiento sin habilitar servicios pagos.',
    brand:'Marca pública',username:'Pinterest deseado',mode:'Modo de publicación',guided:'Siempre guiado',api:'API cuando exista Standard Access',
    daily:'Máximo de publicaciones en 24h',gap:'Intervalo mínimo entre publicaciones (min)',none:'Sin límite configurado',
    learning:'Permitir aprendizaje después de muestra mínima',readonly:'Tu rol es de solo lectura.',
  } : {
    title:'Operational settings',sub:'Preferences that change NestAffiliate behavior without enabling paid services.',
    brand:'Public brand',username:'Desired Pinterest',mode:'Publishing mode',guided:'Always guided',api:'API when Standard Access exists',
    daily:'Maximum publications in 24h',gap:'Minimum gap between publications (min)',none:'No configured limit',
    learning:'Allow learning after minimum sample',readonly:'Your role is read-only.',
  };

  const numberValue=(value:number|null)=>value===null?'':String(value);
  const parse=(value:string)=>value.trim()===''?null:Math.max(1,Math.floor(Number(value)||1));

  return <div className="page">
    <header className="page-title"><p className="eyebrow">SETTINGS</p><h1>{words.title}</h1><p>{words.sub}</p></header>
    {!editable && <div className="notice">{words.readonly}</div>}
    <section className="surface settings-grid">
      <label>{words.brand}<input disabled={!editable} value={preferences.brandName} onChange={(e)=>onChange({...preferences,brandName:e.target.value})}/></label>
      <label>{words.username}<input disabled={!editable} value={preferences.desiredPinterestUsername} onChange={(e)=>onChange({...preferences,desiredPinterestUsername:e.target.value})}/></label>
      <label>{words.mode}<select disabled={!editable} value={preferences.publishingMode} onChange={(e)=>onChange({...preferences,publishingMode:e.target.value as UserPreferences['publishingMode']})}><option value="guided">{words.guided}</option><option value="api_when_available">{words.api}</option></select></label>
      <label>{words.daily}<input disabled={!editable} inputMode="numeric" placeholder={words.none} value={numberValue(preferences.maxPublications24h)} onChange={(e)=>onChange({...preferences,maxPublications24h:parse(e.target.value)})}/></label>
      <label>{words.gap}<input disabled={!editable} inputMode="numeric" placeholder={words.none} value={numberValue(preferences.minGapMinutes)} onChange={(e)=>onChange({...preferences,minGapMinutes:parse(e.target.value)})}/></label>
      <label className="toggle-setting"><input type="checkbox" disabled={!editable} checked={preferences.learningEnabled} onChange={(e)=>onChange({...preferences,learningEnabled:e.target.checked})}/><span>{words.learning}</span></label>
    </section>
  </div>;
}
