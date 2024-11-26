const vscode = require('vscode');
const fs = require('fs');
const path = require('path');


const { extractElements} = require('./RegularExpression');
const { matchFileInfo } = require('./FileMatch');
const { matchAPIs } = require('./FindAPI');
const { processFiles } = require('./HighlightandMessage');
const { fetchApiResults, generateReport } = require('./CheckAPI');
const { findSimilarTexts } = require('./IntentClassification');
const { accessDatabase } = require('./Database');
/**
 * @param {vscode.ExtensionContext} context
 */

let hoverProviders = new Map(); // Declare hoverProviders at the top

function activate(context) {
    let disposable = vscode.commands.registerCommand('api.checkAPIStatus', async function () {

        clearHoverProviders();
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const searchQuery = await vscode.window.showInputBox({
                placeHolder: "Skip Files or Scan Files",
                prompt: "Skip/Scan",
                value: ""
              });
            let search1Query;
            if(searchQuery == "Skip")
            {     
                search1Query = await vscode.window.showInputBox({
                    placeHolder: "Which files would you like to skip ( use | as a separator if there are multiple )",
                    prompt: "File Name 1 | File Name 2",
                    value: ""
                    });
            } else if (searchQuery == "Scan")
            {
                search1Query = await vscode.window.showInputBox({
                    placeHolder: "Which files would you like to scan ( use | as a separator if there are multiple )",
                    prompt: "File Name 1 | File Name 2",
                    value: ""
                    });
            } else 
            {
                vscode.window.showInformationMessage('You have exited the application');
                return;
            }
            const searchQuery_DB = await vscode.window.showInputBox({
                placeHolder: "Y/N",
                prompt: "Do you need a database ( if yes, please create a txt file 'API_GUARDIAN_DATABASE.txt' with the requried information for connection)",
                value: ""
            });
            if(searchQuery_DB == "Y")
            {
                accessDatabase();
            }
            const searchArray = search1Query.split('|').map(item => item.trim());

            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "Checking API Status",
                    cancellable: false,
                },
            async (progress) => {
            const globPattern = '**/*.{js,py,cs,php}';
            let files = [];
            if (searchQuery == "Scan" && searchArray[0] != '')
            {
                for (const pattern of searchArray) {
                    const file = await vscode.workspace.findFiles(`**/${pattern}`);
                    files.push(...file);
                }
            } else 
            {
                files = await vscode.workspace.findFiles(globPattern);
            }
            const jsFile =[]
            const pyFile =[]
            const csFile = []
            const phpFile = []
            let apiResults, apiResults1, apiResults2, apiResults3;
            for (const file of files) {
                const document = await vscode.workspace.openTextDocument(file);
                const fileExtension = document.fileName.split('.').pop();
                const fileContent = document.getText();
                if (file.fsPath.includes('node_modules')|| file.fsPath.includes('vscode') || file.fsPath.includes('__pycache__') || file.fsPath.includes('bin') || file.fsPath.includes('obj')) {
                    continue; // Skip this file
                }
                if(searchQuery == "Skip")
                {
                    if (searchArray.some(pattern => file.fsPath.includes(pattern))) {
                        continue; // Skip this file
                    }
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
                apiResults1 = await fetchApiResults(jsResults, jsFile, "js");
                processFiles(jsFile, apiResults1, "js", context, hoverProviders);
            } catch (error) {
                console.error("Error processing JS files:", error);
            }
            try {
                matchFileInfo(pyFile);
                console.log(pyFile)
                let pyResults = matchAPIs(pyFile, "py");
                apiResults2 = await fetchApiResults(pyResults, pyFile, "py");
                processFiles(pyFile, apiResults2, "py", context, hoverProviders);
            } catch (error) {
                console.error("Error processing PY files:", error);
            }

            try {
                matchFileInfo(csFile);
                let csResults = matchAPIs(csFile, "cs");
                apiResults = await fetchApiResults(csResults, csFile, "cs");
                processFiles(csFile, apiResults, "cs", context, hoverProviders);
            } catch (error) {
                console.error("Error processing CS files:", error);
            }

            try {
                matchFileInfo(phpFile);
                let phpResults = matchAPIs(phpFile, "php");
                apiResults3 = await fetchApiResults(phpResults, phpFile, "php");
                processFiles(phpFile, apiResults3, "php", context, hoverProviders);
            } catch (error) {
                console.error("Error processing PHP files:", error);
            }

            const safeMerge = (...maps) => {
                const mergedMap = new Map();
                maps.filter(map => map !== undefined && map !== null).forEach(map => {
                    map.forEach((value, key) => {
                        mergedMap.set(key, value);
                    });
                });
                return mergedMap;
            };
            
            // Example usage
            const merged = safeMerge(apiResults, apiResults1, apiResults2, apiResults3);
            
            let statuses = [];
            merged.forEach((value, key) => {
                if (value) { // Safely check for the `status` field
                    statuses.push(value.status);
                }
            });
            
            const similarTexts = await findSimilarTexts(statuses);
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "Checking API Status",
                    cancellable: false,
                },
            async (progress) => {
              
            generateReport(path.dirname(editor.document.uri.fsPath), similarTexts, [...merged]);

            });
            vscode.window.showInformationMessage("Report generated at " + path.join(path.dirname(editor.document.uri.fsPath), 'reports'));
            vscode.window.showInformationMessage("API status check completed.");

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
