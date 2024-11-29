// const vscode = require('vscode');
// const mysql = require('mysql2');

// let terminal;

// async function accessDatabase_SQL()
// {
//     const file = await vscode.workspace.findFiles("API_GUARDIAN_DB.json");
//     const document = await vscode.workspace.openTextDocument(file[0]);
//     const fileContent = document.getText();

//     const jsonContent = JSON.parse(fileContent);
//     const dbtype = jsonContent.DB_TYPE;
//     const command = jsonContent.command;

//     delete jsonContent.DB_TYPE;
//     delete jsonContent.command;

//     if(dbtype == "mysql")
//     {
//         accessDatabase_MYSQL(jsonContent);
//     }


//     terminal = vscode.window.createTerminal({
//         name: 'API Guardian Terminal',
//     });


//     // Send the server start command to the terminal
//     terminal.sendText(command);

//     // Show the terminal to the user
//     terminal.show();
    
// }

// async function accessDatabase_MYSQL(jsonContent)
// {
//     const database = jsonContent.database;

//     const connection = mysql.createConnection(jsonContent);

//     const getTablesQuery = `
//             SELECT table_name
//             FROM information_schema.tables
//             WHERE table_schema = '${database}';
//         `;
//     return new Promise((resolve, reject) => {
//         connection.query(getTablesQuery, (err, results) => {
//             if (err) throw err;
//             const createDatabaseQuery = `CREATE DATABASE IF NOT EXISTS \`${database}_test\``;
//             connection.query(createDatabaseQuery, (err1, tables) => {
//                 if (err1) throw err1;
//                 results.forEach((table) => {
//                     const tableName = table.TABLE_NAME;
//                     const copyTableQuery = `
//                     CREATE TABLE ${database}_test.${tableName} AS SELECT * FROM ${database}.${tableName};
//                     `;
    
//                     connection.query(copyTableQuery, (err) => {
//                         if (err) throw err;
//                         console.log(`Table ${tableName} copied successfully.`);
//                     });
//                 });
//             });
//           });
//     }).finally(() => {
//     });    
// }

// async function DeleteDatabase()
// {
//     const file = await vscode.workspace.findFiles("API_GUARDIAN_DB.json");
//     const document = await vscode.workspace.openTextDocument(file[0]);
//     const fileContent = document.getText();

//     const jsonContent = JSON.parse(fileContent);
//     const database = jsonContent.database;

//     const connection = mysql.createConnection(jsonContent);

//     const dropDatabaseQuery = `DROP DATABASE IF EXISTS \`${database}_test\``;
//     return new Promise((resolve, reject) => {
//     connection.query(dropDatabaseQuery, (err, results) => {
//         if (err) {
//             console.error('Error deleting the database:', err);
//             return;
//         }
//         console.log('Database deleted successfully');
//     });

//     terminal.sendText('\u0003'); // Ctrl+C
//     terminal.dispose();
//     terminal = null;
//     });
// }


// module.exports = { accessDatabase_SQL , DeleteDatabase };