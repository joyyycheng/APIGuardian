const fs = require('fs');
const path = require('path');

function extractElements(codes, fileName, extension, filePath)
{
    let variableRegex;
    let functionRegex;
    let importRegex;
    let awaitRegex = '';
    let typeRegex = '';
    let headerRegex = '';
    let fieldRegex = '';
    let expressRegex = '';
    let portRegex = ''

    switch(extension)
    {
        case "py":
            variableRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$|^\s*\S+\.route\s*\(([^)]+)\)\s*;?/gm;
            functionRegex = /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)\s*:/gm;
            // the from .. import got an error
            importRegex = /^\s*(import\s+([a-zA-Z_][a-zA-Z0-9_.]*))\s*\r?\n|^\s*from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import\s+([a-zA-Z_][a-zA-Z0-9_,\s]*)\s*$/gm;
            typeRegex = /\.(get|post|put|delete)\(([\s\S]*?)\)/g;
            break; 
        case "js":
            variableRegex = /^\s*(const|let|var)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.*?)$|^\s*\S+\.(get|post|put|delete)\s*\(([^)]+)\)\s*;?/gm;
            functionRegex = /^\s*(async\s+)?(function\s+([a-zA-Z_][a-zA-Z0-9_]*)|\(?\s*([a-zA-Z_][a-zA-Z0-9_]*)?\s*\)?\s*=>)\s*\((.*?)\)/gm;
            importRegex = /^\s*(const)?\s*(\{([^}]+)\}|\w+)\s*=\s*(require\(\s*['"]([^'"]+)['"]\s*\)|import\s+\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]\s*);?\s*$/gm;
            typeRegex = /fetch\s*\(\s*([^)]+?)\s*\)/g;
            break;
        case "cs":
            variableRegex = /^(?:(?:\s*(public|private|protected)\s+)?(?:static\s+)?(?:readonly\s+)?)?\s*(int|double|float|string|var|bool|char)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.*?);?$/gm;
            functionRegex = /^\s*(public|private|protected|internal)?\s*(static)?\s*(async)?\s*(void|int|double|string|bool|Task)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*{?\s*$/gm;
            importRegex = /^\s*using\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*;/gm;
            awaitRegex = /await\s+([a-zA-Z0-9_.]+)\s*\((.*?)\);\s*/g;
            break;
        case "php":
            variableRegex = /^\s*(public|private|protected)?\s*(static\s+)?\$(\w+)\s*=\s*(.*)$/gm;
            functionRegex = /^\s*(public|private|protected)?\s*(static\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)\s*{/gm;
            importRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)::([a-zA-Z_][a-zA-Z0-9_]*)\((.*?)\);/gm;
            typeRegex = /curl_setopt\s*\(\s*\$[a-zA-Z_][\w]*,\s*CURLOPT_CUSTOMREQUEST,\s*"([^"]*)"/g;
            headerRegex = /CURLOPT_HTTPHEADER\s*,\s*(\$\w+)/g;
            fieldRegex = /CURLOPT_POSTFIELDS\s*,\s*(\$\w+)/g;
            break;
        case "ts":
            variableRegex = /^\s*(const|let|var)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.*?)$|^\s*\S+\.(get|post|put|delete)\s*\(([^)]+)\)\s*;?/gm;
            functionRegex = /^\s*(async\s+)?(function\s+([a-zA-Z_][a-zA-Z0-9_]*)|\(?\s*([a-zA-Z_][a-zA-Z0-9_]*)?\s*\)?\s*=>)\s*\((.*?)\)/gm;
            importRegex = /^\s*(const)?\s*(\{([^}]+)\}|\w+)\s*=\s*(require\(\s*['"]([^'"]+)['"]\s*\)|import\s+\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]\s*);?\s*$/gm;
            typeRegex = /fetch\s*\(\s*([^)]+?)\s*\)/g;
            break;    
        default:
            console.log("Unsupported file type: " + extension);
            return;
    }

    // Arrays to store the matches
    const variables = new Map();
    const functions = new Map();
    const imports = new Map();
    const functionCalls = new Map();
    const extractedData = new Map();
    const apiLocations = new Map();
    const types = new Map();
    const calls = new Map();

    let match;
    let expressURL;
    let expressPort;
    let express = undefined;
    let expressPortVar;

    const code = codes.replace(/(^|\s)(\/\/.*$)/gm, (match, p1, p2) => {
        if (p1.trim().endsWith('http') || p1.trim().endsWith('https')) {
            return match; 
        }
        return ''; 
    });

    while ((match = variableRegex.exec(code)) !== null) {
        if (extension == "js" || extension == "ts") {
            let key = (match[2] && match[2].trim()) ? match[2].trim() : (match[4] && match[4].trim());
            let newKey = key; 
            let count = 1;
            let value = (match[3] && match[3].trim()) ? match[3].trim() : (match[5] && match[5].trim());
            match[3] = value;

    
            while (variables.has(newKey)) {
                newKey = `${key}_${count}`; 
                count++;
            }
            
            if (!value.trim().endsWith(";")) {
                let collectedValue = value; 
                let braceCount = 0;
                let nextIndex = variableRegex.lastIndex;

                for (let char of value) {
                    if (char === "{" || char === "[" || char === "(") braceCount++;
                    if (char === "}" || char === "]" || char === ")") braceCount--;
                }

                while ((braceCount !== 0 || !collectedValue.trim().endsWith(";")) && nextIndex < code.length) {
                    const nextLine = code.substring(nextIndex).split("\n", 1)[0];
                    nextIndex += nextLine.length + 1; 
                    collectedValue += "\n" + nextLine;

                    for (let char of nextLine) {
                        if (char === "{" || char === "[" || char === "(") braceCount++;
                        if (char === "}" || char === "]" || char === ")") braceCount--;
                    }
                }

                value = collectedValue; 
            }     

            express = newKey;
            let appListenRegex = new RegExp(`\.listen\\((.*?)\\)`, 'g');
            let match1;
            while ((match1 = appListenRegex.exec(code)) !== null) {
                expressPortVar = match1[1].trim().split(',')[0];
                break;
            }
            
            if(newKey == expressPortVar)
            {
                expressURL = `http://localhost:${value.replace(';', '')}`
            }

            if(expressPortVar != undefined)
            {
                if(key == "get" || key == "post" || key == "put" || key == "delete")
                {
                    let valueURL = value.split(',').map(item => item.replace(/'/g, ''));
                    const containsValue = Array.from(variables.values()).includes(expressURL + valueURL[0]);
                    let containCount = 1;
                    if(containsValue)
                    {
                        match[3] = containCount + "_" + expressURL + valueURL[0];
                        containCount++;
                    } else 
                    {
                        match[3] = expressURL + valueURL[0];
                    }
                    
                    variables.set("url_"+newKey,  expressURL + valueURL[0]);
                }
            }

            if(value.includes("process.env."))
            {
                fs.readFile(path.join(path.dirname(filePath), ".env"), 'utf8', (err, data) => {
                    if (err) {
                        console.error("Error reading file:", err);
                        return;
                    }
                    let match1;
                    while ((match1 = variableRegex.exec(data)) !== null) {
                        const regex = /process\.env\.([^"]+)/;
                        const match2 = value.match(regex);
                        if(match2[1] == match1[1])
                        {
                            value = match1[2];
                            variables.set(newKey, value); 
                            return;
                        }
                    }
                });
            }        
            variables.set(newKey, value.replace(';', ''));
    
            if (match[3].includes("https") || match[3].includes("http")) {
                const i = match[0].replace(/^\n/, '').replace(/\r\n/g, '');
    
                let apiKey = `${fileName}.${extension}`; 
                let apiNewKey = apiKey;
                count = 1;
    
                while (apiLocations.has(apiNewKey)) {
                    apiNewKey = `${apiKey}_${count}`;
                    count++;
                }

                apiLocations.set(apiNewKey, i + "|" + match[3]); 

                let isPostFound = false;

                while ((match = typeRegex.exec(codes)) !== null) {
                    const fetchArgs = match[1].trim();
                    
                    let args = fetchArgs.split(',');

                    args = args.map(arg => arg.trim());

                    if (args.length > 1) {
                        types.set(newKey, 'POST');
                        calls.set(newKey, match[0]);
                        isPostFound = true;
                    } else {
                        types.set(newKey, 'GET');
                    }
                }

                if(express != undefined)
                {
                    if (newKey == "get") {
                        types.set("url_"+newKey, 'GET');
                        isPostFound = true;
                    } else if (newKey == "post" || newKey == "put" || newKey == "delete") {
                        types.set("url_"+newKey, 'POST');
                        let callsvalue = value.split(',').map(item => item.replace(/'/g, ''));
                        calls.set("url_"+newKey, callsvalue[1] + ',' + callsvalue[2]);
                        isPostFound = true;
                    }
                }

                if (!isPostFound) {
                    types.set(newKey, 'GET');
                }
            }
        } else if (extension == "py") {
            let key = match[1];
            let newKey = key;
            let count = 1;
            let local = false;
            let port;
            let args;
            let value = (match[2] && match[2].trim()) || (match[3] && match[3].trim());
            if(newKey == undefined)
            {
                args = value.split(',');
                newKey = args[1].trim().split("=")[1].replace(/[\[\]'"]+/g, '')
                let portRegex = new RegExp(`port=(\\d+)`, 'g');
                let match1;
                while ((match1 = portRegex.exec(code)) !== null) {
                    port = match1[1];
                    break;
                }
                local = true;
            }
            match[2] = value;
            while (variables.has(newKey)) {
                newKey = `${key}_${count}`; 
                count++;
            }

            if ( typeof value === "string" && (value.includes("{") || value.includes("[") || value.includes('"') || value.includes("("))) {
                let block = value;  // The value is stored as a starting point.
                let braceCount = 0;
                let quoteCount = 0;
                
                // Loop through the characters in the value and count braces and quotes
                for (let char of value) {
                    if (char === "{" || char === "[" || char == "(") braceCount++;
                    if (char === "}" || char === "]" || char == ")") braceCount--;
                    if (char === '"') quoteCount++;
                }
                
                let index = variableRegex.lastIndex;  // Initialize index based on your regex context.
                
                // Continue reading the code from the current index until the counts balance.
                while ((braceCount !== 0 || quoteCount % 2 !== 0) && index < code.length) {
                    let char = code[index++];
                    block += char;  // Add the character to the block of text.
                    
                    if (char === "{" || char === "[" || char == "(") braceCount++;  // Increment brace count.
                    if (char === "}" || char === "]" || char == ")") braceCount--;  // Decrement brace count.
                    if (char === '"') quoteCount++;  // Toggle quote count (even quotes mean it's balanced).
                }
            
                value = block;  // Now `value` contains the full content with properly balanced braces and quotes.
            }

            if(local)
            {
                  variables.set("url_"+newKey, `http://localhost:${port}${args[0].replace(/'/g, '')}`)
            }
            

            if(value.includes("os.getenv"))
            {
                fs.readFile(path.join(path.dirname(filePath), ".env"), 'utf8', (err, data) => {
                    if (err) {
                        console.error("Error reading file:", err);
                        return;
                    }
                    let match1;
                    while ((match1 = variableRegex.exec(data)) !== null) {
                        const regex = /os\.getenv\("([^"]+)"\)/;
                        const match2 = value.match(regex);
                        if(match2[1] == match1[1])
                        {
                            value = match1[2];
                            variables.set(newKey, value); 
                            return;
                        }
                    }
                });
            }

            variables.set(newKey, value); 
    
            if (match[2].includes("https") || match[2].includes("http")) {
                const j = match[0].replace(/^\n/, '').replace(/\r\n/g, '');
    
                let apiKey = `${fileName}.${extension}`;
                let apiNewKey = apiKey; 
                count = 1;
    
                while (apiLocations.has(apiNewKey)) {
                    apiNewKey = `${apiKey}_${count}`; 
                    count++;
                }

                if(!local)
                {
                    let isPostFound = false;

                    while ((match = typeRegex.exec(codes)) !== null) {
                        const fetchArgs = match[1].trim();
                        
                        if (fetchArgs.startsWith('.post')) {
                            types.set(newKey, 'POST');
                            calls.set(newKey, match[1]);
                            isPostFound = true;
                        } else if(fetchArgs.startsWith('.put')) {
                            types.set(newKey, 'PUT');
                            calls.set(newKey, match[1]);
                            isPostFound = true;
                        } else if(fetchArgs.startsWith('.delete')) {
                            types.set(newKey, 'DELETE');
                            calls.set(newKey, match[1]);
                            isPostFound = true;
                        } else {
                            types.set(newKey, 'GET');
                        }
                    }
    
                    if (!isPostFound) {
                        types.set(newKey, 'GET');
                    }
                } else
                {
                    if(newKey.startsWith("GET"))
                    {
                        types.set(newKey, 'GET');
                    }else if(newKey.startsWith("POST"))
                    {
                        types.set(newKey, 'POST');
                    }else if(newKey.startsWith("PUT"))
                    {
                        types.set(newKey, 'PUT');
                    }else if(newKey.startsWith("DELETE"))
                    {
                        types.set(newKey, 'DELETE');
                    }
                }

                apiLocations.set(apiNewKey, j); 
            }
        } else if (extension == "cs")
        { 
            let key = match[3];
            let newKey = key; 
            let count = 1;

            while (variables.has(newKey)) {
                newKey = `${key}_${count}`;
                count++;
            }

            if(match[4].includes("$"))
            {
                match[4] = match[4].replace('$', '').trim();
            }

            variables.set(newKey, match[4]);

            if (match[4].includes("https") || match[4].includes("http")) {
                const j = match[0].replace(/^\n/, '').replace(/\r\n/g, '');
    
                let apiKey = `${fileName}.${extension}`; 
                let apiNewKey = apiKey; 
                count = 1;
    
                while (apiLocations.has(apiNewKey)) {
                    apiNewKey = `${apiKey}_${count}`; 
                    count++;
                }
    
                apiLocations.set(apiNewKey, j); 
                types.set(newKey, 'GET');
            }
        } else if(extension == "php")
        {
            let key = `$${match[3]}`;
            let newKey = key; 
            let count = 1;
            let value = match[4].trim()

            while (variables.has(newKey)) {
                newKey = `${key}_${count}`; 
                count++;
            }

            if (!value.trim().endsWith(";")) {
                let collectedValue = value; 
                let braceCount = 0;
                let nextIndex = variableRegex.lastIndex;

                for (let char of value) {
                    if (char === "{" || char === "[" || char === "(") braceCount++;
                    if (char === "}" || char === "]" || char === ")") braceCount--;
                }

                while ((braceCount !== 0 || !collectedValue.trim().endsWith(";")) && nextIndex < code.length) {
                    const nextLine = code.substring(nextIndex).split("\n", 1)[0];
                    nextIndex += nextLine.length + 1; 
                    collectedValue += "\n" + nextLine;

                    for (let char of nextLine) {
                        if (char === "{" || char === "[" || char === "(") braceCount++;
                        if (char === "}" || char === "]" || char === ")") braceCount--;
                    }
                }

                value = collectedValue; 
            }         
            value = value.trim().replace(/;$/, "");
            variables.set(newKey, value);

            if (match[4].includes("https") || match[4].includes("http")) {
                const j = match[0].replace(/^\n/, '').replace(/\r\n/g, '');
    
                let apiKey = `${fileName}.${extension}`; 
                let apiNewKey = apiKey; 
                count = 1;
    
                while (apiLocations.has(apiNewKey)) {
                    apiNewKey = `${apiKey}_${count}`; 
                    count++;
                }
    
                apiLocations.set(apiNewKey, j); 

                let isPostFound = false;

                while ((match = typeRegex.exec(codes)) !== null) {
                    types.set(newKey, match[1]);
                    isPostFound = true;
                    break;
                }
                while ((match = headerRegex.exec(codes)) !== null) {
                    const args = match[0].split(',');
                    variables.set(args[0], args[1]); 
                }
                while ((match = fieldRegex.exec(codes)) !== null) {
                    const args = match[0].split(',');
                    variables.set(args[0], args[1]); 
                }

                if (!isPostFound) {
                    types.set(newKey, 'GET');
                }
            }
        }
    }
    
    

    while ((match = functionRegex.exec(code)) !== null) {
        if(extension == "js" || extension == "ts")
        {
            if(match[1] == 'async ')
                {
                    const functionName = match[3]; // match[2] for named functions, match[3] for arrow functions
                    if (functionName) {
                        functions.set(functionName, match[5]);
                    }
                } else
                {
                    const functionName = match[3]; // match[2] for named functions, match[3] for arrow functions
                    if (functionName) {
                        functions.set(functionName, match[5]);
                    } 
                }
        } else if (extension == "py")
        {
            functions.set(match[1], match[2]);
        } else if(extension == "cs")
        {
            functions.set(match[5], match[6]);
        } else if(extension == "php")
        {
            functions.set(match[3], match[4]);
        }
    }
    
    if(awaitRegex != '')
    {
        while ((match = awaitRegex.exec(code)) !== null) {
            if(extension == "cs")
            {
                const fullFunctionName = match[1];
                const functionParts = fullFunctionName.split('.'); 
            
                const className = functionParts[0]; 
                const methodName = functionParts[1]; 
            
                if (imports.has(className)) {
                    imports.get(className).push(methodName);
                } else {
                    imports.set(className, [methodName]);
                }
            }
        }
    }


    // Find import statements
    while ((match = importRegex.exec(code)) !== null) {
        if(extension == "js" || extension == "ts")
        {   let importedNames = [];
            //const importedNames = match[1].replace(/[{}]/g, '').split(',').map(name => name.trim()); // Extract names inside curly braces
            const modulePath = match[5].replace('./', '').replace('.js', '');
            const functions = match[3]
            if (functions) {
                if (functions.includes(',')) { 
                    importedNames = functions
                        .split(',')
                        .map(name => name.trim().replace(/['"]/g, '')); // Clean quotes
                } else {
                    // If no comma is present, trim the specific import and add it
                    importedNames = [functions.trim().replace(/['"]/g, '')];
                }
            }
            imports.set(modulePath, importedNames);
        } else if(extension == "py")
        {
            let importType ="import"
            if(match[1] == undefined)
            {
                importType = "from"
            }
            
            let modulePath = match[1] || match[3]
            // If it's a 'from' import, we need to handle the imported functions or classes
            let importedNames = [];
            if (importType === 'from') {
                const specificImports = match[2] || match[4]; // e.g., 'get_weathers, process_data'
                if (specificImports) {
                    if (specificImports.includes(',')) { 
                        importedNames = specificImports
                            .split(',')
                            .map(name => name.trim().replace(/['"]/g, '')); // Clean quotes
                    } else {
                        // If no comma is present, trim the specific import and add it
                        importedNames = [specificImports.trim().replace(/['"]/g, '')];
                    }
                }
            } else {
                // For a standard import, we can just set the module name as the imported name
                importedNames = [modulePath];
            }
        
            // You may want to adjust how you set the imports based on your existing logic
            // Assuming you want to store the module name as the key and the imported names as values
            imports.set(modulePath, importedNames);
        } else if (extension == "php")
        {
            let key = match[1];
            let newKey = key; // Start with the original key
            let count = 1;
            while (imports.has(newKey)) {
                newKey = `${key}_${count}`; // Append _1, _2, etc.
                count++;
            }
            imports.set(newKey, match[2]);
        }
    }

    functions.forEach((params, functionName) => {
        // Create a regex pattern for the function name to find its calls
        const regex = new RegExp(`(?<!\\w)(${functionName})\\s*\\((.*?)\\)`, 'g');
        const calls = [];
        let match;
        if(extension == "cs")
        {
            while ((match = regex.exec(code)) !== null) {
                const args = match[2] ? match[2].split(',').map(arg => arg.trim()) : []; // Get arguments
        
                const params = args.map(arg => arg.split(' ').slice(1).join(' ')).filter(param => param); // Get only the parameter names
                calls.push(params); // Store the function name and parameter names
            }
        } else if(extension == "php")
        {
            while ((match = regex.exec(code)) !== null) {
                const args = match[2] ? match[2].split(',').map(arg => arg.trim().replace(/^\$/, '')) : []; // Get arguments
                calls.push(args); // Store the arguments for the call
            }
        }
        else
        {
            while ((match = regex.exec(code)) !== null) {
                const args = match[2] ? match[2].split(',').map(arg => arg.trim()) : []; // Get arguments
                calls.push(args); // Store the arguments for the call
            }
        }

        if (calls.length > 0) {
            let key = functionName;
            let newKey = key; // Start with the original key
            let count = 1;

            while (functionCalls.has(newKey)) {
                if(match[1] == undefined)
                {
                    functionCalls.set(newKey, calls)
                    break;
                } else
                {
                    newKey = `${key}_${count}`; 
                    count++;
                }
            }
            functionCalls.set(newKey,calls); // Set the unique key in variables
        }
    });

    imports.forEach((params, functionName) => {
        
        if(functionName == undefined)
        {
            return;
        } 
        if(extension == "js" || extension == "ts")
        {
            if (Array.isArray(params)) { // Check if functionName is an array
                for (let i = 0; i < params.length; i++) {
                    let param = params[i];  // Get the parameter
            
                    // Trim any leading/trailing whitespace
                    if (param !== param.trim()) {
                        param = param.trim(); // Trim if there is whitespace
                    }
            
                    const regex = new RegExp(`(?<!\\w)(${param})\\s*\\((.*?)\\)`, 'g'); // Separate regex for each param
            
                    let match;
                    while ((match = regex.exec(code)) !== null) {
                        const args = match[2] ? match[2].split(',').map(arg => arg.trim()) : []; // Get arguments
                        functionCalls.set(param, args);
                    }
                }
            } else {
                let params = functionName
                if (params !== params.trim()) {
                    params = params.trim(); // Trim if there is whitespace
                }
        
                const regex = new RegExp(`(?<!\\w)(${params})\\s*\\((.*?)\\)`, 'g'); // Separate regex for each param
        
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const args = match[2] ? match[2].split(',').map(arg => arg.trim()) : []; // Get arguments
                    functionCalls.set(params, args);
                }
            }
            
        } else if(extension == "py")
        {
            for (let i = 0; i < params.length; i++) {
                let param = params[i];  // Trim any leading/trailing whitespace
            
                if (param !== param.trim()) {
                    param = param.trim(); // Trim if there is whitespace
                }
            
                const regex = new RegExp(`(?<!\\w)(${param})\\s*\\((.*?)\\)`, 'g'); // Separate regex for each param
            
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const args = match[2] ? match[2].split(',').map(arg => arg.trim()) : []; // Get arguments
                    functionCalls.set(param, args);
                }
            }
            
        } else if(extension == "cs")
        {
            for (let i = 0; i < params.length; i++) {
                let param = params[i];  // Trim any leading/trailing whitespace
            
                if (param !== param.trim()) {
                    param = param.trim(); // Trim if there is whitespace
                }
                const regex = new RegExp(`(?<!\\w)(${functionName}.${param})\\s*\\((.*?)\\)`, 'g'); // Separate regex for each param
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const args = match[2] ? match[2].split(',').map(arg => arg.trim()) : []; // Get arguments
                    functionCalls.set(param, args);
                }
            }
        } else if (extension == "php")
        {
            let match;
            while ((match = importRegex.exec(code)) !== null) {
                const args = match[3] ? match[3].split(',').map(arg => arg.trim()) : []; // Get arguments
                functionCalls.set(match[2], args);
            }
        }
        

    });

    extractedData.set(fileName, {
        name: fileName,
        type: types,
        calls: calls, 
        variables: variables,
        functions: functions,
        imports: imports,
        functionCalls: functionCalls, 
        apiLocations: apiLocations,
        filePath : filePath
    })

    return extractedData;
}

module.exports = {extractElements };