const axios = require('axios');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const xlsx = require('xlsx');


async function fetchApiResults(fullURLS, extractedData, extension) {
    const results = new Map();
    const processedKeys = new Set();
    for (const [originalUrl, finalUrl] of fullURLS) {
        for (let i = 0; i < extractedData.length; i++) {
            for (const [fileName, fileData] of extractedData[i]) {
                for (const [varKey, varValue] of fileData.variables) {
                    if (processedKeys.has(varKey) || results.has(originalUrl)) {
                        continue; // Skip if URL is already in the results map
                    }
                    const newURL = originalUrl.match(/https?:\/\//i);
                    let url = originalUrl;
                    if(newURL)
                    {
                        url = originalUrl.substring(newURL.index)
                    } 
                    let matchFound = false;
                    if(varValue ==  url)
                    {
                        matchFound = true;
                    } else if (varValue.includes(url))
                    {
                        matchFound = true;
                    }
                    if (matchFound) {                      
                        let requestType = '';
                        for (const [typeKey, typeValue] of fileData.type) {
                            if (typeKey === varKey) {
                                requestType = typeValue;
                                break;
                            }
                        }

                        let callValue = undefined;
                        for (const [callKey, callValueCandidate] of fileData.calls) {
                            if (callKey === varKey) {
                                callValue = callValueCandidate;
                                break;
                            }
                        } 
                        let optionsParam = undefined;
                        let header = undefined;
                        let field = undefined;
                        if(extension === "js" || extension == "tsx")
                        {
                            if(callValue != undefined)
                            {
                                optionsParam = callValue.split(",")[1];
                                if(fileData.variables.has(optionsParam))
                                {
                                    if(requestType == '')
                                    {
                                        let optionValue = fileData.variables.get(optionsParam).trim();
                                        let methodType = optionValue.match(/method:\s*["']([^"']+)["']/);
                                        requestType = methodType ? methodType[1] : null;
                                    }
                                } else 
                                {
                                    optionsParam = callValue
                                }
                            }

                            // const fetchMatch = /fetch\(([^,]+)(?:,([^)]*))?\)/.exec(callValue);
                            // if (fetchMatch) {
                            //     optionsParam = fetchMatch[2]?.trim();
                            // } else
                            // {
                            //     header = callValue
                            // }

                        } else if(extension === "py")
                        {
                            const pattern = /,(.*)/s;
                            const fetchMatch = pattern.exec(callValue);
                            if (fetchMatch) {
                                optionsParam = fetchMatch[1]?.trim();
                            }
                        } else if (extension == "php")
                        {
                            if(fileData.variables.has("CURLOPT_HTTPHEADER"))
                            {
                                let headers = fileData.variables.get("CURLOPT_HTTPHEADER").trim();
                                let contentType =  fileData.variables.get(headers);
                                let header1 = contentType.replace(/array\(\s*|\s*\);/g, '').trim();
                                let inputString = header1.replace(/\)$/, '').trim();
                                let cleanString = inputString.replace(/\\\"/g, '').replace(/\r?\n|\r/g, ''); // Clean quotes and newlines
                                let keyValuePairs = cleanString.split(',');

                                // Step 2: Convert to a JSON object
                                header = keyValuePairs.reduce((acc, pair) => {
                                    let [key, value] = pair.split(':').map(item => item.trim().replace(/"/g, ''));  // Remove extra spaces and quotes
                                    acc[key] = value;  // Add to object
                                    return acc;
                                }, {});
                                // let header1 = cleanStr.split(/\s*,\s*/);
                                // header = header1.find(contentType => contentType.includes("Content-Type"));

                                let fields = fileData.variables.get("CURLOPT_POSTFIELDS").trim();
                                let cleanFields = fileData.variables.get(fields)
                                field = cleanFields.replace("<<<DATA", '').replace("\r\nDATA", '').trim();
                            }
                        }
                        

                        // Step 3: Look up values of urlParam and optionsParam in variables
                        const urlVariable =  finalUrl;
                        let optionsVariable = fileData.variables.has(optionsParam) ? fileData.variables.get(optionsParam) : optionsParam;

                        let transformedOptionsString = undefined;
                        try {
                            if (optionsVariable.endsWith(")")) {
                                optionsVariable = optionsVariable.slice(0, -1);
                            }
                            // Check if the string is valid JSON
                            transformedOptionsString = JSON.parse(optionsVariable);
                        } catch (error) {
                            // If parsing fails, treat it as a non-JSON value
                            console.warn("Invalid JSON string, not parsing:", optionsVariable);
                        }
                        if(transformedOptionsString == undefined)
                        {
                            if(optionsVariable != undefined)
                            {
                                if (optionsVariable.includes('json=') || optionsVariable.includes('data=')) {
                                    // Match json= or data= followed by a block of JSON-like data
                                    const match = optionsVariable.match(/(json=|data=)(\{[\s\S]*?\})/);
                                    if (match) {
                                        const jsonContent = JSON.parse(match[2]); // The JSON content
                                        transformedOptionsString = {
                                            method: requestType,  // HTTP method
                                            headers: {
                                              "Content-Type": "application/json"  // Set the content type to JSON
                                            },
                                            body: JSON.stringify(jsonContent)  // Stringify the data to be sent in the body
                                          };
                                    }
                                } else 
                                {
                                    let result = optionsVariable
                                    .replace(/(\r\n|\r|\n)/g, '')              // Remove any line breaks for easier parsing
                                    .replace(/([{,]\s*)(\w+):/g, '$1"$2":')    // Add double quotes around the keys to make it valid JSON
                                    .replace(/JSON\.stringify\((.*?)\)/g, (match, p1) => {
                                        const dataVariable = fileData.variables.get(p1.trim());
                                        return JSON.stringify(dataVariable); // Replace with actual data object as JSON
                                    });
    
                                    transformedOptionsString = JSON.parse(result);
                                }
                            } else if (header != undefined && field != undefined)
                            {
                                transformedOptionsString = {
                                    method: requestType,  // HTTP method
                                    headers: header,  // Set the content type to JSON
                                    body: field // Stringify the data to be sent in the body
                                };
                            } else if (header != undefined)
                            {
                                transformedOptionsString = {
                                    method: requestType,  // HTTP method
                                    headers: header
                                    //body: JSON.stringify({})  // Stringify the data to be sent in the body
                                  };
                            } else 
                            {
                                transformedOptionsString = {
                                    method: requestType,  // HTTP method
                                    headers: {
                                      "Content-Type": "application/json"  // Set the content type to JSON
                                    },
                                    body: JSON.stringify({})  // Stringify the data to be sent in the body
                                  };
                            }
                        }
                        
                        

                        // Clean up the URL value for the request
                        const cleanUrl = urlVariable.replace(/^f|^'|'$|^`|`$|^"|"$|^'/g, '').trim();
                        const result = cleanUrl.replace(/^['"`]*/, '').replace(/['"`]*$/, '').trim();
                        const encodedUrl = encodeURI(result);
                        // Create a new URL object from the encoded URL
                        const url = new URL(encodedUrl);
                        const baseURL = url.origin;
                        const path = url.pathname + url.search;

                        if(requestType == '')
                        {
                            requestType = "GET";
                        }
                        try {
                            let response = '';
                            const results_test = new Map();

                            // Perform GET or POST based on the request type
                            if (requestType === "GET") {
                                let response1;
                                try {
                                    response1 = await request(baseURL)['get'](path)
                                    .set(transformedOptionsString.headers)
                                    results_test.set(`${requestType}_${encodedUrl}`, { status:`${response1.status}`, message: `${response1.message || response1.body.message}`});
                                } catch (error) {
                                    results_test.set(`${requestType}_${encodedUrl}`, { status:`${response1.status}`, message: `${error.message}`});
                                }

                                response = results_test;
                            } else if (requestType === "POST" || requestType === "PUT" || requestType === "DELETE") {
                                //response = await fetch(encodedUrl, transformedOptionsString);
                                // this method affected database, what we can do is ask user if they would like to test with or without databaase
                                // with we keep the current method
                                let response1;
                                try {
                                    response1 = await request(baseURL)[transformedOptionsString.method.toLowerCase()](path)
                                    .set(transformedOptionsString.headers)
                                    .send(transformedOptionsString.body);
                                    results_test.set(`${requestType}_${encodedUrl}`, { status:`${response1.status}`, message: `${response1.message || response1.body.message}`});
                                } catch (error) {
                                    results_test.set(`${requestType}_${encodedUrl}`, { status:`${response1.status}`, message: `${error.message}`});
                                }

                                response = results_test;
                            }

                            if (response) {
                                let data;
                                //data = await response.json();
                                data =  response.get(`${requestType}_${encodedUrl}`)
                                const markdownString = new vscode.MarkdownString();
                                markdownString.supportHtml = true;
                                markdownString.appendMarkdown(`**API Response Details for**: ${encodedUrl}\n\n`);
                                

                                if ((parseInt(data.status) >= 200 && parseInt(data.status) < 300) || data.status === "success" || data.success == "true") {
                                    markdownString.appendMarkdown(`**Status**: <span style="color:var(--vscode-charts-green);">Success/200</span>\n\n`);
                                    results.set(originalUrl, {
                                        markdown: markdownString,
                                        url : encodedUrl,
                                        location: fileData.filePath,
                                        status : data.status,
                                        message: data.message,
                                    });
                                } else {
                                    const GoogleResults = await searchGoogle(baseURL + " " + data.message);
                                    const GoogleResults_OfficialDocumentation = await searchGoogle("Search for Official API Documentation for " + baseURL);
                                    
                                    markdownString.appendMarkdown(`**Status**: <span style="color:var(--vscode-charts-red);">${data.status}</span>\n\n`);
                                    markdownString.appendMarkdown(`**API Name**: ${baseURL}\n\n`);
                                    markdownString.appendMarkdown(`**Official API Link**: [Link](${GoogleResults_OfficialDocumentation[0].link})\n\n`);
                                    markdownString.appendMarkdown(`**Message**: ${data.message}\n\n`);
                                    markdownString.appendMarkdown(`**Recommended Fix (from ${GoogleResults[0].displayLink})**:\n\n`);
                                    markdownString.appendMarkdown(`**Title**: ${GoogleResults[0].title}\n\n`);
                                    markdownString.appendMarkdown(`**Link**: [${GoogleResults[0].link}](${GoogleResults[0].link})\n\n`);
                                    results.set(originalUrl, {
                                        markdown: markdownString,
                                        url : encodedUrl,
                                        location: fileData.filePath,
                                        status : data.status,
                                        message: data.message,
                                    }
                                    );
                                }
                                processedKeys.add(varKey);
                            }
                        } catch (error) {
                            console.error("Fetch error:", error.message);
                            results.set(originalUrl, encodedUrl + ": " + error.message);
                        }
                    }
                }
            }
        }
    }

    return results;
}



async function searchGoogle(query) {
    const apiKey = 'AIzaSyD58BpSABrGS3CxTTvi_swiBPVN41A5zS8'; // Replace with your Google API key
    const searchEngineId = 'b4f6477f271ff4970'; // Replace with your Custom Search Engine ID
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const results = data.items;
        // Return relevant results
        if (results && results.length > 0) {
            return results.map(item => ({
                displayLink: item.displayLink,
                title: item.title,
                link: item.link,
                snippet: item.snippet,
            }));
        } else {
            return 'No results found.';
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return 'An error occurred while fetching data.';
    }
}


async function generateReport(location, similarTexts, allResults) {

    let templateReport;
    try {
        templateReport = xlsx.readFile(path.join(__dirname, "\\template\\api_status_report.xlsx"));
    } catch (error) {
        console.error("error", error);
    }
    
    const wb = xlsx.utils.book_new();
    let summaryWS = templateReport.Sheets['Summary'];
    xlsx.utils.sheet_add_aoa(summaryWS, [[allResults.length]], { origin: "B3" });
    let success = 0, failed = 0, undefined = 0;
    let successData = [["url", "location", "message", "status"]], failedData = [["url", "location", "message", "status"]], undefinedData = [["url", "location", "message", "status"]], allData = [["url", "location", "message", "status"]];
    
    for(var i = 0; i < similarTexts.length; i++)
    {
        if(similarTexts[i] == "Positive") 
        {
            success += 1
            const { url, location, message, status} = allResults[i][1];
            successData.push([url, location, message, status])
        }
        else if(similarTexts[i] == "Neutral") 
        {
            undefined += 1
            const { url, location, message, status} = allResults[i][1];
            undefinedData.push([url, location, message, status])
        }
        else if(similarTexts[i] == "Negative") 
        {
            failed += 1
            const { url, location, message, status} = allResults[i][1];
            failedData.push([url, location, message, status])
        }
        const { url, location, message, status} = allResults[i][1];
        allData.push([url, location, message, status])

    }

    xlsx.utils.sheet_add_aoa(summaryWS, [[success]], { origin: "B4" });
    xlsx.utils.sheet_add_aoa(summaryWS, [[failed]], { origin: "B5" });
    xlsx.utils.sheet_add_aoa(summaryWS, [[undefined]], { origin: "B6" });

    // var ws_success = "Successful"
    // var ws_failed = "Failed"
    // var ws_undefined = "Undefined"
    
    xlsx.utils.book_append_sheet(wb, summaryWS, 'Summary');
    const ws_all = xlsx.utils.aoa_to_sheet(allData);
    ws_all['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' }};
    xlsx.utils.book_append_sheet(wb, ws_all, 'All');
    const ws_success = xlsx.utils.aoa_to_sheet(successData);
    ws_success['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' }};
    xlsx.utils.book_append_sheet(wb, ws_success, 'Success');
    const ws_failed = xlsx.utils.aoa_to_sheet(failedData);
    ws_failed['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' }};
    xlsx.utils.book_append_sheet(wb, ws_failed, 'Failed');
    const ws_undefined = xlsx.utils.aoa_to_sheet(undefinedData);
    ws_undefined['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' }};
    xlsx.utils.book_append_sheet(wb, ws_undefined, 'Undefined');

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = String(now.getFullYear()).slice(-2); // Last two digits of the year
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${day}${month}${year}${hours}${minutes}${seconds}`;

    if (!fs.existsSync(path.join(location, 'reports'))) {
        fs.mkdirSync(path.join(location, 'reports'), { recursive: true });
    }
    
    try
    {
        xlsx.writeFile(wb,path.join(location, 'reports', `api_status_report_${timestamp}.xlsx`));
    } catch (error)
    {
        console.error(error);
    }
}


module.exports = { fetchApiResults, generateReport };