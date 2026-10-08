import { describe, expect, it } from 'vitest';
import { planCreativeEdit } from '../../apps/web/src/lib/creativeEdit';
import type { CampaignVersion } from '../../packages/core/src/index';
const v={template:'Editorial Premium',keyword:'cozinha pequena',narrative:{headline:'Organize por R$ 99,00',subheadline:'Veja o produto',pinterestTitle:'Ideias úteis',description:'Organização prática',disclosure:'Link de afiliado',altText:'Produto',cta:'Ver detalhes'}} as CampaignVersion;
describe('Creative Edit Plan v5',()=>{
  it('never inserts the user request as marketing copy',()=>{
    const result=planCreativeEdit(v,'coloque uma astronauta voando ao redor da cadeira');
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('Ajuste solicitado');
  });
  it('previews exact headline before creating a campaign version',()=>{
    const result=planCreativeEdit(v,'Troque a headline para: Minha cozinha mais funcional');
    expect(result.ok).toBe(true);
    if(result.ok)expect(result.changes.narrative.headline).toBe('Minha cozinha mais funcional');
    expect(v.narrative.headline).toContain('R$');
  });
  it('removes price only when a price is actually in editable copy',()=>{
    const result=planCreativeEdit(v,'sem preço');
    expect(result.ok).toBe(true);
    if(result.ok)expect(result.changes.narrative.headline).not.toContain('R$');
    expect(planCreativeEdit({...v,narrative:{...v.narrative,headline:'Sem preço'}},'sem preço').ok).toBe(false);
  });
  it('does not pretend premium applies when already selected',()=>{
    expect(planCreativeEdit(v,'premium').ok).toBe(false);
    expect(planCreativeEdit({...v,template:'Minimal'},'premium').ok).toBe(true);
  });
  it('rejects unsupported compound instructions instead of silently losing intent',()=>{
    expect(planCreativeEdit(v,'mais premium com uma pessoa na cena').ok).toBe(false);
  });
});
