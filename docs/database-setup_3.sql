-- PART 3: Create Views
CREATE VIEW vw_TimesheetSummary AS
SELECT 
    m.Name as MemberName,
    p.ProjectCode,
    p.ProjectName,
    p.Billable,
    te.WeekStarting,
    te.EntryDate,
    te.Hours,
    te.TaskDescription
FROM TimeEntries te
JOIN Members m ON te.MemberID = m.MemberID
JOIN Projects p ON te.ProjectID = p.ProjectID
WHERE m.Active = 1 AND p.Active = 1;
