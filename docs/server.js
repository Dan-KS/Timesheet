# ==============================================
# 2. API SERVER (save as: server.js - this is your current file)
# ==============================================

const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Azure SQL Database configuration
const dbConfig = {
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    database: process.env.AZURE_SQL_DATABASE,
    server: process.env.AZURE_SQL_SERVER,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

let poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('Connected to Azure SQL Database');
        return pool;
    })
    .catch(err => {
        console.error('Database connection failed:', err);
        process.exit(1);
    });

async function getConnection() {
    return await poolPromise;
}

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .query('SELECT MemberID, Name FROM Members WHERE Active = 1 ORDER BY Name');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching members:', err);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// Get all active projects
app.get('/api/projects', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .query(`SELECT ProjectID, ProjectCode, ProjectName, Billable 
                    FROM Projects 
                    WHERE Active = 1 
                    ORDER BY ProjectName`);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Get timesheet data for a specific member and week
app.get('/api/timesheet/:memberId/:weekStart', async (req, res) => {
    try {
        const { memberId, weekStart } = req.params;
        const pool = await getConnection();
        
        const result = await pool.request()
            .input('memberId', sql.Int, memberId)
            .input('weekStart', sql.Date, weekStart)
            .query(`SELECT te.ProjectID, te.EntryDate, te.Hours, te.TaskDescription,
                           p.ProjectCode, p.ProjectName, p.Billable
                    FROM TimeEntries te
                    JOIN Projects p ON te.ProjectID = p.ProjectID
                    WHERE te.MemberID = @memberId 
                    AND te.WeekStarting = @weekStart`);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching timesheet:', err);
        res.status(500).json({ error: 'Failed to fetch timesheet data' });
    }
});

// Save/Update timesheet entry
app.post('/api/timesheet', async (req, res) => {
    try {
        const { memberId, projectId, entryDate, weekStarting, hours, taskDescription } = req.body;
        const pool = await getConnection();
        
        const existingEntry = await pool.request()
            .input('memberId', sql.Int, memberId)
            .input('projectId', sql.Int, projectId)
            .input('entryDate', sql.Date, entryDate)
            .query(`SELECT EntryID FROM TimeEntries 
                    WHERE MemberID = @memberId 
                    AND ProjectID = @projectId 
                    AND EntryDate = @entryDate`);
        
        if (existingEntry.recordset.length > 0) {
            await pool.request()
                .input('entryId', sql.Int, existingEntry.recordset[0].EntryID)
                .input('hours', sql.Decimal(4,2), hours || null)
                .input('taskDescription', sql.NVarChar(500), taskDescription || null)
                .query(`UPDATE TimeEntries 
                        SET Hours = @hours, 
                            TaskDescription = @taskDescription,
                            ModifiedDate = GETDATE()
                        WHERE EntryID = @entryId`);
        } else if (hours || taskDescription) {
            await pool.request()
                .input('memberId', sql.Int, memberId)
                .input('projectId', sql.Int, projectId)
                .input('entryDate', sql.Date, entryDate)
                .input('weekStarting', sql.Date, weekStarting)
                .input('hours', sql.Decimal(4,2), hours || null)
                .input('taskDescription', sql.NVarChar(500), taskDescription || null)
                .query(`INSERT INTO TimeEntries 
                        (MemberID, ProjectID, EntryDate, WeekStarting, Hours, TaskDescription)
                        VALUES (@memberId, @projectId, @entryDate, @weekStarting, @hours, @taskDescription)`);
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving timesheet entry:', err);
        res.status(500).json({ error: 'Failed to save timesheet entry' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const pool = await getConnection();
        await pool.request().query('SELECT 1 as health');
        res.json({ status: 'healthy', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'unhealthy', error: err.message });
    }
});

app.get('/', (req, res) => {
    res.json({ message: 'Timesheet API is running!' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Timesheet API running on port ${PORT}`);
});
