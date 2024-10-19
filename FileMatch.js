function matchFileInfo(extractedData, fileNames) {
    // Loop through each file's data

    const functionFound = new Map();

    for (const fileMap of extractedData) {
        for (const [fileName, fileData] of fileMap) {
            const fileImports = fileData.imports;
            // Check if the file has imports
            if (fileImports && fileImports.size > 0) {
                // fileName : main
                for(const [key, value] of fileData.functionCalls)
                {
                    functionFound.set(key[0], value);
                }
            }
        }
    }

    for (const fileMap of extractedData) {
        for (const [fileName, fileData] of fileMap) {
            const functions = fileData.functions;
            // Iterate over function definitions
            for (const [functionName, params] of functions) {
                if (functionFound.has(functionName)) {
                    const calls = functionFound.get(functionName);
                    fileData.variables.set(params, calls[0]);
                } else {
                    console.log(`Function ${functionName} in ${fileName} has no matching calls.`);
                }
            }
        }
    }

}

module.exports = { matchFileInfo };
