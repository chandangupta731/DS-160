// Get references to the UI elements
const userSearchInput = document.getElementById('userSearchInput');
const userSelect = document.getElementById('userSelect');
const fillButton = document.getElementById('fillButton');
const statusDiv = document.getElementById('status');

// --- Configuration ---
const API_GET_USERS_ENDPOINT = "http://localhost:5000/api/getUsers";
const API_GET_FORM_DATA_ENDPOINT = "http://localhost:5000/api/getFormData";

// --- Chrome Storage Keys ---
const STORED_USER_ID_KEY = 'form_filler_user_id';
const STORED_USER_DISPLAY_NAME_KEY = 'form_filler_user_display_name';

// --- Helper function to update the status message ---
function setStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = type;
}

// --- Function to fetch users and populate dropdown ---
async function populateUserDropdown() {
    setStatus('Loading users...', 'info');
    fillButton.disabled = true;
    userSelect.disabled = true;
    userSearchInput.disabled = true;
    userSelect.innerHTML = '<option value="">Loading...</option>';

    try {
        const response = await fetch(API_GET_USERS_ENDPOINT);
        if (!response.ok) {
            let errorMsg = `Error fetching users: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = `Error: ${errorData.error || errorData.message || errorMsg}`;
            } catch (jsonError) { /* Ignore if error response is not JSON */ }
            throw new Error(errorMsg);
        }

        const users = await response.json();
        userSelect.innerHTML = ''; // Clear "Loading..."

        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "-- Select a User --";
        userSelect.appendChild(defaultOption);

        if (users && users.length > 0) {
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.display_name;
                option.dataset.originalText = user.display_name; // For search
                userSelect.appendChild(option);
            });
            userSelect.disabled = false;
            userSearchInput.disabled = false;
        } else {
            setStatus('No users found in the database.', 'info');
            // Keep select and search disabled
        }
    } catch (error) {
        console.error("Error fetching or populating users:", error);
        setStatus(`Error loading users: ${error.message}`, 'error');
        userSelect.innerHTML = '<option value="">Error loading</option>';
        // Keep select and search disabled
    }
}

// --- Function to filter user dropdown ---
function filterUserDropdown() {
    const searchTerm = userSearchInput.value.toLowerCase();
    const options = userSelect.options;
    const currentSelectedValue = userSelect.value;
    let isCurrentSelectionStillVisible = false;

    for (let i = 0; i < options.length; i++) {
        const optionElement = options[i];
        if (optionElement.value === "") { // Default option
            optionElement.style.display = "";
            if (currentSelectedValue === "") isCurrentSelectionStillVisible = true;
            continue;
        }
        const textToSearch = optionElement.dataset.originalText || optionElement.textContent;
        const originalTextLower = textToSearch.toLowerCase();
        const isMatch = originalTextLower.includes(searchTerm);
        optionElement.style.display = isMatch ? "" : "none";
        if (isMatch && optionElement.value === currentSelectedValue) {
            isCurrentSelectionStillVisible = true;
        }
    }

    // Update UI based on selection and visibility
    if (currentSelectedValue && isCurrentSelectionStillVisible) {
        fillButton.disabled = false;
        const selectedOptionText = userSelect.options[userSelect.selectedIndex]?.textContent;
        // Avoid overwriting error/success messages or "Auto-initiating" messages
        if (selectedOptionText && !['success', 'error'].includes(statusDiv.className) && !statusDiv.textContent.includes("Auto-initiating fill...")) {
             setStatus(`User '${selectedOptionText}' selected. Ready to fill.`, 'info');
        }
    } else if (currentSelectedValue && !isCurrentSelectionStillVisible) {
        fillButton.disabled = true;
        setStatus('Selected user is hidden by filter. Clear search or pick another.', 'info');
    } else { // No user selected or default selected
        fillButton.disabled = true;
        // Avoid overwriting critical initial messages
        if (statusDiv.className !== 'error' && !statusDiv.textContent.includes("Loading users...") && !statusDiv.textContent.includes("No users found")) {
            setStatus('Please select a user.', 'info');
        }
    }
}

// --- Function to load stored user and apply selection (NO AUTO-FILL from popup) ---
async function loadAndApplyStoredUser() {
    try {
        const result = await chrome.storage.local.get([STORED_USER_ID_KEY, STORED_USER_DISPLAY_NAME_KEY]);
        const storedUserId = result[STORED_USER_ID_KEY];
        const storedUserDisplayName = result[STORED_USER_DISPLAY_NAME_KEY];

        // Do not proceed if user loading itself failed
        if (userSelect.disabled && userSelect.options.length > 0 && userSelect.options[0].textContent === "Error loading") {
            return;
        }
        
        if (storedUserId && userSelect.options.length > 1) { // Ensure dropdown is populated (more than just default or error)
            let userExistsInDropdown = false;
            for (let i = 0; i < userSelect.options.length; i++) {
                if (userSelect.options[i].value === storedUserId) {
                    userSelect.value = storedUserId; // Pre-select
                    userExistsInDropdown = true;
                    break;
                }
            }

            if (userExistsInDropdown) {
                // Inform the user which user is currently set for background auto-fills
                setStatus(`Current auto-fill user: ${storedUserDisplayName || 'User'}. Select to change, or click Fill for current page.`, 'info');
                fillButton.disabled = false; // Enable fill button as a user is selected
            } else {
                // Stored user ID not found (e.g., deleted from backend)
                setStatus('Previously stored user not found. Please select a user for auto-fill.', 'info');
                await chrome.storage.local.remove([STORED_USER_ID_KEY, STORED_USER_DISPLAY_NAME_KEY]);
                fillButton.disabled = true;
                userSelect.value = ""; // Reset to default
            }
        } else if (!userSelect.disabled) { // Dropdown is usable, but no stored user
            setStatus('Please select a user to enable auto-fill on page loads.', 'info');
            fillButton.disabled = true;
        }
        // If userSelect is disabled due to "No users found", status is already set.
    } catch (error) {
        console.error('Error loading stored user:', error);
        setStatus('Error accessing stored settings.', 'error');
        fillButton.disabled = true;
    }
}

// --- Event Listener for Search Input ---
userSearchInput.addEventListener('input', filterUserDropdown);

// --- Event Listener for User Selection Change (Stores user for background auto-fill) ---
userSelect.addEventListener('change', async () => {
    if (userSelect.value) { // A user is selected (not the default "-- Select a User --")
        const selectedOption = userSelect.options[userSelect.selectedIndex];
        const userDataToStore = {
            [STORED_USER_ID_KEY]: userSelect.value,
            [STORED_USER_DISPLAY_NAME_KEY]: selectedOption.textContent
        };
        try {
            await chrome.storage.local.set(userDataToStore);
            setStatus(`User '${selectedOption.textContent}' selected for auto-fill.`, 'info');
            fillButton.disabled = false;
        } catch (error) {
            console.error('Error saving user selection:', error);
            setStatus('Could not save user selection for auto-fill.', 'error');
            fillButton.disabled = false; // Still enable, but show error
        }
    } else { // "-- Select a User --" is chosen
        fillButton.disabled = true;
        try {
            await chrome.storage.local.remove([STORED_USER_ID_KEY, STORED_USER_DISPLAY_NAME_KEY]);
            setStatus('Auto-fill user cleared. Select a user to enable.', 'info');
        } catch (error) {
            console.error('Error clearing stored user selection:', error);
            setStatus('Could not clear stored selection.', 'error');
        }
    }
});

// --- Event Listener for the Fill Button Click (Manual Fill for current page) ---
fillButton.addEventListener('click', async () => {
    const selectedUserId = userSelect.value;

    if (!selectedUserId) {
        setStatus('Please select a user first.', 'error');
        return;
    }

    setStatus(`Fetching data for user ID: ${selectedUserId}...`, 'info');
    fillButton.disabled = true;
    userSelect.disabled = true;
    userSearchInput.disabled = true;

    try {
        const apiUrl = `${API_GET_FORM_DATA_ENDPOINT}?id=${encodeURIComponent(selectedUserId)}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            let errorMsg = `Error fetching data: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = `Error: ${errorData.message || errorMsg}`;
            } catch (jsonError) { /* Ignore */ }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        if (!data || Object.keys(data).length === 0) {
            throw new Error(`No form data found for ID: ${selectedUserId}`);
        }

        setStatus('Data received. Sending to page...', 'info');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab?.id) {
            chrome.tabs.sendMessage(
                tab.id,
                { action: "fillForm", data: data },
                (responseFromContentScript) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending message:", chrome.runtime.lastError.message);
                        setStatus(`Error: Could not connect to the page. Ensure it's the correct form page and reload.`, 'error');
                    } else if (responseFromContentScript?.status === "Filling complete.") {
                        setStatus('Form filled successfully!', 'success');
                    } else if (responseFromContentScript?.status?.startsWith("Error:")) {
                        setStatus(responseFromContentScript.status, 'error');
                    } else {
                        // If no specific status, assume command was sent.
                        setStatus('Form fill command sent. Check the page.', 'info');
                    }
                    // Re-enable controls after the entire operation
                    fillButton.disabled = !userSelect.value; // Only enable if a user is still selected
                    userSelect.disabled = false;
                    userSearchInput.disabled = userSelect.disabled; // Sync search input with select state
                }
            );
        } else {
            throw new Error('Could not find active tab.'); // This error will be caught by the outer catch
        }
    } catch (error) {
        console.error("Error during fill process:", error);
        setStatus(`Error: ${error.message}`, 'error');
        // Ensure UI is re-enabled on error
        fillButton.disabled = !userSelect.value;
        userSelect.disabled = false;
        userSearchInput.disabled = userSelect.disabled;
    }
});

// --- Initialize popup: Load users and then apply stored selection ---
document.addEventListener('DOMContentLoaded', async () => {
    await populateUserDropdown(); // Wait for users to load

    // Proceed to load stored user only if user loading didn't fail critically
    // and there are users to select from (or a default option).
    const userSelectIsErrorState = userSelect.options.length > 0 && 
                                   (userSelect.options[0].textContent === "Error loading" || 
                                    userSelect.options[0].textContent === "Loading...");
    
    if (!userSelect.disabled || !userSelectIsErrorState) {
         await loadAndApplyStoredUser(); // Just load and apply, NO auto-click from popup
    }
    // If populateUserDropdown resulted in "No users found", status is already set,
    // and select/search/fillButton will be appropriately disabled.
});
