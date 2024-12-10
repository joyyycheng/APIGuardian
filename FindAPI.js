function matchAPIs(extractedData, extension)
{
    const variableRegex = /\{(.*?)\}|\.?\s*self::\$(\w+)\s*\.|\/:(\w+)|\+([^+]+)\+|<([^>]+)>/g;
    
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
                        const jsLocalVariable = match[3]; // For /:variable
                        const concatVariable = match[4]; // For +variable+
                        const pyLocalVariable = match[5].split(":")[1]; // For <int:string:variable>

                        let newVariableName = curlyVariable || selfVariable || jsLocalVariable || concatVariable || pyLocalVariable; // Get the variable name
                        let suffixIndex = 1;

                        // If it's a self variable, prepend the dollar sign
                        if (selfVariable) {
                            newVariableName = `$${selfVariable}`;
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
                            // If no value is found, try removing the suffix and find again
                            if (!value) {
                                let modifiedVariable = variable.replace(/_\d+$/, ''); 
                                value = fileData.variables.get(modifiedVariable);
                            }
                            if (typeof value === 'string') {
                                value = value 
                                ? value.includes(",") 
                                    ? value.split(",")[1].replace(")", "").trim() 
                                    : value.replace(/^['"]|['"]$/g, '')// Remove leading and trailing quotes
                                : value;
                            }
                            
                            
                            return [variable, value];
                        })
                    );
                }
            }

            let newURLS = processUrls(urls, extension);
            let count  = 1;
            for(let i = 0; i < newURLS.length; i++){
                for (const [key, value] of variableValues) {
                    if(extension == "js" || extension == "ts")
                    {
                        newURLS[i] = newURLS[i].replace(`\${${key}}`, value).replace(new RegExp(`\\:${key}(?!_)`, 'g'), value);
                    } 
                    else if(extension == "py")
                    {
                        newURLS[i] = newURLS[i].replace(`\{${key}}`, value).replace(new RegExp(`['"\s]*\\+\\s*${key}\\s*\\+['"\s]*`, 'g'), value).replace(new RegExp(`${key}(?!_)`, 'g'), value);   // Create a new string with the replaced value
                    } else if (extension == "cs")
                    {
                        newURLS[i] = newURLS[i].replace(`\{${key}}`, value);
                    } else if (extension == "php")
                    {
                        const regex = /\ . self::/;  
                        if(regex.test(newURLS[i]))
                        {
                            newURLS[i] = newURLS[i].replace(`\" . self::${key} . "`, value); // Replace self::$key with value
                        } 
                        newURLS[i] = newURLS[i].replace(`\{${key}}`, value); // Create a new string with the replaced value

                    }
                }
                while (APIurls.has(urls[i])) {
                    urls[i] = `${count}_${urls[i]}`; 
                    count++;
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
      const variableRegex = /\{(.*?)\}|\.?\s*self::\$(\w+)\s*\.|\/:(\w+)|\+([^+]+)\+|<(?:int|string):([^>]+)>/g
      const variables = [...url.matchAll(variableRegex)].map(match => match[1]|| match[2] || match[3] || match[4] || match[5]); // Extract variable names
      
      let processedUrl = url; // Start with the original URL
  
      
        variables.forEach((varName) => {
            // Check if this variable already appeared
            if (variableCount[varName]) {
            // Increment count and create a new variable name with suffix for duplicates
            const newVar = `${varName}_${variableCount[varName]}`;
            
            
            // Replace the current occurrence with the suffixed name
            const replaceRegex = new RegExp(`\\{${varName}\\}|\\$\\{${varName}\\}|self::\\$${varName}|\\/:${varName}|\\+${varName}\\+|<(?:int|string):${varName}>`, 'g');
            processedUrl = processedUrl.replace(replaceRegex, (match) => {
                if (match.startsWith('${') && match.endsWith('}')) {
                  // If it's ${varName}, use the js format
                  return (extension === 'js' || extension == "ts") ? `\${${newVar}}` : `{${newVar}}`;
                } else if (match.startsWith('{') && match.endsWith('}')) {
                  // If it's {varName}, use the generic format
                  return `{${newVar}}`;
                } else if (match.startsWith('self::$')) {
                  // If it's self::$varName
                  return `self::$${newVar}`;
                } else if (match.startsWith('/:')) {
                  // If it's /:varName
                  return `/:${newVar}`;
                } else if (match.startsWith('+') && match.endsWith('+')) {
                  // If it's +varName+
                  return `+${newVar}+`;
                } else if (match.startsWith(':') && !match.startsWith('/:')) {
                  // If it's :id (JavaScript format handling)
                  return `:${newVar}`;
                } else if (match.startsWith('<')) {
                    // If it's <int:varName> or <string:varName>
                    return `${newVar}`;
                }
                return match; // Default case (shouldn't reach here)
              });
            
            variableCount[varName] += 1;
            } else {
                const replaceRegex1 = new RegExp(`<(?:int|string):${varName}>`, 'g');
                processedUrl = processedUrl.replace(replaceRegex1, (match) => {
                    if (match.startsWith('<')) {
                        // If it's <int:varName> or <string:varName>
                        return `${varName}`;
                    }
                });
                variableCount[varName] = 1;
            }
        });
  
      // Add processed URL to the list
      updatedUrls.push(processedUrl);
    });
  
    return updatedUrls;
  }


module.exports = { matchAPIs };