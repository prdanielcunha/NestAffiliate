import { useState } from 'react';
import { parseMeliOfficialSignals, type CommerceSignal } from '@nestaffiliate/radar';
import { useI18n } from '../lib/i18n-context';

export function OfficialSignalImport({
  onImported,
}:{
  onImported:(signals:CommerceSignal[])=>Promise<void>|void;
}){
  const { t }=useI18n();
  const [mode,setMode]=useState<'TRENDS'|'HIGHLIGHTS'>('TRENDS');
  const [raw,setRaw]=useState('');
  const [status,setStatus]=useState<'idle'|'saving'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');

  async function submit(){
    try{
      setStatus('saving');
      setMessage('');
      const signals=parseMeliOfficialSignals({mode,raw});
      await onImported(signals);
      setStatus('success');
      setMessage(t('officialSignalImported',{n:signals.length}));
    }catch(error){
      setStatus('error');
      const code=error instanceof Error ? error.message : 'UNKNOWN';
      setMessage(
        code.includes('JSON')
          ? t('officialSignalJsonError')
          : t('officialSignalPayloadError'),
      );
    }
  }

  return <section className="official-signal-import surface">
    <div className="section-heading">
      <div>
        <p className="eyebrow">{t('officialSignalImport')}</p>
        <h2>{t('officialSignalImportTitle')}</h2>
      </div>
      <span>Mercado Livre</span>
    </div>
    <p className="muted">{t('officialSignalImportBody')}</p>
    <div className="official-signal-toolbar">
      <label>
        <span>{t('source')}</span>
        <select value={mode} onChange={(event)=>setMode(event.target.value as 'TRENDS'|'HIGHLIGHTS')}>
          <option value="TRENDS">/trends/MLB</option>
          <option value="HIGHLIGHTS">/highlights/MLB/category/…</option>
        </select>
      </label>
    </div>
    <textarea
      className="signal-json"
      value={raw}
      onChange={(event)=>{setRaw(event.target.value);setStatus('idle');setMessage('');}}
      placeholder={mode==='TRENDS'
        ? '[{"keyword":"organizador cozinha","url":"https://lista.mercadolivre.com.br/..."}]'
        : '{"content":[{"id":"MLB123","position":1,"type":"ITEM"}]}'}
      spellCheck={false}
      aria-label={t('officialSignalJson')}
    />
    <div className="official-signal-actions">
      <button className="button secondary" type="button" onClick={()=>setRaw('')}>{t('clear')}</button>
      <button className="button primary" type="button" disabled={!raw.trim() || status==='saving'} onClick={()=>void submit()}>
        {status==='saving'?t('saving'):t('importOfficialSignals')}
      </button>
    </div>
    {message && <p className={status==='success'?'success-text':'field-error'}>{message}</p>}
    <p className="field-hint">{t('officialSignalNoSecrets')}</p>
  </section>;
}
