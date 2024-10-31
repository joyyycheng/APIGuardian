function matchAPIs(extractedData, extension)
{
    const variableRegex = /\{(.*?)}/g;
    let match;
    const variableNames = [];
    const urls = [];
    let variableValues;    
    const APIurls = new Map();
    for (const fileMap of extractedData) {
        for (const [fileName, fileData] of fileMap) {
            for (const [key, value] of fileData.variables.entries()) {
                if (value.includes("https") || value.includes("http")) {
                    urls.push(value);
                    while ((match = variableRegex.exec(value)) !== null) {
                        let variableName = match[1];
                        let suffixIndex = 1;
                        let newVariableName = variableName;
                    
                        while (variableNames.includes(newVariableName)) {
                            newVariableName = `${variableName}_${suffixIndex}`; 
                            suffixIndex++;
                        }
                        variableNames.push(newVariableName); 
                    }
                    
                    
                    variableValues = new Map(
                        variableNames.map(variable => {
                            let value = fileData.variables.get(variable);
                            if (typeof value === 'string') {
                                value = value.replace(/^['"]|['"]$/g, ''); // Remove leading and trailing quotes
                            }
                            
                            return [variable, value];
                        })
                    );
                }
            }

            let newURLS = processUrls(urls, extension);
            console.log("variable values: ", variableValues);
            
            for(let i = 0; i < newURLS.length; i++){
                for (const [key, value] of variableValues) {
                    if(extension == "js")
                    {
                        newURLS[i] = newURLS[i].replace(`\${${key}}`, value); // Create a new string with the replaced value
                    } 
                    else if(extension == "py")
                    {
                        newURLS[i] = newURLS[i].replace(`\{${key}}`, value); // Create a new string with the replaced value
                    } else if (extension == "cs")
                    {
                        newURLS[i] = newURLS[i].replace(`\{${key}}`, value);
                    }
                }
                APIurls.set(urls[i], newURLS[i]);
            }
        
        }
    }
    return APIurls;

}

function processUrls(urls, extension) {
    const updatedUrls = []; // Array to store processed URLs
    const variableCount = {}; // Object to count occurrences of each variable
  
    urls.forEach(url => {
      // Determine regex based on extension
      const variableRegex = extension === 'js' ? /\$\{(.*?)\}/g : /\{(.*?)\}/g;
      const variables = [...url.matchAll(variableRegex)].map(match => match[1]);
      
      let processedUrl = url; // Start with the original URL
  
      
        variables.forEach((varName) => {
            // Check if this variable already appeared
            if (variableCount[varName]) {
            // Increment count and create a new variable name with suffix for duplicates
            const newVar = `${varName}_${variableCount[varName]}`;
            
            
            // Replace the current occurrence with the suffixed name
            const replaceRegex = new RegExp(extension === 'js' ? `\\$\\{${varName}\\}` : `\\{${varName}\\}`, 'g');
            processedUrl = processedUrl.replace(replaceRegex, extension === 'js' ? `\${${newVar}}` : `{${newVar}}`);
            
            variableCount[varName] += 1;
            } else {
            // First occurrence of the variable: count it without suffix
            variableCount[varName] = 1;
            }
        });
  
      // Add processed URL to the list
      updatedUrls.push(processedUrl);
    });
  
    return updatedUrls;
  }


module.exports = { matchAPIs };