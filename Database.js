const vscode = require('vscode');
var sql = require("mssql/msnodesqlv8")

console.log(sql);

async function accessDatabase()
{
    // let files = [];
    // files = await vscode.workspace.findFiles("API_GUARDIAN_DATABASE.json");
    // const document = await vscode.workspace.openTextDocument(files[0]);
    // const content = JSON.parse(document.getText());

    // const connectionString = "Server=LENOVO-PF2858JS\\MSSQLSERVER2019;Database=API_Guardian_test;Integrated Security=True;Driver={SQL Server Native Client 11.0}"

    // try{
    //     await sql.connect(connectionString)

    //     const row =  sql.query("SELECT * FROM userinfo");
    //     consol
    // } catch (error)
    // {
    //     console.log(error);
    // }

}

module.exports = { accessDatabase };