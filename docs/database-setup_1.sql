# ==============================================
# 1. DATABASE SETUP (save as: database-setup.sql)
# ==============================================

-- PART 1: Create Tables and Indexes
CREATE TABLE Members (
    MemberID int IDENTITY(1,1) PRIMARY KEY,
    Name nvarchar(100) NOT NULL,
    Email nvarchar(255),
    Active bit DEFAULT 1,
    CreatedDate datetime2 DEFAULT GETDATE()
);

CREATE TABLE Projects (
    ProjectID int IDENTITY(1,1) PRIMARY KEY,
    ProjectCode nvarchar(20) NOT NULL UNIQUE,
    ProjectName nvarchar(200) NOT NULL,
    Billable bit DEFAULT 1,
    Active bit DEFAULT 1,
    CreatedDate datetime2 DEFAULT GETDATE()
);

CREATE TABLE TimeEntries (
    EntryID int IDENTITY(1,1) PRIMARY KEY,
    MemberID int NOT NULL,
    ProjectID int NOT NULL,
    EntryDate date NOT NULL,
    WeekStarting date NOT NULL,
    Hours decimal(4,2),
    TaskDescription nvarchar(500),
    CreatedDate datetime2 DEFAULT GETDATE(),
    ModifiedDate datetime2 DEFAULT GETDATE(),
    
    FOREIGN KEY (MemberID) REFERENCES Members(MemberID),
    FOREIGN KEY (ProjectID) REFERENCES Projects(ProjectID)
);

CREATE INDEX IX_TimeEntries_Member_Week ON TimeEntries(MemberID, WeekStarting);
CREATE INDEX IX_TimeEntries_Date ON TimeEntries(EntryDate);
CREATE INDEX IX_TimeEntries_Project ON TimeEntries(ProjectID);
