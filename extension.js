const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { extractElements} = require('./RegularExpression');
const { matchFileInfo } = require('./FileMatch');
const { matchAPIs } = require('./FindAPI');
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let disposable = vscode.commands.registerCommand('firstextension.search_stackoverflow', async function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const globPattern = '**/*.{js,py,cs}';
            const files = await vscode.workspace.findFiles(globPattern);
            const jsFile =[]
            const pyFile =[]
            const range = []
            for (const file of files) {
                const document = await vscode.workspace.openTextDocument(file);
                const fileExtension = document.fileName.split('.').pop();
                const fileContent = document.getText();
                if (file.fsPath.includes('node_modules')|| file.fsPath.includes('vscode')) {
                    continue; // Skip this file
                }
                switch (fileExtension) {
                    case "js":
                        const js = extractElements(fileContent, path.basename(document.fileName, path.extname(document.fileName)), fileExtension);
                        jsFile.push(js)
                        break;
                    case "py":
                        const py = extractElements(fileContent, path.basename(document.fileName, path.extname(document.fileName)), fileExtension);
                        pyFile.push(py)
                        break;
                    default:
                        vscode.window.showInformationMessage('No specific action for this file extension.');
                        break;
                }
            }

            // from here since the file name and line of code was added here, match the line and hover over the code to show the new url
            matchFileInfo(jsFile);
            let i = matchAPIs(jsFile, "js");
            console.log("js :", jsFile);
            console.log("js api: ", i);
            matchFileInfo(pyFile);
            let p = matchAPIs(pyFile, "py");
            console.log("js :", pyFile);
            console.log("py api: ", p);

            console.log(range);

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
