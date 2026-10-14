import {describe,it,expect} from 'vitest';
import {chooseWorkspaceVersion,radarPrivateWorkspacePath,workspaceModifiedAt} from '../../apps/web/src/lib/radarWorkspaceCloud';
import {sanitizeRadarWorkspace,type RadarWorkspace} from '../../apps/web/src/lib/radarWorkspace';

const base:RadarWorkspace={version:1,recentSearches:['cadeira escritório'],saved:[],preferredCategory:null,updatedAt:'2026-10-14T18:00:00.000Z',syncEnabled:false};
describe('private Radar workspace synchronization',()=>{
  it('never uses organization-wide readable collections for private history',()=>{
    expect(radarPrivateWorkspacePath('user-1','org-a')).toBe('users/user-1/nestAffiliateRadarWorkspaces/org-a');
    expect(radarPrivateWorkspacePath('user-1','org-b')).not.toBe(radarPrivateWorkspacePath('user-1','org-a'));
    expect(()=>radarPrivateWorkspacePath('other/admin','org-a')).toThrow('WORKSPACE_ID_INVALID');
    expect(()=>radarPrivateWorkspacePath('user-1','../admin')).toThrow('WORKSPACE_ID_INVALID');
    expect(()=>radarPrivateWorkspacePath('','org-a')).toThrow('WORKSPACE_ID_INVALID');
  });
  it('chooses only the latest explicit user edit and does not overwrite newer cloud updates',()=>{
    const remote={...base,updatedAt:'2026-10-14T18:00:01.000Z'};
    expect(chooseWorkspaceVersion(base,remote)).toBe('remote');
    expect(chooseWorkspaceVersion(remote,base)).toBe('local');
    expect(chooseWorkspaceVersion(base,{...base})).toBe('local');
    expect(workspaceModifiedAt(remote)).toBeGreaterThan(workspaceModifiedAt(base));
  });
  it('retains opted-in preferences only when valid and refuses future timestamps',()=>{
    const state=sanitizeRadarWorkspace({...base,syncEnabled:true,updatedAt:'3026-01-01T00:00:00Z'},new Date('2026-10-14T19:00:00Z'));
    expect(state.syncEnabled).toBe(true);
    expect(state.updatedAt).toBe(new Date(0).toISOString());
    expect(sanitizeRadarWorkspace(base).syncEnabled).toBe(false);
  });
});
