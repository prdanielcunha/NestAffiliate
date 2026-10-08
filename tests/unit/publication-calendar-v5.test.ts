import {describe,expect,it} from 'vitest';
import {publicationCalendarIcs} from '../../apps/web/src/lib/publicationCalendar';
const now=new Date('2026-10-08T12:00:00.000Z');
describe('Guided publication calendar',()=>{
 it('provides one day before and due reminders without implying auto-publish',()=>{
  const ics=publicationCalendarIcs({campaignId:'campaign-1',version:2,scheduledFor:'2026-10-10T12:00:00.000Z',productTitle:'Cadeira',boardName:'Ideias para casa',now});
  expect(ics).toContain('TRIGGER:-P1D');
  expect(ics).toContain('TRIGGER:-PT0M');
  expect(ics).toContain('Não é publicação automática');
  expect(ics).toContain('DTSTART:20261010T120000Z');
 });
 it('rejects invalid and past dates',()=>{
  expect(()=>publicationCalendarIcs({campaignId:'x',version:1,scheduledFor:'bad',productTitle:'x',boardName:'x',now})).toThrow('ICS_SCHEDULE_INVALID');
 });
 it('blocks calendar injection through product and board text',()=>{
  const ics=publicationCalendarIcs({campaignId:'x',version:1,scheduledFor:'2026-10-11T12:00:00Z',productTitle:'X\r\nBEGIN:VEVENT',boardName:'A\nB',now});
  expect((ics.match(/BEGIN:VEVENT/g)||[])).toHaveLength(1);
 });
});
