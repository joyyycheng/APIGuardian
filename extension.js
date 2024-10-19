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

                switch (fileExtension) {
                    case "js":
                        const js = extractElements(fileContent, path.basename(document.fileName, path.extname(document.fileName)), fileExtension);
                        // for (const [fileName, fileData] of js) {
                        //     if(fileData.apiLocations.get(fileName))
                        //     {
                        //         highlightLineInFile(fileName+"."+fileExtension, fileData.apiLocations.get(fileName))
                        //     } 
                        // }
                        jsFile.push(js)
                        break;
                    case "py":
                        const py = extractElements(fileContent, path.basename(document.fileName, path.extname(document.fileName)), fileExtension);
                        // for (const [fileName, fileData] of py) {
                        //     if(fileData.apiLocations.get(fileName))
                        //     {
                        //         highlightLineInFile(fileName+"."+fileExtension, fileData.apiLocations.get(fileName))
                        //     } 
                        // }
                        
                        pyFile.push(py)
                        break;
                    default:
                        vscode.window.showInformationMessage('No specific action for this file extension.');
                        break;
                }
            }
            matchFileInfo(jsFile);
            let i = matchAPIs(jsFile, "js");

            console.log("PY :", pyFile);
            matchFileInfo(pyFile);
            let p = matchAPIs(pyFile, "py");

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
