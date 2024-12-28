/**
 * @file This is the main file for the API Guardian which contains the activation and deactivation functions for the extension.
 * @description This file contains the implementation of the API Guardian extension for Visual Studio Code. 
 * The extension scans and checks APIs in various programming languages and provides status reports.
 *
 * @author Joy Cheng Yee Shing
 * @sponsor Wizvision Pte Ltd
 * @project API Guardian - Visual Studio Code Extension [Singapore Institute of Technology | University of Glasgow]
 * @date 2024
 *
 * Copyright (c) [2024] [Joy Cheng Yee Shing]. All rights reserved.
 * Licensed under the [MIT License].
 * For full license terms, refer to the LICENSE file in the project root.
 *
 * This project is part of CSC3101 Capstone Project & CSC3102B Integrated Work Study Programme (AY2024/2025) at [Singapore Institute of Technology | University of Glasgow]
 * @date 2024
 */

const start = require('repl');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');


const { extractElements} = require('./RegularExpression');
const { matchFileInfo } = require('./FileMatch');
const { matchAPIs } = require('./FindAPI');
const { processFiles } = require('./HighlightandMessage');
const { fetchApiResults, generateReport } = require('./CheckAPI');
const { findSimilarTexts } = require('./IntentClassification');
const { accessDatabase_SQL, DeleteDatabase } = require('./Database');
/**
 * @param {vscode.ExtensionContext} context
 */

let hoverProviders = new Map(); // Declare hoverProviders at the top

function activate(context) {
    let disposable = vscode.commands.registerCommand('api.checkAPIStatus', async function () {

        clearHoverProviders();
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const startTime = performance.now();
            const searchQuery = await vscode.window.showQuickPick(
                ['Scan', 'Skip'],  // The list of options for the user to choose from
                {
                  placeHolder: "Would you like to Scan or Skip Files",
                  prompt: "Select Scan or Skip",
                  canPickMany: false  // Only allow a single selection
                }
              );
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
            const searchArray = search1Query.split('|').map(item => item.trim());

            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "Checking API Status",
                    cancellable: false,
                },
            async (progress) => {
            const globPattern = '**/*.{js,py,cs,php,tsx}';
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
            const tsFile = []
            let apiResults, apiResults1, apiResults2, apiResults3, apiResults4;
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
                    case "tsx":
                        const tsx = extractElements(fileContent, path.basename(document.fileName, path.extname(document.fileName)), fileExtension, file.fsPath);
                        tsFile.push(tsx)
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
                let pyResults = matchAPIs(pyFile, "py");
                console.log(pyResults);
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

            try {
                matchFileInfo(tsFile);
                let tsResults = matchAPIs(tsFile, "tsx");
                apiResults4 = await fetchApiResults(tsResults, tsFile, "tsx");
                processFiles(tsFile, apiResults4, "tsx", context, hoverProviders);
            } catch (error) {
                console.error("Error processing TS files:", error);
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
            
            const merged = safeMerge(apiResults, apiResults1, apiResults2, apiResults3, apiResults4);
            
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

            const endTime = performance.now()
            console.log("Total time taken: ", (endTime-startTime)/1000);
            vscode.window.showInformationMessage("Report generated at " + path.join(path.dirname(editor.document.uri.fsPath), 'reports'));
            vscode.window.showInformationMessage("API status check completed : " + ((endTime-startTime)/1000).toFixed(2) + "s");

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
