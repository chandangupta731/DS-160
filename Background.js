// background.js

const API_GET_FORM_DATA_ENDPOINT = "http://localhost:5000/api/getFormData";
const STORED_USER_ID_KEY = 'form_filler_user_id';

// IMPORTANT: Define the URLs where you want auto-filling to occur.
// Be specific to avoid trying to fill on every page.
// Example: const TARGET_URL_PATTERNS = ["https://ceac.state.gov/GenNIV/Default.aspx"];
// For more flexible matching, you can use parts of URLs or regular expressions.
// For now, let's use a simple check for the host_permission you have.
const TARGET_HOSTS = ["ceac.state.gov"]; // Add other hosts if needed

function isTargetPage(url) {
    if (!url) return false;
    try {
        const currentUrl = new URL(url);
        return TARGET_HOSTS.some(host => currentUrl.hostname.includes(host));
    } catch (e) {
        console.error("Error parsing URL in background.js:", url, e);
        return false;
    }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Ensure the page is fully loaded and it's a target page
    if (changeInfo.status === 'complete' && tab.url && isTargetPage(tab.url)) {
        console.log(`Target page loaded: ${tab.url}`);

        try {
            // 1. Get stored user ID
            const result = await chrome.storage.local.get([STORED_USER_ID_KEY]);
            const storedUserId = result[STORED_USER_ID_KEY];

            if (storedUserId) {
                console.log(`Background: Found stored user ID: ${storedUserId}. Attempting auto-fill.`);
                
                // 2. Fetch form data from API
                const apiUrl = `${API_GET_FORM_DATA_ENDPOINT}?id=${encodeURIComponent(storedUserId)}`;
                console.log(`Background: Fetching form data from: ${apiUrl}`);
                
                const response = await fetch(apiUrl);

                if (!response.ok) {
                    let errorMsg = `Background: Error fetching data: ${response.status} ${response.statusText}`;
                    try {
                        const errorData = await response.json();
                        errorMsg = `Background: Error: ${errorData.message || errorMsg}`;
                    } catch (jsonError) { /* Ignore if error response is not JSON */ }
                    console.error(errorMsg);
                    return; // Stop if data fetch fails
                }

                const data = await response.json();
                if (!data || Object.keys(data).length === 0) {
                    console.warn(`Background: No form data found for ID: ${storedUserId}`);
                    return; // Stop if no data
                }

                console.log("Background: Data received from API, sending to content script on tab:", tabId, data);

                // 3. Send data to content script
                chrome.tabs.sendMessage(
                    tabId,
                    { action: "fillForm", data: data },
                    (responseFromContentScript) => {
                        if (chrome.runtime.lastError) {
                            console.error(`Background: Error sending message to content script on tab ${tabId}:`, chrome.runtime.lastError.message);
                        } else {
                            console.log(`Background: Message sent to content script. Response:`, responseFromContentScript);
                        }
                    }
                );

            } else {
                console.log("Background: No user ID stored. Auto-fill skipped for this page load.");
            }
        } catch (error) {
            console.error("Background: Error during auto-fill process:", error);
        }
    }
});

console.log("Form Filler Background Script Initialized.");
