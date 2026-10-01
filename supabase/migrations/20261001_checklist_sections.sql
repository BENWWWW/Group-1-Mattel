-- ============================================================
-- Migration: Group checklist items into sections (PM card blocks)
--
-- Checklist items (pm_templates.checklist_items, pm_tasks.checklist,
-- pm_reports.checklist_results) get a "section" key, e.g.
-- "BARREL & SCREW MEASUREMENTS". Items are reordered so each section's
-- items sit together. Item ids, results, photos and readings are untouched.
-- The old "BARREL & SCREW: " / "TEMPERATURE: " title prefixes become sections.
--
-- Originals are copied to the backup schema first. To roll back:
--   update public.pm_templates t set checklist_items = b.checklist_items from backup.pm_templates_20261001 b where b.id = t.id;
--   update public.pm_tasks t set checklist = b.checklist from backup.pm_tasks_20261001 b where b.id = t.id;
--   update public.pm_reports r set checklist_results = b.checklist_results from backup.pm_reports_20261001 b where b.id = r.id;
-- ============================================================

create schema if not exists backup;
create table if not exists backup.pm_templates_20261001 as select id, checklist_items from public.pm_templates;
create table if not exists backup.pm_tasks_20261001 as select id, checklist from public.pm_tasks;
create table if not exists backup.pm_reports_20261001 as select id, checklist_results from public.pm_reports;

-- Section per template item id, in display order (sec_rank).
create temp table sec_map (tpl text, item_id text, section text, sec_rank int) on commit drop;
insert into sec_map values
  -- Injection molding: blocks from the machine's PM confirmation card
  ('INJECTION MOLDING','im-chuck','BARREL & SCREW MEASUREMENTS',1),
  ('INJECTION MOLDING','im-barrel-1','BARREL & SCREW MEASUREMENTS',1),
  ('INJECTION MOLDING','im-barrel-2','BARREL & SCREW MEASUREMENTS',1),
  ('INJECTION MOLDING','im-barrel-3','BARREL & SCREW MEASUREMENTS',1),
  ('INJECTION MOLDING','im-lips-1','BARREL & SCREW MEASUREMENTS',1),
  ('INJECTION MOLDING','im-lips-2','BARREL & SCREW MEASUREMENTS',1),
  ('INJECTION MOLDING','im-lips-3','BARREL & SCREW MEASUREMENTS',1),
  ('INJECTION MOLDING','im-lips-4','BARREL & SCREW MEASUREMENTS',1),
  ('INJECTION MOLDING','im-lips-5','BARREL & SCREW MEASUREMENTS',1),
  ('INJECTION MOLDING','im-zone-1','TEMPERATURE CALIBRATION',2),
  ('INJECTION MOLDING','im-zone-2','TEMPERATURE CALIBRATION',2),
  ('INJECTION MOLDING','im-zone-3','TEMPERATURE CALIBRATION',2),
  ('INJECTION MOLDING','im-zone-4','TEMPERATURE CALIBRATION',2),
  ('INJECTION MOLDING','im-oil-temp','TEMPERATURE CALIBRATION',2),
  ('INJECTION MOLDING','im-pump','TEMPERATURE CALIBRATION',2),
  ('INJECTION MOLDING','im-lube','LUBRICANT & HYDRAULIC OIL',3),
  ('INJECTION MOLDING','task-1786068833124-cbfb','LUBRICANT & HYDRAULIC OIL',3),
  ('INJECTION MOLDING','task-1786068870592-momg','GENERAL INSPECTION',4),
  ('INJECTION MOLDING','task-1786068894914-tnax','GENERAL INSPECTION',4),
  ('INJECTION MOLDING','im-safety','GENERAL INSPECTION',4),
  -- Backup generator
  ('BACKUP GENERATOR PREVENTIVE MAINTENANCE','gen-1','BATTERY & FUEL',1),
  ('BACKUP GENERATOR PREVENTIVE MAINTENANCE','gen-2','BATTERY & FUEL',1),
  ('BACKUP GENERATOR PREVENTIVE MAINTENANCE','gen-3','BATTERY & FUEL',1),
  ('BACKUP GENERATOR PREVENTIVE MAINTENANCE','gen-4','ENGINE SERVICING',2),
  ('BACKUP GENERATOR PREVENTIVE MAINTENANCE','gen-5','ENGINE SERVICING',2),
  ('BACKUP GENERATOR PREVENTIVE MAINTENANCE','gen-10','ENGINE SERVICING',2),
  ('BACKUP GENERATOR PREVENTIVE MAINTENANCE','gen-6','TEST RUN',3),
  ('BACKUP GENERATOR PREVENTIVE MAINTENANCE','gen-7','TEST RUN',3),
  ('BACKUP GENERATOR PREVENTIVE MAINTENANCE','gen-8','TEST RUN',3),
  ('BACKUP GENERATOR PREVENTIVE MAINTENANCE','gen-9','TEST RUN',3),
  -- Fire hydrant & pump
  ('FIRE HYDRANT & PUMP SYSTEM TESTING','fire-1','FIRE PUMP TEST',1),
  ('FIRE HYDRANT & PUMP SYSTEM TESTING','fire-2','FIRE PUMP TEST',1),
  ('FIRE HYDRANT & PUMP SYSTEM TESTING','fire-3','FIRE PUMP TEST',1),
  ('FIRE HYDRANT & PUMP SYSTEM TESTING','fire-4','VALVES & EXTINGUISHERS',2),
  ('FIRE HYDRANT & PUMP SYSTEM TESTING','fire-5','VALVES & EXTINGUISHERS',2),
  ('FIRE HYDRANT & PUMP SYSTEM TESTING','fire-6','ALARM SYSTEM',3),
  -- Industrial HVAC chiller (quarterly)
  ('Industrial HVAC Chiller Quarterly Protocol','hvac-check-1','COMPRESSOR & REFRIGERANT',1),
  ('Industrial HVAC Chiller Quarterly Protocol','hvac-check-2','COMPRESSOR & REFRIGERANT',1),
  ('Industrial HVAC Chiller Quarterly Protocol','hvac-check-3','ELECTRICAL',2),
  ('Industrial HVAC Chiller Quarterly Protocol','hvac-check-4','CLEANING',3),
  -- Elevator & lift
  ('MAIN ELEVATOR & LIFT MAINTENANCE','lift-1','SAFETY DEVICES',1),
  ('MAIN ELEVATOR & LIFT MAINTENANCE','lift-8','SAFETY DEVICES',1),
  ('MAIN ELEVATOR & LIFT MAINTENANCE','lift-3','DOORS',2),
  ('MAIN ELEVATOR & LIFT MAINTENANCE','lift-4','DOORS',2),
  ('MAIN ELEVATOR & LIFT MAINTENANCE','lift-2','ROPES & GUIDE RAILS',3),
  ('MAIN ELEVATOR & LIFT MAINTENANCE','lift-5','ROPES & GUIDE RAILS',3),
  ('MAIN ELEVATOR & LIFT MAINTENANCE','lift-6','ROPES & GUIDE RAILS',3),
  ('MAIN ELEVATOR & LIFT MAINTENANCE','lift-7','RIDE & LEVELING',4),
  -- Motor overhaul
  ('MECHANICAL MOTOR OVERHAUL & CALIBRATION','mech-1','VIBRATION & ALIGNMENT',1),
  ('MECHANICAL MOTOR OVERHAUL & CALIBRATION','mech-3','VIBRATION & ALIGNMENT',1),
  ('MECHANICAL MOTOR OVERHAUL & CALIBRATION','mech-4','VIBRATION & ALIGNMENT',1),
  ('MECHANICAL MOTOR OVERHAUL & CALIBRATION','mech-5','VIBRATION & ALIGNMENT',1),
  ('MECHANICAL MOTOR OVERHAUL & CALIBRATION','mech-2','LUBRICATION',2),
  ('MECHANICAL MOTOR OVERHAUL & CALIBRATION','mech-6','ELECTRICAL & THERMAL',3),
  ('MECHANICAL MOTOR OVERHAUL & CALIBRATION','mech-7','ELECTRICAL & THERMAL',3),
  ('MECHANICAL MOTOR OVERHAUL & CALIBRATION','mech-8','ELECTRICAL & THERMAL',3),
  -- MV electrical panel (order kept: energized checks, then lockout work)
  ('MEDIUM VOLTAGE ELECTRICAL PANEL INSPECTION','elc-1','ENERGIZED INSPECTION',1),
  ('MEDIUM VOLTAGE ELECTRICAL PANEL INSPECTION','elc-2','ENERGIZED INSPECTION',1),
  ('MEDIUM VOLTAGE ELECTRICAL PANEL INSPECTION','elc-3','ENERGIZED INSPECTION',1),
  ('MEDIUM VOLTAGE ELECTRICAL PANEL INSPECTION','elc-4','DE-ENERGIZED MAINTENANCE',2),
  ('MEDIUM VOLTAGE ELECTRICAL PANEL INSPECTION','elc-5','DE-ENERGIZED MAINTENANCE',2),
  ('MEDIUM VOLTAGE ELECTRICAL PANEL INSPECTION','elc-6','DE-ENERGIZED MAINTENANCE',2),
  ('MEDIUM VOLTAGE ELECTRICAL PANEL INSPECTION','elc-7','DE-ENERGIZED MAINTENANCE',2),
  ('MEDIUM VOLTAGE ELECTRICAL PANEL INSPECTION','elc-8','DE-ENERGIZED MAINTENANCE',2),
  ('MEDIUM VOLTAGE ELECTRICAL PANEL INSPECTION','elc-9','DE-ENERGIZED MAINTENANCE',2),
  -- Roof & exterior
  ('ROOF & EXTERIOR WALL STRUCTURAL INSPECTION','env-1','ROOF & DRAINAGE',1),
  ('ROOF & EXTERIOR WALL STRUCTURAL INSPECTION','env-2','ROOF & DRAINAGE',1),
  ('ROOF & EXTERIOR WALL STRUCTURAL INSPECTION','env-3','FACADE',2),
  ('ROOF & EXTERIOR WALL STRUCTURAL INSPECTION','env-4','FACADE',2),
  ('ROOF & EXTERIOR WALL STRUCTURAL INSPECTION','env-5','FACADE',2),
  ('ROOF & EXTERIOR WALL STRUCTURAL INSPECTION','env-6','FOUNDATION',3),
  -- Standard HVAC chiller
  ('STANDARD HVAC CHILLER MAINTENANCE','hvac-1','COMPRESSOR',1),
  ('STANDARD HVAC CHILLER MAINTENANCE','hvac-2','COMPRESSOR',1),
  ('STANDARD HVAC CHILLER MAINTENANCE','hvac-3','COMPRESSOR',1),
  ('STANDARD HVAC CHILLER MAINTENANCE','hvac-4','CHILLED WATER',2),
  ('STANDARD HVAC CHILLER MAINTENANCE','hvac-5','CHILLED WATER',2),
  ('STANDARD HVAC CHILLER MAINTENANCE','hvac-6','CLEANING & LUBRICATION',3),
  ('STANDARD HVAC CHILLER MAINTENANCE','hvac-7','CLEANING & LUBRICATION',3),
  ('STANDARD HVAC CHILLER MAINTENANCE','hvac-8','CONTROLS',4),
  -- Water transfer pump
  ('WATER TRANSFER PUMP OVERHAUL (PLUMBING)','plumb-1','MECHANICAL',1),
  ('WATER TRANSFER PUMP OVERHAUL (PLUMBING)','plumb-2','MECHANICAL',1),
  ('WATER TRANSFER PUMP OVERHAUL (PLUMBING)','plumb-6','MECHANICAL',1),
  ('WATER TRANSFER PUMP OVERHAUL (PLUMBING)','plumb-8','MECHANICAL',1),
  ('WATER TRANSFER PUMP OVERHAUL (PLUMBING)','plumb-3','ELECTRICAL',2),
  ('WATER TRANSFER PUMP OVERHAUL (PLUMBING)','plumb-4','ELECTRICAL',2),
  ('WATER TRANSFER PUMP OVERHAUL (PLUMBING)','plumb-5','PERFORMANCE & CONTROLS',3),
  ('WATER TRANSFER PUMP OVERHAUL (PLUMBING)','plumb-7','PERFORMANCE & CONTROLS',3);

-- Tag each item with its section, strip the old title prefixes, and sort by section.
-- Items not in the map (e.g. extra items a vendor added) keep their order at the end, under GENERAL.
create function pg_temp.apply_sections(items jsonb, tpl text) returns jsonb language sql as $$
  select coalesce(jsonb_agg(
           e || jsonb_strip_nulls(jsonb_build_object(
                  'section', m.section,
                  'text',  regexp_replace(e->>'text',  '^(BARREL & SCREW|TEMPERATURE): ', ''),
                  'title', regexp_replace(e->>'title', '^(BARREL & SCREW|TEMPERATURE): ', ''),
                  'label', regexp_replace(e->>'label', '^(BARREL & SCREW|TEMPERATURE): ', '')))
           order by coalesce(m.sec_rank, 999), x.i), '[]'::jsonb)
  from jsonb_array_elements(items) with ordinality x(e, i)
  left join sec_map m on m.tpl = $2 and m.item_id = e->>'id';
$$;

update public.pm_templates t
   set checklist_items = pg_temp.apply_sections(t.checklist_items, t.title)
 where jsonb_typeof(t.checklist_items) = 'array';

update public.pm_tasks t
   set checklist = pg_temp.apply_sections(t.checklist, tp.title)
  from public.pm_templates tp
 where tp.id = t.template_id and jsonb_typeof(t.checklist) = 'array' and jsonb_array_length(t.checklist) > 0;

-- Reports store either a bare array or { items: [...], signatures... }.
update public.pm_reports r
   set checklist_results = case jsonb_typeof(r.checklist_results)
         when 'array' then pg_temp.apply_sections(r.checklist_results, tp.title)
         else jsonb_set(r.checklist_results, '{items}', pg_temp.apply_sections(r.checklist_results->'items', tp.title))
       end
  from public.pm_tasks t join public.pm_templates tp on tp.id = t.template_id
 where t.id = r.task_id
   and (jsonb_typeof(r.checklist_results) = 'array' or jsonb_typeof(r.checklist_results->'items') = 'array');
