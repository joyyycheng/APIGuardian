function matchAPIs(extractedData, extension)
{
    const variableRegex = /\{(.*?)\}|\.?\s*self::\$(\w+)\s*\./g;
    
    let match;
    const variableNames = [];
    let urls = [];
    let variableValues;    
    const APIurls = new Map();
    for (const fileMap of extractedData) {
        for (const [fileName, fileData] of fileMap) {
            for (const [key, value] of fileData.variables.entries()) {
                if (value.includes("https") || value.includes("http")) {
                    urls.push(value);
                    while ((match = variableRegex.exec(value)) !== null) {
                        const curlyVariable = match[1]; // For {variable}
                        const selfVariable = match[2]; // For self::$variable

                        let newVariableName = curlyVariable || selfVariable; // Get the variable name
                        let suffixIndex = 1;

                        // If it's a self variable, prepend the dollar sign
                        if (selfVariable) {
                            newVariableName = `$${selfVariable}`;
                        } else if (curlyVariable) {
                            newVariableName = `${curlyVariable}`;
                        }

                        // Ensure the variable name is unique
                        while (variableNames.includes(newVariableName)) {
                            newVariableName = `${newVariableName}_${suffixIndex}`; // Append suffix
                            suffixIndex++;
                        }

                        variableNames.push(newVariableName); // Add to the list
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
                    } else if (extension == "php")
                    {
                        const regex = /\ . self::/;  
                        if(regex.test(newURLS[i]))
                        {
                            newURLS[i] = newURLS[i].replace(`\ . self::${key} . `, value); // Replace self::$key with value
                        } 
                        newURLS[i] = newURLS[i].replace(`\{${key}}`, value); // Create a new string with the replaced value

                    }
                }
                APIurls.set(urls[i], newURLS[i]);
            }
            
            urls = [];
        
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