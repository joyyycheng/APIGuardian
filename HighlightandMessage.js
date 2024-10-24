const vscode = require('vscode');

function processFiles(fileData, apiData, fileType, context) {
    for (const fileMap of fileData) {
        for (const [fileName, fileData] of fileMap) {
            if (fileData.apiLocations.size !== 0) {
                for (const [key, value] of apiData) {
                    for (const [key1, value1] of fileData.apiLocations) {
                        // Check if the value includes the key
                        if (value1.includes(key)) {
                            console.log(`Match found in ${fileType}: key = ${key}, value = ${value1} in file ${key1}`);

                            const filePath = vscode.workspace.workspaceFolders[0].uri.fsPath + '/' + key1; // Adjust file path accordingly
                            const fileUri = vscode.Uri.file(filePath);

                            vscode.workspace.openTextDocument(fileUri).then((d) => {
                                highlightMatchInFile(d, value1, value, context);
                            }, (error) => {
                                vscode.window.showErrorMessage(`Could not open ${fileType} file: ${error.message}`);
                            });

                            break;  // Exit the loop if a match is found
                        }
                    }
                }
            }
        }
    }
}

function highlightMatchInFile(document, keyToHighlight, text, context) {
    // Get the active text editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return; // No editor is active
    }

    // Create a decoration type with a yellow background to highlight matches
    const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: '#FFFFE0',  // Highlight with yellow background\
    });

    // Store ranges where matches are found
    const ranges = [];

    // Iterate through each line in the document to find the key
    for (let line = 0; line < document.lineCount; line++) {
        const lineText = document.lineAt(line).text;

        // Check if the line contains the key
        const index = lineText.indexOf(keyToHighlight);
        if (index !== -1) {
            const startPos = new vscode.Position(line, index);
            const endPos = new vscode.Position(line, index + keyToHighlight.length);
            const range = new vscode.Range(startPos, endPos);
            ranges.push({ range });
        }
    }

    // Apply the decoration to the matching ranges
    editor.setDecorations(decorationType, ranges);

    const hoverProvider = vscode.languages.registerHoverProvider(document.languageId, {
        provideHover(document, position) {
            // Check if the position is within any of the ranges
            const isInRange = ranges.some(({ range }) => range.contains(position));
            console.log(ranges);
            if (isInRange) {
                return new vscode.Hover(text);
            }
            return null; // No hover information
        }
    });

    // Clean up hover provider when the document is closed
    context.subscriptions.push(hoverProvider);
}


module.exports = { processFiles };