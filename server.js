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

// EXISTING ENDPOINTS (keep these unchanged)

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

// NEW ENDPOINTS FOR TEAM AND PROJECT MANAGEMENT

// Add new team member
app.post('/api/members', async (req, res) => {
    try {
        const { name, email } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const pool = await getConnection();
        
        // Check if member already exists
        const existingMember = await pool.request()
            .input('name', sql.NVarChar(100), name)
            .query('SELECT MemberID FROM Members WHERE Name = @name');
            
        if (existingMember.recordset.length > 0) {
            return res.status(400).json({ error: 'Team member with this name already exists' });
        }
        
        // Add new member
        await pool.request()
            .input('name', sql.NVarChar(100), name)
            .input('email', sql.NVarChar(255), email || null)
            .query(`INSERT INTO Members (Name, Email, Active) 
                    VALUES (@name, @email, 1)`);
        
        res.json({ success: true, message: 'Team member added successfully' });
    } catch (err) {
        console.error('Error adding team member:', err);
        res.status(500).json({ error: 'Failed to add team member' });
    }
});

// Update team member
app.put('/api/members/:memberId', async (req, res) => {
    try {
        const { memberId } = req.params;
        const { name, email } = req.body;
        const pool = await getConnection();
        
        // Build dynamic update query based on provided fields
        let updateFields = [];
        let inputs = [];
        
        if (name !== undefined) {
            updateFields.push('Name = @name');
            inputs.push({ name: 'name', type: sql.NVarChar(100), value: name });
        }
        
        if (email !== undefined) {
            updateFields.push('Email = @email');
            inputs.push({ name: 'email', type: sql.NVarChar(255), value: email });
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        const request = pool.request();
        request.input('memberId', sql.Int, memberId);
        
        inputs.forEach(input => {
            request.input(input.name, input.type, input.value);
        });
        
        await request.query(`UPDATE Members 
                            SET ${updateFields.join(', ')} 
                            WHERE MemberID = @memberId`);
        
        res.json({ success: true, message: 'Team member updated successfully' });
    } catch (err) {
        console.error('Error updating team member:', err);
        res.status(500).json({ error: 'Failed to update team member' });
    }
});

// Add new project
app.post('/api/projects', async (req, res) => {
    try {
        const { projectCode, projectName, billable } = req.body;
        
        if (!projectCode || !projectName) {
            return res.status(400).json({ error: 'Project code and name are required' });
        }
        
        const pool = await getConnection();
        
        // Check if project code already exists
        const existingProject = await pool.request()
            .input('projectCode', sql.NVarChar(20), projectCode)
            .query('SELECT ProjectID FROM Projects WHERE ProjectCode = @projectCode');
            
        if (existingProject.recordset.length > 0) {
            return res.status(400).json({ error: 'Project with this code already exists' });
        }
        
        // Add new project
        await pool.request()
            .input('projectCode', sql.NVarChar(20), projectCode)
            .input('projectName', sql.NVarChar(200), projectName)
            .input('billable', sql.Bit, billable !== undefined ? billable : true)
            .query(`INSERT INTO Projects (ProjectCode, ProjectName, Billable, Active) 
                    VALUES (@projectCode, @projectName, @billable, 1)`);
        
        res.json({ success: true, message: 'Project added successfully' });
    } catch (err) {
        console.error('Error adding project:', err);
        res.status(500).json({ error: 'Failed to add project' });
    }
});

// Update project
app.put('/api/projects/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { projectCode, projectName, billable } = req.body;
        const pool = await getConnection();
        
        // Build dynamic update query
        let updateFields = [];
        let inputs = [];
        
        if (projectCode !== undefined) {
            updateFields.push('ProjectCode = @projectCode');
            inputs.push({ name: 'projectCode', type: sql.NVarChar(20), value: projectCode });
        }
        
        if (projectName !== undefined) {
            updateFields.push('ProjectName = @projectName');
            inputs.push({ name: 'projectName', type: sql.NVarChar(200), value: projectName });
        }
        
        if (billable !== undefined) {
            updateFields.push('Billable = @billable');
            inputs.push({ name: 'billable', type: sql.Bit, value: billable });
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        const request = pool.request();
        request.input('projectId', sql.Int, projectId);
        
        inputs.forEach(input => {
            request.input(input.name, input.type, input.value);
        });
        
        await request.query(`UPDATE Projects 
                            SET ${updateFields.join(', ')} 
                            WHERE ProjectID = @projectId`);
        
        res.json({ success: true, message: 'Project updated successfully' });
    } catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ error: 'Failed to update project' });
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
