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
                    const functionName = key;
                    const results = [];
                    for (const param of value) {
                        let matched = false;
    
                        // Check against variables to find a match for the function call parameter
                        for (const [variableKey, variableValue] of fileData.variables) {
                            // If the parameter matches a variable
                            if (param === variableKey) {
                                results.push(variableValue);
                                matched = true;
                                break; // No need to check further once a match is found
                            }
                        }
    
                        // If no match was found in variables, treat it as a direct value
                        if (!matched) {
                            results.push(param); // Directly add the literal value
                        }
                    }
                    functionFound.set(functionName, results);
                }
            }
        }
    }

    for (const fileMap of extractedData) {
        for (const [fileName, fileData] of fileMap) {
            const functions = fileData.functions;
            const variables = fileData.variables;
    
            // Iterate over function definitions
            for (const [functionName, params] of functions) {
                if (functionFound.has(functionName)) {
                    if (params.includes(',')) {
                        const splitParams = params.split(',').map(item => item.trim());
                        for (let i = 0; i < splitParams.length; i++) {
                            const calls = functionFound.get(functionName);
                            let paramName = '';
                            if(splitParams[i].includes(' ')){
                                paramName = splitParams[i].trim().split(' ')[1];
                            } else
                            {
                                paramName = splitParams[i].trim();
                            }
                            // Check for existing variable and create a unique name if necessary
                            let uniqueParamName = paramName;
                            let index = 1;
                            while (variables.has(uniqueParamName)) {
                                uniqueParamName = `${paramName}_${index}`; // Create unique variable name
                                index++;
                            }
    
                            // Set the variable in the map
                            variables.set(uniqueParamName, calls[i]);
                        }
                    } else {
                        const calls = functionFound.get(functionName);
                        let param = '';
                        if(params.includes(' ')){
                            param = params.trim().split(' ')[1];
                        } else
                        {
                            param = params.trim();
                        }
                        let uniqueParamName = param;
    
                        // Check for existing variable and create a unique name if necessary
                        let index = 1;
                        while (variables.has(uniqueParamName)) {
                            uniqueParamName = `${param}_${index}`; // Create unique variable name
                            index++;
                        }
    
                        // Set the variable in the map
                        variables.set(uniqueParamName, calls[0]);
                    }
                } else {
                    console.log(`Function ${functionName} in ${fileName} has no matching calls.`);
                }
            }
        }
    }
    

}

module.exports = { matchFileInfo };
