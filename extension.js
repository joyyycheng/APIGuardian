const vscode = require('vscode');
const fs = require('fs');
const path = require('path');


const { extractElements} = require('./RegularExpression');
const { matchFileInfo } = require('./FileMatch');
const { matchAPIs } = require('./FindAPI');
const { processFiles } = require('./HighlightandMessage');
const { fetchApiResults } = require('./CheckAPI');
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let disposable = vscode.commands.registerCommand('api.checkAPIStatus', async function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const globPattern = '**/*.{js,py,cs}';
            const files = await vscode.workspace.findFiles(globPattern);
            const jsFile =[]
            const pyFile =[]
            const csFile = []
            for (const file of files) {
                const document = await vscode.workspace.openTextDocument(file);
                const fileExtension = document.fileName.split('.').pop();
                const fileContent = document.getText();
                if (file.fsPath.includes('node_modules')|| file.fsPath.includes('vscode') || file.fsPath.includes('__pycache__') || file.fsPath.includes('bin') || file.fsPath.includes('obj')) {
                    continue; // Skip this file
                }
                switch (fileExtension) {
                    case "js":
                        const js = extractElements(fileContent, path.basename(document.fileName, path.extname(document.fileName)), fileExtension, file.fsPath);
                        jsFile.push(js)
                        break;
                    case "py":
                        const py = extractElements(fileContent, path.basename(document.fileName, path.extname(document.fileName)), fileExtension, file.fsPath);
                        pyFile.push(py)
                        break;
                    case "cs":
                        const cs = extractElements(fileContent, path.basename(document.fileName, path.extname(document.fileName)), fileExtension, file.fsPath);
                        csFile.push(cs)
                        break;
                    default:
                        vscode.window.showInformationMessage('No specific action for this file extension.');
                        break;
                }
            }

            matchFileInfo(jsFile);
            let jsResults = matchAPIs(jsFile, "js");
            let apiResults1 = await fetchApiResults(jsResults);
            processFiles(jsFile, apiResults1, "js", context);
            
            matchFileInfo(pyFile);
            console.log(pyFile)
            let pyResults = matchAPIs(pyFile, "py");
            let apiResults2 = await fetchApiResults(pyResults);
            processFiles(pyFile, apiResults2, "py", context);

            matchFileInfo(csFile);
            let csResults = matchAPIs(csFile, "cs");
            let apiResults = await fetchApiResults(csResults);
            processFiles(csFile, apiResults, "cs", context);
        }
    });

    context.subscriptions.push(disposable);
}



// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
