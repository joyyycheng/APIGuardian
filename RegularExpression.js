function extractElements(codes, fileName, extension)
{
    let variableRegex;
    let functionRegex;
    let importRegex;

    switch(extension)
    {
        case "py":
            variableRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/gm;
            functionRegex = /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)\s*:/gm;
            importRegex = /^\s*(import|from)\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*(?:import\s+([a-zA-Z_][a-zA-Z0-9_,\s]*))?\s*$/gm;
            break;
        case "js":
            variableRegex = /^\s*(const|let|var)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.*?);?$/gm;
            functionRegex = /^\s*(async\s+)?(function\s+([a-zA-Z_][a-zA-Z0-9_]*)|\(?\s*([a-zA-Z_][a-zA-Z0-9_]*)?\s*\)?\s*=>)\s*\((.*?)\)/gm;
            importRegex = /^\s*(const)?\s*(\{([^}]+)\}|\w+)\s*=\s*(require\(\s*['"]([^'"]+)['"]\s*\)|import\s+\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]\s*);?\s*$/gm;
            break;
        case "cs":
            variableRegex = /^\s*(int|double|float|string|var|bool|char)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gm;
            functionRegex = /^\s*(public|private|protected|internal)?\s*(static)?\s*(void|int|double|string|bool)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(.*\)/gm;
            importRegex = /^\s*using\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*;/gm;
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

    let match;

    const code = codes.replace(/(^|\s)(\/\/.*$)/gm, (match, p1, p2) => {
        // Check if the previous characters contain http or https
        if (p1.trim().endsWith('http') || p1.trim().endsWith('https')) {
            return match; // keep the comment if it's a URL
        }
        return ''; // remove the comment otherwise
    });


    while ((match = variableRegex.exec(code)) !== null) {
        if (extension == "js") {
            let key = match[2];
            let newKey = key; // Start with the original key
            let count = 1;
    
            // Check for existing keys in variables and create a unique key if needed
            while (variables.has(newKey)) {
                if(match[1] == undefined)
                {
                    variables.set(newKey, match[3])
                    break;
                } else
                {
                    newKey = `${key}_${count}`; // Append _1, _2, etc.
                    count++;
                }
            }
            variables.set(newKey, match[3]); // Set the unique key in variables
    
            if (match[3].includes("https") || match[3].includes("http")) {
                const i = match[0].replace(/^\n/, '').replace(/\r\n/g, '');
    
                // Check for duplicates in apiLocations
                let apiKey = `${fileName}.${extension}`; // Use the original file key
                let apiNewKey = apiKey; // Start with the original api key
                count = 1;
    
                // Create a unique key if the apiLocations already contains it
                while (apiLocations.has(apiNewKey)) {
                    apiNewKey = `${apiKey}_${count}`; // Append _1, _2, etc.
                    count++;
                }
    
                apiLocations.set(apiNewKey, i); // Store the value in apiLocations
            }
        } else if (extension == "py") {
            let key = match[1];
            let newKey = key; // Start with the original key
            let count = 1;
    
            // Check for existing keys in variables and create a unique key if needed
            while (variables.has(newKey)) {
                newKey = `${key}_${count}`; // Append _1, _2, etc.
                count++;
            }
    
            variables.set(newKey, match[2]); // Set the unique key in variables
    
            if (match[2].includes("https") || match[2].includes("http")) {
                const j = match[0].replace(/^\n/, '').replace(/\r\n/g, '');
    
                // Check for duplicates in apiLocations
                let apiKey = `${fileName}.${extension}`; // Use the original file key
                let apiNewKey = apiKey; // Start with the original api key
                count = 1;
    
                // Create a unique key if the apiLocations already contains it
                while (apiLocations.has(apiNewKey)) {
                    apiNewKey = `${apiKey}_${count}`; // Append _1, _2, etc.
                    count++;
                }
    
                apiLocations.set(apiNewKey, j); // Store the value in apiLocations
            }
        }
    }
    
    

    while ((match = functionRegex.exec(code)) !== null) {
        if(extension == "js")
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
        }
        
        
    }
    // Find import statements
    while ((match = importRegex.exec(code)) !== null) {
        if(extension == "js")
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
            const importType = match[1]; // 'import' or 'from'
            const modulePath = match[2]; // the module being imported
        
            // If it's a 'from' import, we need to handle the imported functions or classes
            let importedNames = [];
            if (importType === 'from') {
                const specificImports = match[3]; // e.g., 'get_weathers, process_data'
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
                importedNames = [modulePath.trim()];
            }
        
            // You may want to adjust how you set the imports based on your existing logic
            // Assuming you want to store the module name as the key and the imported names as values
            imports.set(modulePath, importedNames);
        }
    }

    functions.forEach((params, functionName) => {
        // Create a regex pattern for the function name to find its calls
        const regex = new RegExp(`(?<!\\w)(${functionName})\\s*\\((.*?)\\)`, 'g');
        const calls = [];
        let match;

        // Search for function calls using the regex
        while ((match = regex.exec(code)) !== null) {
            const args = match[2] ? match[2].split(',').map(arg => arg.trim()) : []; // Get arguments
            calls.push(args); // Store the arguments for the call
        }

        // Store the calls in the results object
        if (calls.length > 0) {
            functionCalls.set(functionName, calls)
        }
    });

    imports.forEach((params, functionName) => {
        
        if(functionName == undefined)
        {
            return;
        } 
        if(extension == "js")
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
            
        }
        

    });

    extractedData.set(fileName, {
        name: fileName,
        variables: variables,
        functions: functions,
        imports: imports,
        functionCalls: functionCalls, 
        apiLocations: apiLocations
    })

    return extractedData;
}

module.exports = {extractElements };