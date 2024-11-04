const vscode = require('vscode');
const hoverProviders = new Map(); // Store hover providers per document URI

function clearHoverProviders(context) {
    for (const hoverProvider of hoverProviders.values()) {
        hoverProvider.dispose(); // Dispose of the hover provider
    }
    hoverProviders.clear(); // Clear the map
}

function processFiles(fileData, apiData, fileType, context) {
    clearHoverProviders(context);
    
    const matches = []; // Store matches to highlight later
    const documentPromises = []; // To accumulate promises for opening documents

    for (const fileMap of fileData) {
        for (const [fileName, fileData] of fileMap) {
            const fileURL = fileData.filePath;
            if (fileData.apiLocations.size !== 0) {
                for (const [key, value] of apiData) {
                    for (const [key1, value1] of fileData.apiLocations) {
                        if (value1.includes(key)) {

                            const fileUri = vscode.Uri.file(fileURL);

                            // Open the document and accumulate matches
                            const docPromise = vscode.workspace.openTextDocument(fileUri).then((d) => {
                                matches.push({ document: d, keyToHighlight: value1, text: value});
                            }, (error) => {
                                vscode.window.showErrorMessage(`Could not open ${fileType} file: ${error.message}`);
                            });

                            documentPromises.push(docPromise); // Push the promise to the array
                        }
                    }
                }
            }
        }
    }

    Promise.all(documentPromises).then(() => {
        if (matches.length > 0) {
            highlightMatchesInFile(matches, context);
        }
    });
}

function highlightMatchesInFile(matches, context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return; // No editor is active
    }

    const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: '#FFFFE0',
    });

    const ranges = []; // Store all ranges to highlight
    const hoverData = new Map(); // To store hover text based on range

    for (const { document, keyToHighlight, text } of matches) {
        for (let line = 0; line < document.lineCount; line++) {
            const lineText = document.lineAt(line).text.trim();
            const index = lineText.indexOf(keyToHighlight.trim());
            if (index !== -1) {
                const startPos = new vscode.Position(line, index);
                const endPos = new vscode.Position(line, index + keyToHighlight.length);
                const range = new vscode.Range(startPos, endPos);
                ranges.push(range);
                const rangeKey = `${line}:${index}`;
                hoverData.set(rangeKey, text); // Store hover text for each range
                break;
            }
        }
    }

    //editor.setDecorations(decorationType, ranges);

    const documentUri = matches[0].document.uri.toString(); // Get the URI from the first match
    if (!hoverProviders.has(documentUri)) {
        const hoverProvider = vscode.languages.registerHoverProvider(matches[0].document.languageId, {
            provideHover(document, position) {
                const currentRange = ranges.find(range => range.contains(position));
                if (currentRange) {
                    const line = currentRange.start.line;
                    const character = currentRange.start.character;
                    const hoverKey = `${line}:${character}`; // Create the same key to retrieve hover text
                    const hoverText = hoverData.get(hoverKey);
                    if (hoverText) {
                        return new vscode.Hover(hoverText);
                    }
                }
                return null; // No hover information
            }
        });

        hoverProviders.set(documentUri, hoverProvider);
        context.subscriptions.push(hoverProvider);
    }

    
}

module.exports = { processFiles };
