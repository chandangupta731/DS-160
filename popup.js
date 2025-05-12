// Get references to the UI elements
const userSelect = document.getElementById('userSelect'); // Changed from recordIdInput
const fillButton = document.getElementById('fillButton');
const statusDiv = document.getElementById('status');

// --- Configuration ---
// *** IMPORTANT: Replace these with the actual URLs of YOUR backend API endpoints ***
const API_GET_USERS_ENDPOINT = "http://localhost:5000/api/getUsers"; // New endpoint
const API_GET_FORM_DATA_ENDPOINT = "http://localhost:5000/api/getFormData"; // Existing endpoint

// --- Helper function to update the status message ---
function setStatus(message, type = 'info') { // type can be 'info', 'success', 'error'
    statusDiv.textContent = message;
    statusDiv.className = type; // Set class for styling
}

// --- Function to fetch users and populate dropdown ---
async function populateUserDropdown() {
    setStatus('Loading users...', 'info');
    fillButton.disabled = true; // Disable button while loading
    userSelect.disabled = true;

    try {
        console.log(`Fetching users from: ${API_GET_USERS_ENDPOINT}`);
        const response = await fetch(API_GET_USERS_ENDPOINT);

        if (!response.ok) {
            let errorMsg = `Error fetching users: ${response.status} ${response.statusText}`;
             try {
                const errorData = await response.json();
                errorMsg = `Error: ${errorData.error || errorMsg}`;
            } catch (jsonError) { /* Ignore */ }
            throw new Error(errorMsg);
        }

        const users = await response.json();
        console.log("Users received:", users);

        // Clear existing options (like "Loading...")
        userSelect.innerHTML = '';

        // Add a default "Select" option
        const defaultOption = document.createElement('option');
        defaultOption.value = ""; // Empty value for the default option
        defaultOption.textContent = "-- Select a User --";
        userSelect.appendChild(defaultOption);

        // Populate with fetched users
        if (users && users.length > 0) {
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id; // The user's _id string
                option.textContent = user.display_name; // e.g., "Name (DOB)"
                userSelect.appendChild(option);
            });
            setStatus('Please select a user.', 'info');
            userSelect.disabled = false; // Enable dropdown
        } else {
            setStatus('No users found in the database.', 'info');
            // Keep dropdown disabled if no users
        }

    } catch (error) {
        console.error("Error fetching or populating users:", error);
        setStatus(`Error loading users: ${error.message}`, 'error');
        // Keep dropdown disabled on error
        userSelect.innerHTML = '<option value="">Error loading</option>';
    }
}

// --- Enable/Disable Fill Button based on selection ---
userSelect.addEventListener('change', () => {
    if (userSelect.value) { // If a user is selected (value is not empty)
        fillButton.disabled = false;
        setStatus('Ready to fill form.', 'info'); // Clear previous status
    } else {
        fillButton.disabled = true;
        setStatus('Please select a user.', 'info');
    }
});


// --- Event Listener for the Fill Button ---
fillButton.addEventListener('click', async () => {
    const selectedUserId = userSelect.value; // Get selected user ID from dropdown

    if (!selectedUserId) {
        setStatus('Please select a user first.', 'error');
        return;
    }

    setStatus(`Fetching data for user ID: ${selectedUserId}...`, 'info');
    fillButton.disabled = true; // Disable button during fetch
    userSelect.disabled = true; // Disable dropdown during fetch

    try {
        // Construct the full API URL with the query parameter
        const apiUrl = `${API_GET_FORM_DATA_ENDPOINT}?id=${encodeURIComponent(selectedUserId)}`;
        console.log(`Fetching form data from: ${apiUrl}`);

        // Fetch data from your backend API
        const response = await fetch(apiUrl);

        // Check if the request was successful
        if (!response.ok) {
            let errorMsg = `Error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = `Error: ${errorData.message || errorMsg}`;
            } catch (jsonError) { /* Ignore */ }
            throw new Error(errorMsg);
        }

        // Parse the JSON response from the API
        const data = await response.json();

        // Check if data was actually returned
        if (!data || Object.keys(data).length === 0) {
             throw new Error(`No form data found for ID: ${selectedUserId}`);
        }

        setStatus('Data received. Filling form...', 'info');
        console.log("Data received from API:", data);

        // Find the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab?.id) {
            // Send the fetched data to the content script in the active tab
            chrome.tabs.sendMessage(
                tab.id,
                { action: "fillForm", data: data }, // Message payload
                (response) => { // Optional: Callback to handle response from content script
                    if (chrome.runtime.lastError) {
                        console.error("Error sending message:", chrome.runtime.lastError.message);
                        setStatus(`Error: Could not connect to the page. Ensure it's the correct form page and reload.`, 'error');
                    } else if (response?.status === "success") {
                        setStatus('Form filled successfully!', 'success');
                    } else if (response?.status === "error") {
                         setStatus(`Error filling form: ${response.message || 'Unknown error'}`, 'error');
                    } else {
                        console.warn("No response or unexpected response from content script:", response);
                        // Assume success if no error, but maybe add a note
                        // setStatus('Form fill command sent.', 'info');
                    }
                     // Re-enable controls after attempt (success or failure)
                    fillButton.disabled = !userSelect.value; // Disable if default option is selected
                    userSelect.disabled = false;
                }
            );
        } else {
            setStatus('Error: Could not find active tab.', 'error');
             // Re-enable controls on error
            fillButton.disabled = !userSelect.value;
            userSelect.disabled = false;
        }

    } catch (error) {
        console.error("Error fetching or processing form data:", error);
        setStatus(`Error: ${error.message}`, 'error');
         // Re-enable controls on error
        fillButton.disabled = !userSelect.value;
        userSelect.disabled = false;
    }
});

// --- Load users when the popup opens ---
document.addEventListener('DOMContentLoaded', populateUserDropdown);

