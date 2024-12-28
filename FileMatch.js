/**
 * @file This file will help to link variables across files
 * @description We will connect the variables across files based on the functions, function calls, and imports.
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

function matchFileInfo(extractedData, fileNames) {
    // Loop through each file's data

    const functionFound = new Map();

    for (const fileMap of extractedData) {
        for (const [fileName, fileData] of fileMap) {
            const fileImports = fileData.imports;
            // Check if the file has imports
            if (fileImports && fileImports.size > 0) {
                // fileName : main
                for (const [key, value] of fileData.functionCalls) {
                    const functionName = key;
                    const results = [];
                    for (const param of value) {
                        let matched = false;
    
                        // Check against variables in the current file
                        for (const [variableKey, variableValue] of fileData.variables) {
                            if (param === variableKey) {
                                results.push(variableValue);
                                matched = true;
                                break; // No need to check further once a match is found
                            }
                        }
    
                        // If no match is found in the current file, check other files
                        if (!matched) {
                            for (const otherFileMap of extractedData) {
                                for (const [otherFileName, otherFileData] of otherFileMap) {
                                    if (otherFileName !== fileName) { // Avoid re-checking the same file
                                        for (const [otherVariableKey, otherVariableValue] of otherFileData.variables) {
                                            if (param === otherVariableKey) {
                                                results.push(otherVariableValue);
                                                matched = true;
                                                break; // Stop searching once a match is found
                                            }
                                        }
                                        if (matched) break; // Stop searching other files once a match is found
                                    }
                                }
                                if (matched) break; // Stop searching other fileMaps once a match is found
                            }
                        }
    
                        // If still no match, treat it as a direct value
                        if (!matched) {
                            results.push(param); // Directly add the literal value
                        }
                    }
                    if(!functionFound.has(functionName))
                    {
                        functionFound.set(functionName, results);
                    }
                }
            }
        }
    }
    

    for (const fileMap of extractedData) {
        for (const [fileName, fileData] of fileMap) {
            const functions = fileData.functions;
            const variables = fileData.variables;
            const calls = fileData.calls;
    
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

            const usageCount = new Map();
            for (let [callsName, callValue] of calls) {
                const variableRegex = /\${(.*?)\}|\.?\s*self::\$(\w+)\s*\.|\/:(\w+)|\+([^+]+)\+|<(?:int|string):([^>]+)>/g
                let match = [...callValue.matchAll(variableRegex)].map(m => ({
                    fullMatch: m[0], // The full matched text
                    variable: m[1] || m[2] || m[3] || m[4] || m[5], // Extract the variable name
                }));

                if(match.length > 0)
                {
                    for (const { fullMatch, variable } of match) {
                    {
                        const count = usageCount.get(variable) || 0;
                        usageCount.set(variable, count + 1);
                        const modifiedVariable = count > 0 ? `${variable}_${count}` : variable;
                        
                        if(variables.has(modifiedVariable))
                        {
                            const value = variables.get(modifiedVariable);
                            let newVal = callValue.replace(fullMatch, value).replace(/['`]/g, '"').replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').replace(/(\w+):/g, '"$1":')
                            calls.set(callsName, newVal);
                        }
                        
                    }
                }

            }
        }
    }
    
}
}

module.exports = { matchFileInfo };
