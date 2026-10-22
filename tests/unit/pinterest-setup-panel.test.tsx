// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {PinterestSetupPanel} from '../../apps/web/src/features/PinterestSetupPanel';
import {pinterestRequest} from '../../apps/web/src/services/pinterestBroker';

const {identity}=vi.hoisted(()=>({identity:{user:{uid:'operator',getIdToken:async()=> 'synthetic'},organizationId:'org-a'}}));
vi.mock('../../apps/web/src/lib/auth',()=>({useAuth:()=>identity}));
vi.mock('../../apps/web/src/lib/i18n-context',()=>({useI18n:()=>({locale:'pt-BR'})}));
vi.mock('../../apps/web/src/services/pinterestBroker',async importOriginal=>({
  ...await importOriginal<typeof import('../../apps/web/src/services/pinterestBroker')>(),pinterestRequest:vi.fn(),
}));
const status={configured:true,connected:true,canConfigure:true,accessTier:'TRIAL',environment:'SANDBOX',publicPublishing:false};
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe('Pinterest operator setup and human consent',()=>{
  it('does not offer operator secret input to regular workspace admins',async()=>{
    vi.mocked(pinterestRequest).mockResolvedValue({...status,configured:false,connected:false,canConfigure:false});
    render(<PinterestSetupPanel/>);
    await waitFor(()=>expect(pinterestRequest).toHaveBeenCalled());
    expect(screen.queryByLabelText('Chave secreta do app 1625057')).toBeNull();
    expect(screen.getByRole('button',{name:'Conectar Pinterest'}).hasAttribute('disabled')).toBe(true);
  });
  it('clears operator credential input and sends it only to the authenticated broker',async()=>{
    vi.mocked(pinterestRequest).mockResolvedValueOnce({...status,configured:false,connected:false})
      .mockResolvedValueOnce({configured:true}).mockResolvedValueOnce({...status,connected:false});
    render(<PinterestSetupPanel/>);
    const input=await screen.findByLabelText('Chave secreta do app 1625057');
    fireEvent.change(input,{target:{value:'synthetic-app-secret'}});
    fireEvent.click(screen.getByRole('button',{name:'Salvar chave no servidor'}));
    await waitFor(()=>expect(pinterestRequest).toHaveBeenCalledWith(expect.objectContaining({organizationId:'org-a'}),'/operator-credentials',{secret:'synthetic-app-secret'}));
    await waitFor(()=>expect(screen.queryByLabelText('Chave secreta do app 1625057')).toBeNull());
    expect(sessionStorage.getItem('secret')).toBeNull();
  });
  it('requires individual board consent and preserves an attempted request id',async()=>{
    vi.mocked(pinterestRequest).mockResolvedValueOnce(status).mockResolvedValueOnce({id:'123',name:'Sandbox'});
    render(<PinterestSetupPanel/>);
    const button=await screen.findByRole('button',{name:'Criar pasta Sandbox'});
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByLabelText('Quero criar esta pasta no Sandbox.'));
    fireEvent.click(button);
    await waitFor(()=>expect(pinterestRequest).toHaveBeenCalledWith(expect.anything(),'/sandbox/boards',expect.objectContaining({consent:true,name:'NestAffiliate Sandbox',requestId:expect.any(String)})));
    await screen.findByText(/Pasta criada no Sandbox/);
    expect(screen.getByRole('button',{name:'Criar somente este Pin no Sandbox'}).hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText('Quero criar esta pasta no Sandbox.').hasAttribute('checked')).toBe(false);
  });
});
