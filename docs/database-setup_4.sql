-- PART 4: Weekly Totals View
CREATE VIEW vw_WeeklyTotals AS
SELECT 
    m.Name as MemberName,
    te.WeekStarting,
    SUM(te.Hours) as TotalHours,
    SUM(CASE WHEN p.Billable = 1 THEN te.Hours ELSE 0 END) as BillableHours
FROM TimeEntries te
JOIN Members m ON te.MemberID = m.MemberID
JOIN Projects p ON te.ProjectID = p.ProjectID
WHERE m.Active = 1 AND p.Active = 1
GROUP BY m.Name, te.WeekStarting;
