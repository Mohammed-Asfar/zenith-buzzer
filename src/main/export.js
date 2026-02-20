// CSV & JSON export utility
const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Export session data as CSV
 * @param {Object} sessionData - Data from session.getSessionData()
 * @param {BrowserWindow} parentWindow - Parent window for the save dialog
 */
async function exportCSV(sessionData, parentWindow) {
    const { filePath } = await dialog.showSaveDialog(parentWindow, {
        title: 'Export Results as CSV',
        defaultPath: `zenith-buzzer-results-${Date.now()}.csv`,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (!filePath) return null;

    let csv = 'Round,Rank,Team Name\n';
    for (const round of sessionData.rounds) {
        for (const buzz of round.buzzes) {
            csv += `${round.roundNumber},${buzz.rank},"${buzz.teamName}"\n`;
        }
    }

    fs.writeFileSync(filePath, csv, 'utf-8');
    return filePath;
}

/**
 * Export session data as JSON
 * @param {Object} sessionData - Data from session.getSessionData()
 * @param {BrowserWindow} parentWindow - Parent window for the save dialog
 */
async function exportJSON(sessionData, parentWindow) {
    const { filePath } = await dialog.showSaveDialog(parentWindow, {
        title: 'Export Results as JSON',
        defaultPath: `zenith-buzzer-results-${Date.now()}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });

    if (!filePath) return null;

    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');
    return filePath;
}

module.exports = { exportCSV, exportJSON };
