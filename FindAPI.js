function matchAPIs(extractedData, extension)
{
    const variableRegex = /\{(.*?)}/g;
    let match;
    const variableNames = [];
    let APIurls = []
    for (const fileMap of extractedData) {
        for (const [fileName, fileData] of fileMap) {
            for (const [key, value] of fileData.variables.entries()) {
                if (value.includes("https") || value.includes("http")) {
                    while ((match = variableRegex.exec(value)) !== null) {
                        variableNames.push(match[1]); // Add the variable name to the array
                    }

                    const variableValues = new Map(
                        variableNames.map(variable => {
                            
                            let value = fileData.variables.get(variable);
                            if (typeof value === 'string') {
                                value = value.replace(/^['"]|['"]$/g, ''); // Remove leading and trailing quotes
                            }
                            return [variable, value];
                        })
                    );
                    console.log("variableValue: ", variableValues);
                    let finalURL = value;
                    for (const [key, value] of variableValues) {
                        if(extension == "js")
                        {
                            finalURL = finalURL.replace(`\${${key}}`, value); // Create a new string with the replaced value
                        } 
                        else if(extension == "py")
                        {
                            finalURL = finalURL.replace(`\{${key}}`, value); // Create a new string with the replaced value
                        }
                    }

                    APIurls.push(finalURL);

                }
            }
        }
    }

    return APIurls;

}

module.exports = { matchAPIs };