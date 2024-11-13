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

let hoverProviders = new Map(); // Declare hoverProviders at the top

function activate(context) {
    let disposable = vscode.commands.registerCommand('api.checkAPIStatus', async function () {
        
        clearHoverProviders();
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "Checking API Status",
                    cancellable: false,
                },
            async (progress) => {
            const globPattern = '**/*.{js,py,cs,php}';
            const files = await vscode.workspace.findFiles(globPattern);
            const jsFile =[]
            const pyFile =[]
            const csFile = []
            const phpFile = []
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
                    case "php":
                        const php = extractElements(fileContent, path.basename(document.fileName, path.extname(document.fileName)), fileExtension, file.fsPath);
                        phpFile.push(php)
                        break;
                    default:
                        vscode.window.showInformationMessage('No specific action for this file extension.');
                        break;
                }
            }
            try {
                matchFileInfo(jsFile);
                let jsResults = matchAPIs(jsFile, "js");
                let apiResults1 = await fetchApiResults(jsResults);
                processFiles(jsFile, apiResults1, "js", context, hoverProviders);
            } catch (error) {
                console.error("Error processing JS files:", error);
            }
            console.log("JS Files:", jsFile);
            // try {
            //     matchFileInfo(pyFile);
            //     let pyResults = matchAPIs(pyFile, "py");
            //     let apiResults2 = await fetchApiResults(pyResults);
            //     processFiles(pyFile, apiResults2, "py", context, hoverProviders);
            // } catch (error) {
            //     console.error("Error processing PY files:", error);
            // }

            // try {
            //     matchFileInfo(csFile);
            //     let csResults = matchAPIs(csFile, "cs");
            //     let apiResults = await fetchApiResults(csResults);
            //     processFiles(csFile, apiResults, "cs", context, hoverProviders);
            // } catch (error) {
            //     console.error("Error processing CS files:", error);
            // }

            // try {
            //     matchFileInfo(phpFile);
            //     let phpResults = matchAPIs(phpFile, "php");
            //     let apiResults3 = await fetchApiResults(phpResults);
            //     processFiles(phpFile, apiResults3, "php", context, hoverProviders);
            // } catch (error) {
            //     console.error("Error processing PHP files:", error);
            // }
            //         vscode.window.showInformationMessage("API status check completed.");
            });
        }
    });

    context.subscriptions.push(disposable);
}

function clearHoverProviders() {
    for (const hoverProvider of hoverProviders.values()) {
        hoverProvider.dispose(); // Dispose of the hover provider
    }
    hoverProviders.clear(); // Clear the map
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
