
# 1. DATABASE SETUP (save as: database-setup.sql)



# ==============================================
# 5. DEPLOYMENT DOCUMENTATION (save as: DEPLOYMENT.md)
# ==============================================

# Timesheet System Deployment Guide

## System Architecture
- **Database**: Azure SQL Database
- **API**: Node.js Express server on Azure App Service
- **Frontend**: React-based HTML page on GitHub Pages

## URLs
- **API Server**: https://timesheet-api-dpcxh5gca6bthgeb.uksouth-01.azurewebsites.net/
- **Web Interface**: https://yourusername.github.io/timesheet-api

## Azure Resources
- **Resource Group**: timesheet-resources
- **SQL Server**: timesheet-server-[name]
- **Database**: timesheet-db
- **App Service**: timesheet-api-[name]

## Environment Variables (Azure App Service)
- AZURE_SQL_SERVER: [your-server].database.windows.net
- AZURE_SQL_DATABASE: timesheet-db
- AZURE_SQL_USER: sqladmin
- AZURE_SQL_PASSWORD: [your-password]

## Database Tables
- **Members**: Team member information
- **Projects**: Project details and billing status
- **TimeEntries**: Individual time entries with hours and tasks

## Maintenance
- Add new team members via SQL INSERT into Members table
- Add new projects via SQL INSERT into Projects table
- Export data using the web interface Export button
- Monitor API health at: /api/health endpoint

## Backup Strategy
- Azure SQL Database has automatic backups
- Export critical data regularly using the web interface
- Keep this source code in version control (GitHub)

# ==============================================
# 6. PROJECT README (save as: README.md)
# ==============================================

# Team Timesheet System

A professional timesheet management system built with Azure SQL Database, Node.js API, and React frontend.

## Features
- ✅ Team member management
- ✅ Project tracking with billable/non-billable classification
- ✅ Weekly timesheet entry with task descriptions
- ✅ Auto-save functionality
- ✅ Copy from previous week
- ✅ Export capabilities for integration with accounting systems
- ✅ Real-time data synchronization
- ✅ Responsive web interface

## Architecture
- **Database**: Azure SQL Database
- **API**: Node.js Express server (Azure App Service)
- **Frontend**: React SPA (GitHub Pages)

## Live System
- **Web Interface**: https://yourusername.github.io/timesheet-api
- **API Health Check**: https://timesheet-api-dpcxh5gca6bthgeb.uksouth-01.azurewebsites.net/api/health

## Files in this Repository
- `server.js` - API server code
- `package.json` - Node.js dependencies
- `index.html` - Web interface (GitHub Pages serves this)
- `database-setup.sql` - Database schema and initial data
- `DEPLOYMENT.md` - Detailed deployment instructions
- `.env.example` - Environment variable template

## Development Setup
1. Clone this repository
2. Copy `.env.example` to `.env` and fill in your Azure credentials
3. Run `npm install` to install dependencies
4. Run `npm start` to start the development server

## Deployment
See `DEPLOYMENT.md` for complete deployment instructions.

## Usage
1. Navigate to the web interface
2. Select your name from the team member dropdown
3. Choose the correct week
4. Enter hours and task descriptions
5. Data saves automatically
6. Use "Copy from last week" for recurring tasks
7. Export data using the Export button

## Support
Contact your system administrator for:
- Adding new team members
- Adding new projects
- Database maintenance
- Access issues
