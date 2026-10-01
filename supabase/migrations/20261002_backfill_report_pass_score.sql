-- Recompute pm_reports.ai_confidence_score as the share of checklist items marked "Pass",
-- using each report's own checklist snapshot. Older reports were scored from every active
-- task of the vendor, not just their own.
--
-- checklist_results is either a bare array of items or { items: [...], vendorSignature, ... }.
-- Reports with no items are left untouched.
--
-- Rollback:
--   update public.pm_reports r set ai_confidence_score = b.ai_confidence_score from backup.pm_reports_score_20261002 b where b.id = r.id;

create schema if not exists backup;
create table if not exists backup.pm_reports_score_20261002 as select id, ai_confidence_score from public.pm_reports;

with scored as (
  select r.id,
         round(100.0 * count(*) filter (where i->>'status' = 'Pass') / count(*))::int as score
    from public.pm_reports r
    cross join lateral jsonb_array_elements(
      case jsonb_typeof(r.checklist_results)
        when 'array' then r.checklist_results
        else coalesce(r.checklist_results->'items', '[]'::jsonb)
      end
    ) i
   where jsonb_typeof(r.checklist_results) = 'array'
      or jsonb_typeof(r.checklist_results->'items') = 'array'
   group by r.id
)
update public.pm_reports r
   set ai_confidence_score = s.score
  from scored s
 where s.id = r.id
   and r.ai_confidence_score is distinct from s.score;
