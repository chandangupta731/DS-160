# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify
import os
import json
import re

# --- Docx Handling ---
try:
    import docx # Needed for Word processing
except ImportError:
    print("! ERROR: python-docx library not found. Install using: pip install python-docx")
    docx = None

# --- Image Processing Dependencies (Optional, checked before use) ---
try:
    from paddleocr import PaddleOCR
except ImportError:
    print("! WARNING: paddleocr or paddlepaddle not found. Image processing will fail.")
    PaddleOCR = None

# --- Gemini Dependency (Optional, checked before use) ---
try:
    import google.generativeai as genai
except ImportError:
     print("! WARNING: google-generativeai not found. Gemini analysis will fail.")
     genai = None

import traceback
from werkzeug.utils import secure_filename
from pymongo import MongoClient, ReturnDocument
import pymongo.errors
from datetime import datetime
from bson import ObjectId
from flask_cors import CORS

app = Flask(__name__)

# --- Configuration ---
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'docx'}
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyA6-YdUVWyqV9uqEFApTS8q0lysHL9qV1s") # Needed for image analysis
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.5.0")
MONGO_DB_NAME = "id_docs_db"
MONGO_USERS_COLLECTION_NAME = "users"
MONGO_DOCUMENTS_COLLECTION_NAME = "documents"
GEMINI_MODEL_NAME = 'gemini-1.5-pro-latest' # Needed for image analysis
PASSPORT_REDACTION_PLACEHOLDER = "[PASSPORT NUMBER REDACTED]"
AADHAAR_REDACTION_PLACEHOLDER = "[AADHAAR NUMBER REDACTED]"
ID_NUMBER_NOT_FOUND = "NA"
WORD_DOC_TYPE = "word_form" # Special type for Word Q&A data

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Mapping from questions in the Word doc to keys used in the database/API
QUESTION_TO_KEY_MAP = {
    "What is your National ID number (e.g., Aadhaar card)": "national_id",
    "Marital Status": "marital_status",
    "Passport Number": "passport_number",
    "What is your home address?": "home_address",
    "Is your mailing address the same as your home address?": "mailing_address_same_as_home",
    "Primary phone number": "primary_phone",
    "Secondary phone number(if any)": "secondary_phone",
    "Please provide a valid email address for verification.": "email",
    "What is your current employment name?": "current_employer_name",
    "Provide the address of your present employer.": "current_employer_address",
    "Briefly describe your duties and roles in the present company.": "current_employer_duties",
    "Briefly describe your duties and roles in the previous company.": "prevoius_employer_duties",
    "What is the start date of your employment?": "current_employment_start_date",
    "Name of Institution": "institution_name",
    "Full Institution Address": "institution_address",
    "What are your educational qualification details?  Mention the highest qualification": "highest_qualification",
    "Start date of the education institutes": "education_institute_start_date",
    "End date of the education institutes": "education_institute_end_date",
    "What is your intended date of arrival in the U.S.?": "us_arrival_date", # Target field for formatting
    "What is your intended date of departure from the U.S.?": "us_departure_date", # Target field for formatting
    "What are your arrival and departure cities?": "us_arrival_departure_cities",
    "Provide flight details if known (departure and arrival).": "us_flight_details",
    "List the locations you plan to visit in the U.S.": "us_visit_locations",
    "Address where you will stay in the U.S.\n(Full address with pincode)": "us_stay_address",
    "Address where you will stay in the U.S.(Full address with pincode)": "us_stay_address", # Fallback
    "Who is paying for your trip?(Self/other)": "trip_payer",
    "Name of the person paying for the trip, phone number, email ID, relationship with you.": "trip_payer_details", # Will be parsed further
    "Is the address of the person paying for your trip the same as your Home or Mailing Address?": "payer_address_same_as_applicant",
    "Are there other people traveling with you?\n(If yes then provide name and relationship with you.)": "travel_companions",
    "Are there other people traveling with you?(If yes then provide name and relationship with you.)": "travel_companions", # Fallback
    "Have you ever been to the U.S.?(If yes then provide the travel dates and the length of the stay in U.S.)": "previous_us_visits",
    "Have you ever been issued a U.S. Visa?\n(If yes then please provide the visa number)": "previous_us_visa_issued",
    "Have you ever been issued a U.S. Visa?(If yes then please provide the visa number)": "previous_us_visa_issued", # Fallback
    "Have you ever been refused a U.S. visa or admission to the U.S., or withdrawn your application for admission at the port of entry? (Yes/No) If yes then please provide the reason, date and at which embassy it was rejected.": "previous_us_visa_refusal",
    "Has anyone ever filed an immigrant petition on your behalf with the United States Citizenship and Immigration Services? (Yes/No) If yes then please explain.": "immigrant_petition_filed",
    "Contact person or organization in the U.S.": "us_contact_name_or_org",
    "Surnames of the US contact?": "us_contact_surname",
    "Given names of the US contact?": "us_contact_given_name",
    "What is the relationship to you?": "us_contact_relationship",
    "U.S. Street Address (Line 1)": "us_contact_street_address",
    "U.S. City": "us_contact_city",
    "U.S. State": "us_contact_state",
    "U.S. ZIP Code": "us_contact_zip",
    "Provide the phone number and email address of the U.S. point of contact.": "us_contact_phone",
    "Do you have a social media presence? Please list IDs of all accounts.": "social_media_presence",
    "Have you ever lost a passport or had one stolen?(If yes, then provide lost passport number and where it was lost and when)": "lost_stolen_passport_details",
    "What is your Father's  surname?": "father_surname",
    "What is your Father's  given name?": "father_given_name",
    "Father date of birth": "father_dob",
    "Is your father in the U.S.?": "father_in_us",
    "What is your Mother's  surname?": "mother_surname",
    "What is your Mother's given name?": "mother_given_name",
    "Mother date of birth": "mother_dob",
    "Is your mother in the U.S.?": "mother_in_us",
    "Do you have immediate relatives in the U.S. (not including parents)?": "immediate_relatives_in_us",
    "Do you have any other relatives in the U.S.?": "other_relatives_in_us",
    "Spouse Surname": "spouse_surname",
    "Spouse Given Name": "spouse_given_name",
    "Provide your spouse's date of birth": "spouse_dob",
    "What is your spouse's place of birth (city, country)?": "spouse_pob",
    "What is your spouse's address?": "spouse_address",
    "Were you previously employed?": "previous_employment",
    "Were you previously employed?(Yes/No),If yes then provide employer name.": "previous_employer_name", # Fallback
    "Previous employers address and phone number.": "previous_employer_address_phone",
    "Have you attended any educational institutions at a secondary level or above?": "attended_secondary_education_or_above",
    "What was your job title?": "previous_job_title",
    "Provide the supervisors name.": "previous_supervisor_name",
    "Employment start date and end date": "previous_employment_period",
    "Do you belong to a clan or tribe?": "clan_or_tribe",
    "Are you a permanent resident of a country/region other than your country/region of origin (nationality). If yes then provide name of the country or region.": "other_permanent_residency",
    "Do you hold or have you held any nationality other than India? If yes then please mention them.": "other_nationalities",
    "List all languages you speak.": "languages_spoken",
    "Have you travelled to any countries/regions in the last 5 years? List them.": "countries_visited_last_5_years",
    "Have you contributed to any professional, social, or charitable organization?": "organization_contributions",
    "Provide monthly income details.": "monthly_income",

     # --- Detailed Previous Employer 1 ---
    "1.Previous employers name": "prev_emp_1_name",
    "1.Previous employers Phone number": "prev_emp_1_phone",
    "1.Previous employers address": "prev_emp_1_address",
    "1. What was your job title?": "prev_emp_1_job_title", # Added leading "1. " for consistency
    "1. Provide the supervisors name.": "prev_emp_1_supervisor_name", # Added leading "1. "
    "1. Employment start date": "prev_emp_1_start_date",
    "1. Employment end date": "prev_emp_1_end_date",
    "1. Briefly describe your duties and roles in the previous company.": "prev_emp_1_duties",

    # --- Detailed Previous Employer 2 ---
    "2.Previous employers name 2": "prev_emp_2_name", # Assuming "2" is part of the question
    "2.Previous employers phone number": "prev_emp_2_phone",
    "2.Previous employers address": "prev_emp_2_address", # Added leading "2. "
    "2. What was your job title?": "prev_emp_2_job_title", # Added leading "2. "
    "2. Provide the supervisors name.": "prev_emp_2_supervisor_name", # Added leading "2. "
    "2. Employment start date": "prev_emp_2_start_date",
    "2. Employment end date": "prev_emp_2_end_date",
    "2. Briefly describe your duties and roles in the previous company.": "prev_emp_2_duties",


}

# --- MongoDB Setup ---
mongo_client = None
db = None
users_collection = None
documents_collection = None
try:
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    # Increased timeout for potentially slower connections
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    # The ismaster command is cheap and does not require auth.
    mongo_client.admin.command('ismaster')
    print(f"Connected. Using DB: '{MONGO_DB_NAME}'")
    db = mongo_client[MONGO_DB_NAME]
    users_collection = db[MONGO_USERS_COLLECTION_NAME]
    documents_collection = db[MONGO_DOCUMENTS_COLLECTION_NAME]
    print(f"Using collections: '{MONGO_USERS_COLLECTION_NAME}', '{MONGO_DOCUMENTS_COLLECTION_NAME}'")
except pymongo.errors.ConnectionFailure as e:
    print(f"FATAL: MongoDB connection failed: {e}")
    mongo_client = None # Ensure client is None if connection fails
except Exception as e:
    print(f"FATAL: MongoDB setup error: {e}")
    print(traceback.format_exc())
    mongo_client = None # Ensure client is None on other setup errors

# --- Helper Functions ---

def allowed_file(filename):
    """Checks if the file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_full_text_from_word(file_path):
    """Extracts all text content from a .docx file."""
    print(f"Attempting to extract full text from Word file: {file_path}")
    if docx is None:
        print("Error: python-docx library is not available.")
        return None
    full_text_lines = []
    try:
        document = docx.Document(file_path)
        # Extract text from paragraphs
        for paragraph in document.paragraphs:
            full_text_lines.append(paragraph.text)
        # Extract text from tables
        for table in document.tables:
            for row in table.rows:
                for cell in row.cells:
                    full_text_lines.append(cell.text)
        # Join non-empty lines and strip leading/trailing whitespace
        combined_text = "\n".join(filter(None, full_text_lines)).strip()
        print(f"Successfully extracted text. Length: {len(combined_text)}")
        return combined_text
    except Exception as e:
        print(f"Error extracting text from Word file '{file_path}': {e}")
        print(traceback.format_exc())
        return None

def find_passport_no_in_text(text_content):
    """Finds the first Indian passport number pattern in the given text."""
    if not text_content:
        print("Skipping passport number search: No text content provided.")
        return None
    # Pattern: Letter followed by 7 digits, allowing optional space after letter
    pattern = re.compile(r'\b([A-Z]\s?\d{7})\b', re.IGNORECASE)
    # Find all matches and sort by position
    matches = sorted(pattern.finditer(text_content), key=lambda m: m.start())
    if matches:
        # Get the first match, convert to uppercase, remove space
        found_passport_no = matches[0].group(1).upper().replace(" ", "")
        print(f"Found passport number pattern: {found_passport_no}")
        return found_passport_no
    else:
        print("Passport number pattern not found in the text.")
        return None

def extract_text_paddle(image_path, lang='en'):
    """Extracts text from an image file using PaddleOCR."""
    print(f"Attempting OCR on image: {image_path}")
    if PaddleOCR is None:
        print("Error: PaddleOCR library is not available.")
        return None
    if not os.path.exists(image_path):
        print(f"Error: Image file not found at path: {image_path}")
        return None
    try:
        # Initialize PaddleOCR (consider making this a global instance if performance is critical)
        # use_gpu=False is safer for general compatibility
        ocr_engine = PaddleOCR(use_angle_cls=True, lang=lang, use_gpu=False, show_log=False)
        # Perform OCR
        result = ocr_engine.ocr(image_path, cls=True)
        extracted_text = ""
        # Process results: Structure is [[lines]] where each line is [bbox, [text, confidence]]
        if result and result[0]: # Check if result is not empty and has the first list element
             # Safely extract text, checking types and lengths
            texts = [
                line[1][0] for line in result[0]
                if line and isinstance(line, list) and len(line) >= 2 and
                   isinstance(line[1], (tuple, list)) and len(line[1]) >= 2 and line[1][0]
            ]
            extracted_text = "\n".join(texts)

        if not extracted_text:
            print("Warning: OCR process completed but yielded no text.")
            return "" # Return empty string instead of None if OCR runs but finds nothing

        print("OCR extraction successful.")
        return extracted_text.strip()
    except Exception as e:
        print(f"Error during PaddleOCR processing for '{image_path}': {e}")
        print(traceback.format_exc())
        return None # Return None on critical OCR failure

def detect_document_type(text_content):
    """Attempts to detect if the text content is from an Indian Passport or Aadhaar card."""
    if not text_content:
        print("Cannot detect document type: No text content provided.")
        return "unknown"

    print("Detecting document type from text...")
    text_lower = text_content.lower()

    # Keywords for Passport and Aadhaar
    passport_keywords = ["passport", "republic of india", "issuing authority", "surname", "given name"]
    aadhaar_keywords = ["aadhaar", "uidai", "unique identification", "enrollment no", "government of india", "आधार"] # Added Hindi

    # Regular expressions for typical ID patterns
    # Passport MRZ-like pattern (Letter followed by 7 digits, optional space)
    passport_pattern = re.compile(r'\b([A-Z]\s?\d{7})\b', re.IGNORECASE)
    # Aadhaar pattern (12 digits, possibly with spaces)
    aadhaar_pattern = re.search(r'\b\d{4}\s?\d{4}\s?\d{4}\b', text_lower)

    # Scoring based on keywords and patterns
    passport_score = sum(keyword in text_lower for keyword in passport_keywords)
    passport_score += 2 if passport_pattern.search(text_content) else 0 # Use original case text for regex if needed

    aadhaar_score = sum(keyword in text_lower for keyword in aadhaar_keywords)
    aadhaar_score += 2 if aadhaar_pattern else 0

    print(f"Document Type Detection Scores - Passport: {passport_score}, Aadhaar: {aadhaar_score}")

    # Determine type based on scores (require a minimum score to reduce misidentification)
    if passport_score > aadhaar_score and passport_score >= 2:
        print("Detected type: Passport")
        return "passport"
    if aadhaar_score > passport_score and aadhaar_score >= 2:
        print("Detected type: Aadhaar")
        return "aadhaar"

    # Handle cases where scores are equal or low but a strong pattern exists
    if aadhaar_pattern and aadhaar_score >= 1 and passport_score == 0:
         print("Detected type: Aadhaar (based on pattern and keyword)")
         return "aadhaar"
    if passport_pattern.search(text_content) and passport_score >= 1 and aadhaar_score == 0:
         print("Detected type: Passport (based on pattern and keyword)")
         return "passport"

    print("Could not reliably determine document type from text.")
    return "unknown"

def find_and_redact_passport_no(text):
    """Finds the first passport number in text and returns the number and redacted text."""
    print("Attempting to find and redact passport number...")
    pattern = re.compile(r'\b([A-Z]\s?\d{7})\b', re.IGNORECASE)
    found_number = None
    redacted_text = text
    # Find the first match based on position
    matches = sorted(pattern.finditer(text), key=lambda m: m.start())
    if matches:
        match = matches[0]
        found_number = match.group(1).upper().replace(" ", "")
        # Replace only the first occurrence
        redacted_text = text[:match.start()] + PASSPORT_REDACTION_PLACEHOLDER + text[match.end():]
        print(f"Found and redacted passport number: {found_number}")
    else:
        print("Passport number not found for redaction.")
    return found_number, redacted_text

def find_and_redact_aadhaar_no(text):
    """Finds the first valid Aadhaar number in text and returns the number and redacted text."""
    print("Attempting to find and redact Aadhaar number...")
    # Pattern for 12 digits, allowing optional spaces in between groups of 4
    pattern = re.compile(r'\b(\d{4}(?:\s?\d{4}){2})\b')
    found_number = None
    redacted_text = text
    match = pattern.search(text)
    if match:
        # Validate the length after removing spaces
        potential_number = "".join(match.group(1).split())
        if len(potential_number) == 12:
            found_number = potential_number
            # Replace only the first valid occurrence
            redacted_text = text[:match.start()] + AADHAAR_REDACTION_PLACEHOLDER + text[match.end():]
            print(f"Found and redacted Aadhaar number.")
        else:
            # This case should be rare with the refined regex, but good to keep
            print(f"Pattern matched '{match.group(1)}' but length is not 12 after removing spaces.")
    else:
        print("Aadhaar number pattern not found for redaction.")
    return found_number, redacted_text

def analyze_text_with_gemini(text, api_key, model_name, doc_type, placeholder):
    """Uses Google Gemini API to extract structured data from OCR text."""
    print(f"Analyzing text for document type '{doc_type}' using Gemini model '{model_name}'...")
    if genai is None:
        print("Error: google-generativeai library is not available.")
        return None
    if not api_key or api_key == "YOUR_GEMINI_API_KEY":
        print("Error: Gemini API Key is not configured.")
        return None

    try:
        # Configure the Gemini client
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)

        # Define prompts based on document type
        if doc_type == "passport":
            prompt = f"""Analyze the following text extracted from an INDIAN PASSPORT. The passport number has been redacted and replaced with '{placeholder}'.
Extract the following fields: Type, Country Code, Surname, Given Names, Nationality, Sex, Date of Birth, Place of Birth, Place of Issue, Date of Issue, Date of Expiry.
Format the output STRICTLY as a JSON object. Use null or an empty string "" if a field cannot be found. Respond ONLY with the JSON object.

Text:
---
{text}
---
JSON Output:"""
        elif doc_type == "aadhaar":
            prompt = f"""Analyze the following text extracted from an INDIAN AADHAAR CARD. The Aadhaar number has been redacted and replaced with '{placeholder}'.
Extract the following fields: Name, Date of Birth OR Year of Birth (prefer Date of Birth if available), Sex/Gender, Full Address (including Pincode if present), Date of Issue (if available).
Format the output STRICTLY as a JSON object. Use null or an empty string "" if a field cannot be found. Respond ONLY with the JSON object.

Text:
---
{text}
---
JSON Output:"""
        else:
            print(f"Error: Unsupported document type '{doc_type}' for Gemini analysis.")
            return None

        # Send the request to Gemini
        print("Sending request to Gemini API...")
        response = model.generate_content(prompt)

        # Process the response
        if not response.parts:
            print("Gemini Error: The response did not contain any parts.")
            # Log safety feedback if available
            if hasattr(response, 'prompt_feedback'): print(f"Prompt Feedback: {response.prompt_feedback}")
            return None

        print("Gemini analysis successful. Received response.")
        # Assuming the response text is the JSON string
        return response.text

    except Exception as e:
        print(f"Error during Gemini API call or processing: {e}")
        print(traceback.format_exc())
        return None

def compute_unique_identifiers(data, doc_type):
    """Computes a unique combination of name and DOB/YOB for user matching."""
    name, dob_yob = None, None
    print(f"Computing unique identifiers for doc_type: {doc_type}")
    try:
        if not isinstance(data, dict):
            print("Error: Input data is not a dictionary.")
            return None, None

        if doc_type == "passport":
            surname = data.get("Surname", "").strip()
            given_names = data.get("Given Names", "").strip()
            # Combine names, handling cases where one might be missing
            if given_names and surname:
                name = f"{given_names} {surname}".lower()
            elif given_names:
                name = given_names.lower()
            elif surname:
                name = surname.lower() # Less common, but possible
            # Get Date of Birth, checking common key variations
            dob_yob = (data.get("Date of Birth") or data.get("Date_of_Birth", "")).strip()

        elif doc_type == "aadhaar":
            name = data.get("Name", "").strip().lower()
            # Prioritize full Date of Birth over Year of Birth
            dob_raw = data.get("Date of Birth") or data.get("Date_of_Birth") or \
                      data.get("Year of Birth") or data.get("Year_of_Birth")
            # Handle potential nested structures if Gemini returns complex objects (unlikely with prompt)
            if isinstance(dob_raw, dict):
                 dob_raw = dob_raw.get("Date of Birth") or dob_raw.get("Date_of_Birth") or \
                           dob_raw.get("Year of Birth") or dob_raw.get("Year_of_Birth")
            dob_yob = (dob_raw or "").strip()

        if name and dob_yob:
            print(f"Computed identifiers - Name: '{name}', DOB/YOB: '{dob_yob}'")
            return name, dob_yob
        else:
            print(f"Warning: Could not compute sufficient identifiers (Name: '{name}', DOB/YOB: '{dob_yob}')")
            return None, None

    except Exception as e:
        print(f"Error computing unique identifiers: {e}")
        print(traceback.format_exc())
        return None, None

def extract_data_from_word(file_path):
    """Extracts Question-Answer pairs from the first table in a .docx file."""
    print(f"Extracting Q&A data from Word table: {file_path}")
    if docx is None:
        print("Error: python-docx library is not available.")
        return None
    qa_data = {}
    try:
        document = docx.Document(file_path)
        if not document.tables:
            print("Warning: No tables found in the Word document.")
            return {} # Return empty dict if no tables

        print(f"Processing first table out of {len(document.tables)} found.")
        table = document.tables[0]
        is_header_row = True # Assume first row is header
        row_index = 0
        for row in table.rows:
            row_index += 1
            if is_header_row:
                is_header_row = False # Skip the header row
                continue

            # Assuming Question is in the 2nd cell (index 1) and Answer in the 3rd (index 2)
            if len(row.cells) >= 3:
                question = row.cells[1].text.strip()
                answer = row.cells[2].text.strip()
                if question: # Only add if question is not empty
                    if question in qa_data:
                        # Handle duplicate questions if necessary (e.g., log warning, overwrite, append)
                        print(f"Warning: Duplicate question found at row {row_index}: '{question}'. Overwriting previous answer.")
                    qa_data[question] = answer
                else:
                     print(f"Warning: Row {row_index} has an empty question cell (cell index 1).")
            else:
                print(f"Warning: Row {row_index} has fewer than 3 cells ({len(row.cells)}). Skipping.")

        if not qa_data:
            print("Warning: No Question-Answer pairs were extracted from the table.")
        else:
            print(f"Successfully extracted {len(qa_data)} Q&A pairs.")
        return qa_data

    except Exception as e:
        print(f"Error extracting data from Word table in '{file_path}': {e}")
        print(traceback.format_exc())
        return None # Return None on critical error

def sanitize_mongodb_keys(obj):
    """Recursively sanitizes keys in a dictionary or list for MongoDB compatibility."""
    if isinstance(obj, dict):
        new_dict = {}
        for key, value in obj.items():
            # Ensure key is a string
            if not isinstance(key, str):
                try: key = str(key)
                except: continue # Skip if key cannot be converted to string

            if not key: continue # Skip empty keys

            # Replace '.' with '_' and remove leading '$'
            sanitized_key = key.replace('.', '_')
            if sanitized_key.startswith('$'):
                sanitized_key = '_' + sanitized_key[1:]

            if not sanitized_key: continue # Skip if key becomes empty after sanitization

            # Recursively sanitize value
            new_dict[sanitized_key] = sanitize_mongodb_keys(value)
        return new_dict
    elif isinstance(obj, list):
        # Recursively sanitize items in a list
        return [sanitize_mongodb_keys(item) for item in obj]
    else:
        # Return non-dict/list items as is
        return obj

def split_name(full_name):
    """Splits a full name string into surname and given names."""
    if not full_name or not isinstance(full_name, str):
        return "", ""
    parts = full_name.strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        # Assume single part is given name if only one part exists
        return "", parts[0].upper()
    else:
        # Assume last part is surname, rest is given names
        surname = parts[-1].upper()
        given_names = " ".join(parts[:-1]).upper()
        return surname, given_names

def format_date_for_form(date_str):
    """Parses various common date string formats and returns YYYY-MM-DD."""
    if not date_str or not isinstance(date_str, str):
        return None

    # List of expected date formats
    # Prioritize formats that are less ambiguous (e.g., with month names or 4-digit years)
    formats = [
        "%d %b %Y",  # 01 Jan 2023
        "%d-%b-%Y",  # 01-Jan-2023
        "%B %d, %Y", # January 01, 2023
        "%b %d, %Y",  # Jan 01, 2023
        "%Y-%m-%d",  # 2023-01-31 (ISO format)
        "%d/%m/%Y",  # 31/01/2023 (Common EU/India)
        "%m/%d/%Y",  # 01/31/2023 (Common US)
        "%Y",        # 2023 (Year only) - Default to Jan 1st
        # Add more formats if needed
    ]

    cleaned_date_str = date_str.strip()

    # Attempt to parse using the defined formats
    for fmt in formats:
        try:
            # Use strptime for parsing
            dt_object = datetime.strptime(cleaned_date_str, fmt)
            # Format the output as YYYY-MM-DD
            # If only year was parsed, default to YYYY-01-01
            return dt_object.strftime('%Y-%m-%d') if fmt != "%Y" else dt_object.strftime('%Y-01-01')
        except ValueError:
            continue # Try the next format if parsing fails

    # Fallback check for just a 4-digit year string
    if re.fullmatch(r"\d{4}", cleaned_date_str):
        return f"{cleaned_date_str}-01-01"

    # If no format matches
    print(f"Warning: Date parsing failed for input '{date_str}'. Could not match any known format.")
    return None # Return None if parsing fails for all formats

# --- NEW FUNCTION ---
def format_date_ddmmyyyy(date_str):
    """Parses various common date string formats and returns DD-MM-YYYY."""
    if not date_str or not isinstance(date_str, str):
        return None

    # List of expected date formats (similar to format_date_for_form)
    formats = [
        "%d %b %Y", "%d-%b-%Y", "%B %d, %Y", "%b %d, %Y",
        "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y",
        "%d%b%Y", # e.g., 15APR2026
        "%d %B %Y", # e.g., 15 April 2026
        "%dth %B %Y", # e.g., 15th April 2026 - Handle 'th', 'st', 'nd', 'rd'
        "%dst %B %Y",
        "%dnd %B %Y",
        "%drd %B %Y",
    ]

    cleaned_date_str = date_str.strip()

    # Remove ordinal suffixes (st, nd, rd, th) before parsing
    cleaned_date_str = re.sub(r"(\d+)(st|nd|rd|th)\b", r"\1", cleaned_date_str, flags=re.IGNORECASE)

    # Attempt to parse using the defined formats
    for fmt in formats:
        try:
            dt_object = datetime.strptime(cleaned_date_str, fmt)
            # Format the output as DD-MM-YYYY
            # If only year was parsed, default to 01-01-YYYY
            return dt_object.strftime('%d-%m-%Y') if fmt != "%Y" else dt_object.strftime('01-01-%Y')
        except ValueError:
            continue

    # Fallback check for just a 4-digit year string
    if re.fullmatch(r"\d{4}", cleaned_date_str):
        return f"01-01-{cleaned_date_str}"

    # If no format matches
    print(f"Warning: Date parsing failed for DD-MM-YYYY output for input '{date_str}'.")
    return None # Return None if parsing fails

def parse_place_of_birth(pob_str):
    """Parses a place of birth string into city and state/country."""
    if not pob_str or not isinstance(pob_str, str):
        return None, None
    # Split by comma or space, remove empty parts
    parts = [p.strip() for p in re.split(r'\s*,\s*|\s+', pob_str) if p.strip()]
    if len(parts) >= 2:
        # Assume first part is city, second is state/country
        return parts[0].upper(), parts[1].upper()
    elif len(parts) == 1:
        # Assume only city is provided
        return parts[0].upper(), None
    else:
        # No usable parts found
        return None, None


# --- Flask Routes ---

@app.route('/', methods=['GET'])
def index():
    """Renders the main upload page."""
    if mongo_client is None:
        # Provide a user-friendly error message if DB is down
        return "Error: Database connection is unavailable. Please try again later.", 503
    print("Rendering homepage.")
    # Pass status and allowed extensions to the template
    return render_template('index.html',
                           allowed_ext=ALLOWED_EXTENSIONS,
                           db_status="Connected" if mongo_client else "Disconnected")

# --- Main Upload Endpoint ---
@app.route('/upload', methods=['POST'])
def upload():
    """Handles file uploads (Images and Word docs), processes them, and stores data."""
    print("\n--- New Upload Request Received ---")
    start_time = datetime.now()

    # Check prerequisites
    if mongo_client is None or db is None:
        print("Error: MongoDB connection not available.")
        return jsonify({"error": "Database service is currently unavailable."}), 503
    if 'file' not in request.files:
        print("Error: No file part in the request.")
        return jsonify({"error": "No file part received."}), 400
    file = request.files['file']
    if file.filename == '':
        print("Error: No file selected.")
        return jsonify({"error": "No file selected for upload."}), 400
    if not allowed_file(file.filename):
        print(f"Error: File type not allowed: {file.filename}")
        return jsonify({"error": f"Invalid file format. Allowed formats: {ALLOWED_EXTENSIONS}"}), 415

    # Secure filename and get extension
    safe_filename = secure_filename(file.filename)
    _, file_ext = os.path.splitext(safe_filename)
    file_ext = file_ext.lower()
    print(f"Processing uploaded file: {safe_filename} (Type: {file_ext})")

    # Initialize variables
    file_path = None
    final_response_data = {} # Holds data for the JSON response
    user_id = None # Will store the ObjectId of the user
    doc_type = "unknown" # Detected type (passport, aadhaar, word_form)
    extracted_data_dict = {} # Holds the structured data extracted from the file
    current_scan_results = {} # Temporary storage for intermediate results (like found IDs)

    try:
        # Save the uploaded file temporarily
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_filename)
        file.save(file_path)
        print(f"File saved temporarily to: {file_path}")

        # --- IMAGE PROCESSING BRANCH ---
        if file_ext in ['.png', '.jpg', '.jpeg']:
            print("Processing as Image file...")
            id_field_name = "Document_ID_Number" # Default key for the ID number

            # 1. Perform OCR
            if PaddleOCR is None:
                print("Error: OCR dependency (PaddleOCR) not available.")
                return jsonify({"error": "Image processing engine is not available."}), 501 # Not Implemented
            full_ocr_text = extract_text_paddle(file_path, lang='en') # Assuming English
            if full_ocr_text is None: # Critical OCR failure
                print("Error: OCR process failed critically.")
                return jsonify({"error": "Failed to extract text from image."}), 500
            if not full_ocr_text.strip(): # OCR ran but found no text
                print("Warning: OCR completed but found no text in the image.")
                return jsonify({"error": "Could not find any text in the uploaded image."}), 400

            # 2. Detect Document Type (Passport/Aadhaar)
            doc_type = detect_document_type(full_ocr_text)
            if doc_type == "unknown":
                print("Error: Could not determine document type from OCR text.")
                # Provide partial text for debugging if possible
                ocr_preview = full_ocr_text[:500] + '...' if len(full_ocr_text) > 500 else full_ocr_text
                return jsonify({
                    "Detected Document Type": "Unknown",
                    "error": "Could not reliably determine the document type (e.g., Passport, Aadhaar).",
                    "ocr_text_preview": ocr_preview
                }), 400 # Bad Request - unable to classify
            final_response_data["Detected Document Type"] = doc_type.capitalize()
            # Set a more specific key for the ID number based on detected type
            id_field_name = f"{doc_type.capitalize()}_No" # e.g., Passport_No, Aadhaar_No

            # 3. Find and Redact ID Number
            redacted_text = full_ocr_text
            found_id = None
            placeholder = "[REDACTED ID]" # Generic placeholder
            if doc_type == "passport":
                found_id, redacted_text = find_and_redact_passport_no(full_ocr_text)
                placeholder = PASSPORT_REDACTION_PLACEHOLDER
            elif doc_type == "aadhaar":
                found_id, redacted_text = find_and_redact_aadhaar_no(full_ocr_text)
                placeholder = AADHAAR_REDACTION_PLACEHOLDER
            # Store the found ID (unredacted) for potential use later
            current_scan_results[id_field_name] = found_id if found_id else ID_NUMBER_NOT_FOUND

            # 4. Analyze with Gemini (if available and configured)
            gemini_output = None
            gemini_status = "Skipped (Not Available/Configured)"
            gemini_parsed_data = {}
            if genai and API_KEY != "YOUR_GEMINI_API_KEY":
                gemini_output = analyze_text_with_gemini(redacted_text, API_KEY, GEMINI_MODEL_NAME, doc_type, placeholder)
                if gemini_output:
                    # Clean the response to extract JSON
                    clean_response = gemini_output.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                    json_start = clean_response.find('{')
                    json_end = clean_response.rfind('}')
                    if json_start != -1 and json_end != -1 and json_start < json_end:
                        json_string = clean_response[json_start : json_end + 1]
                        try:
                            parsed = json.loads(json_string)
                            if isinstance(parsed, dict):
                                gemini_parsed_data = parsed
                                gemini_status = "Success"
                                print("Successfully parsed Gemini JSON response.")
                            else:
                                raise TypeError("Parsed JSON is not a dictionary.")
                        except (json.JSONDecodeError, TypeError) as e:
                            print(f"Error parsing Gemini JSON response: {e}")
                            print(f"Received response snippet: {clean_response[:200]}...")
                            gemini_status = f"Failed: JSON Parse Error ({e})"
                    else:
                        print("Error: Could not find valid JSON object in Gemini response.")
                        print(f"Received response snippet: {clean_response[:200]}...")
                        gemini_status = "Failed: No JSON object found in response"
                else:
                    # Gemini analysis was attempted but failed (e.g., API error)
                    gemini_status = "Failed: No response or error during analysis"
            final_response_data["gemini_analysis_status"] = gemini_status

            # 5. Compute Unique Identifiers (Name + DOB/YOB) for User Linking
            computed_name, computed_dob_yob = compute_unique_identifiers(gemini_parsed_data, doc_type)

            # 6. Find or Create User Record in MongoDB
            final_response_data["db_user_status"] = "Skipped"
            if users_collection is not None and computed_name and computed_dob_yob:
                try:
                    print(f"Attempting to find or create user: Name='{computed_name}', DOB/YOB='{computed_dob_yob}'")
                    user_filter = {"name": computed_name, "dob_yob": computed_dob_yob}
                    # Use $setOnInsert to only set fields when creating a new user
                    user_update = {
                        "$setOnInsert": {
                            "name": computed_name,
                            "dob_yob": computed_dob_yob,
                            "created_at": datetime.utcnow()
                            # Add other default fields for a new user if needed
                        }
                    }
                    # Perform find_one_and_update with upsert=True
                    user_record = users_collection.find_one_and_update(
                        user_filter,
                        user_update,
                        upsert=True,
                        return_document=ReturnDocument.AFTER # Get the document after update/insert
                    )
                    if user_record and '_id' in user_record:
                        user_id = user_record['_id'] # Get the ObjectId
                        print(f"User found or created successfully. User ID: {user_id}")
                        # Check if the record was newly inserted or existed before
                        # This requires checking if 'created_at' was just set, or comparing timestamps - more complex.
                        # Simpler approach: just report success.
                        final_response_data["db_user_status"] = "Success (Found/Created via Image Data)"
                        final_response_data["user_id"] = str(user_id) # Convert ObjectId to string for JSON response
                    else:
                        # This case should be unlikely with upsert=True unless there's a DB issue
                        print("Error: User upsert operation did not return a valid record.")
                        final_response_data["db_user_status"] = "Failed (DB Upsert Error)"
                except pymongo.errors.DuplicateKeyError:
                    # Handle rare race condition where another process inserts between find and update attempt
                    print("Warning: Potential race condition during user upsert. Attempting to fetch existing user.")
                    user_record = users_collection.find_one(user_filter)
                    if user_record:
                        user_id = user_record['_id']
                        final_response_data["db_user_status"] = "Success (Fetched Existing User after Race Condition)"
                        final_response_data["user_id"] = str(user_id)
                    else:
                        print("Error: Could not fetch user even after duplicate key error.")
                        final_response_data["db_user_status"] = "Failed (Duplicate Key Resolution Error)"
                except Exception as e:
                    print(f"Error during user find/create operation: {e}")
                    print(traceback.format_exc())
                    final_response_data["db_user_status"] = "Failed (Database Error)"
            elif not computed_name or not computed_dob_yob:
                final_response_data["db_user_status"] = "Skipped (Insufficient Identifiers from Image)"
                print("Skipping user find/create: Insufficient name/DOB info extracted.")
            elif users_collection is None: # Should be caught earlier, but double-check
                 final_response_data["db_user_status"] = "Skipped (DB Not Connected)"

            # Prepare the final dictionary of extracted data for this image
            extracted_data_dict = gemini_parsed_data.copy() # Start with Gemini results
            # Add the unredacted ID number found earlier, using the specific key (e.g., Passport_No)
            if found_id and id_field_name:
                 # Sanitize the key just in case (e.g., remove spaces if any slip through)
                sanitized_id_key = id_field_name.replace('.', '_').replace(' ', '_')
                extracted_data_dict[sanitized_id_key] = found_id
                print(f"Added found ID to extracted data: {sanitized_id_key}={found_id}")


        # --- WORD DOCUMENT PROCESSING BRANCH ---
        elif file_ext == '.docx':
            print("Processing as Word Document (.docx)...")
            doc_type = WORD_DOC_TYPE # Special type for Q&A data
            final_response_data["Detected Document Type"] = "Word Form"
            final_response_data["gemini_analysis_status"] = "N/A" # Gemini not used for Word Q&A

            # Check if docx library is available
            if docx is None:
                print("Error: python-docx library is missing. Cannot process Word files.")
                return jsonify({"error": "Backend configuration error: Cannot process Word documents."}), 500

            # 1. Extract Full Text (primarily for finding Passport No)
            word_full_text = extract_full_text_from_word(file_path)
            if word_full_text is None: # Critical extraction failure
                print("Error: Failed to extract any text from the Word document.")
                return jsonify({"error": "Failed to read text content from the Word document."}), 500
            if not word_full_text: # File is empty or contains no text
                 print("Warning: Word document appears to be empty or contains no text.")
                 return jsonify({"error": "The uploaded Word document is empty or contains no text."}), 400

            # 2. Find Passport Number within the Word document text
            passport_no_from_word = find_passport_no_in_text(word_full_text)
            if not passport_no_from_word:
                print(f"Error: Passport number could not be found within the text of '{safe_filename}'.")
                return jsonify({"error": f"Passport number pattern not found in the uploaded Word document '{safe_filename}'. Processing stopped."}), 400 # Cannot link without passport#
            final_response_data["passport_no_found_in_word"] = passport_no_from_word
            # Also store in temporary results for consistency if needed elsewhere
            current_scan_results["passport_number_from_text"] = passport_no_from_word

            # 3. Look up User ID based on the found Passport Number
            # This assumes a Passport document was previously uploaded and linked the user
            final_response_data["db_user_status"] = "Pending Lookup"
            if documents_collection is None: # Should be caught earlier
                 return jsonify({"error": "Database service is currently unavailable."}), 503
            try:
                print(f"Searching for existing Passport document with number: {passport_no_from_word} to find user ID...")
                # Query the documents collection for a passport type doc with matching number
                # Ensure the key matches how it's stored (likely 'Passport_No' after image processing)
                lookup_filter = {"doc_type": "passport", "extracted_data.Passport_No": passport_no_from_word}
                matched_passport_doc = documents_collection.find_one(lookup_filter)

                if matched_passport_doc:
                    linked_user_id = matched_passport_doc.get("user_id")
                    if linked_user_id and isinstance(linked_user_id, ObjectId):
                        user_id = linked_user_id # Found the associated user ID
                        print(f"User ID found via linked Passport document: {user_id}")
                        final_response_data["db_user_status"] = "Success (Found via Passport No Lookup)"
                        final_response_data["user_id"] = str(user_id) # Convert to string for response
                    else:
                        # Data integrity issue: Passport doc found but no valid user_id link
                        print(f"Error: Found passport doc (ID: {matched_passport_doc.get('_id')}) but it has missing or invalid user_id link.")
                        return jsonify({"error": "Database integrity issue: Found matching passport record but cannot link to a user."}), 500
                else:
                    # No existing passport document found with this number
                    print(f"Error: No existing Passport record found for number '{passport_no_from_word}'. Cannot link Word form to a user.")
                    return jsonify({"error": f"User lookup failed: No passport record found matching the number '{passport_no_from_word}' in the Word document. Please upload the corresponding passport image first."}), 404 # Not Found

            except Exception as e:
                print(f"Database error during user lookup via passport number: {e}")
                print(traceback.format_exc())
                return jsonify({"error": "Database error during user lookup."}), 500

            # 4. Extract Question-Answer Data from the Word table
            if not user_id: # Should have returned earlier if user_id wasn't found
                 print("Error: User ID missing after lookup attempt. Cannot proceed.")
                 return jsonify({"error": "Internal error: User ID not established."}), 500
            raw_qa_data = extract_data_from_word(file_path)
            if raw_qa_data is None: # Critical Q&A extraction failure
                 print("Error: Failed to extract Q&A data from the Word document table.")
                 return jsonify({"error": "Failed to extract question-answer data from the Word document."}), 500
            if not raw_qa_data:
                 print("Warning: No Q&A pairs extracted from the Word document table.")
                 # Decide if this is an error or just an empty form (proceeding for now)

            # 5. Map Extracted Questions to Standardized Keys
            mapped_data = {}
            skipped_questions = []
            print("Mapping extracted questions to standardized keys...")
            for question, answer in raw_qa_data.items():
                mapped_key = QUESTION_TO_KEY_MAP.get(question)
                if mapped_key:
                    mapped_data[mapped_key] = answer
                else:
                    # Log unmapped questions for potential updates to the map
                    skipped_questions.append(question)
                    print(f"  -> Skipping unmapped question: '{question[:100]}...'") # Log snippet
            if skipped_questions:
                final_response_data["warning"] = f"Skipped {len(skipped_questions)} unmapped questions found in the Word document."
                # Optionally include skipped questions in response if needed for debugging:
                # final_response_data["skipped_questions_preview"] = skipped_questions[:5]

            # 5b. Perform Secondary Parsing for specific complex fields (Payer, Father, Mother)
            print("Performing secondary parsing for specific fields (payer, parents)...")
            data_to_save = mapped_data.copy() # Work on a copy

            # Parse 'trip_payer_details'
            payer_details_key = 'trip_payer_details'
            if payer_details_key in data_to_save:
                payer_text = data_to_save[payer_details_key]
                # Assuming details are on separate lines: Name, Phone, Email, Relationship
                lines = [line.strip() for line in payer_text.split('\n') if line.strip()]
                if len(lines) >= 3: # Require at least Name, Phone, Email
                    data_to_save['trip_payer_name'] = lines[0]
                    data_to_save['trip_payer_mobile'] = lines[1]
                    data_to_save['trip_payer_email'] = lines[2]
                    # Optional: Capture relationship if present
                    if len(lines) >= 4: data_to_save['trip_payer_relationship'] = lines[3]
                    del data_to_save[payer_details_key] # Remove original combined field
                    print(f"  -> Parsed '{payer_details_key}' successfully.")
                else:
                     print(f"  -> Warning: Could not parse '{payer_details_key}'. Expected 3+ lines, found {len(lines)}. Value: '{payer_text[:100]}...'")

            # --- >>> FORMAT US DATES TO DD-MM-YYYY <<< ---
            print("Formatting US arrival/departure dates to DD-MM-YYYY for storage...")
            arrival_key = 'us_arrival_date'
            departure_key = 'us_departure_date'

            if arrival_key in data_to_save and data_to_save[arrival_key]:
                original_arrival = data_to_save[arrival_key]
                formatted_arrival = format_date_ddmmyyyy(original_arrival)
                if formatted_arrival:
                    data_to_save[arrival_key] = formatted_arrival
                    print(f"  -> Formatted '{arrival_key}': '{original_arrival}' -> '{formatted_arrival}'")
                else:
                    print(f"  -> Warning: Could not format '{arrival_key}' ('{original_arrival}') to DD-MM-YYYY. Storing original value.")

            if departure_key in data_to_save and data_to_save[departure_key]:
                original_departure = data_to_save[departure_key]
                formatted_departure = format_date_ddmmyyyy(original_departure)
                if formatted_departure:
                    data_to_save[departure_key] = formatted_departure
                    print(f"  -> Formatted '{departure_key}': '{original_departure}' -> '{formatted_departure}'")
                else:
                    print(f"  -> Warning: Could not format '{departure_key}' ('{original_departure}') to DD-MM-YYYY. Storing original value.")
            # --- >>> END DATE FORMATTING <<< ---


            # Add the passport number found in the text to the data being saved, if not already present
            if passport_no_from_word and 'passport_number' not in data_to_save:
                print(f"Adding passport number ('{passport_no_from_word}') found in text to final data.")
                data_to_save['passport_number'] = passport_no_from_word
            elif 'passport_number' in data_to_save and data_to_save['passport_number'] != passport_no_from_word:
                 print(f"Warning: Passport number in Q&A ('{data_to_save['passport_number']}') differs from number found in text ('{passport_no_from_word}'). Using Q&A value.")


            # Set the final dictionary to be saved
            extracted_data_dict = data_to_save
            if not extracted_data_dict:
                print("Warning: No data mapped or added after processing Word document.")


        else:
            # This case should be caught by allowed_file check, but acts as a fallback
            print(f"Error: Unsupported file extension encountered: '{file_ext}'")
            return jsonify({"error": f"Unsupported file type '{file_ext}'. Allowed types: {ALLOWED_EXTENSIONS}"}), 415


        # --- COMMON STEPS (executed after either Image or Word processing) ---

        # 6. Sanitize Final Data Dictionary Keys for MongoDB Compatibility
        sanitized_data_to_save = {}
        try:
            if not isinstance(extracted_data_dict, dict):
                # Ensure we have a dict, even if empty
                print("Warning: Extracted data is not a dictionary. Resetting to empty dict.")
                extracted_data_dict = {}
            print("Sanitizing final data keys for MongoDB storage...")
            sanitized_data_to_save = sanitize_mongodb_keys(extracted_data_dict)
            print("Key sanitization complete.")
            if not sanitized_data_to_save and extracted_data_dict:
                # Check if sanitization resulted in an empty dict when it wasn't originally empty
                print("Warning: Data dictionary became empty after key sanitization.")
        except Exception as e:
            print(f"Error during data key sanitization: {e}")
            print(traceback.format_exc())
            # Decide how to handle: return error or proceed with potentially unsanitized keys?
            # Returning error is safer.
            return jsonify({"error": "Internal server error during data preparation."}), 500


        # 7. Store Document Data in MongoDB (if user_id is available)
        final_response_data["db_document_status"] = "Pending"
        if user_id and documents_collection is not None:
            try:
                print(f"Checking for existing document of type '{doc_type}' for user: {user_id}")
                # Check if a document of the same type already exists for this user
                existing_doc = documents_collection.find_one({"user_id": user_id, "doc_type": doc_type})

                if existing_doc:
                    # Document of this type already exists, skip insertion
                    existing_doc_id = str(existing_doc.get('_id'))
                    print(f"Document type '{doc_type}' already exists for this user (ID: {existing_doc_id}). Skipping insertion.")
                    final_response_data["db_document_status"] = "Skipped (Already Exists)"
                    final_response_data["message"] = f"A '{doc_type.replace('_', ' ').capitalize()}' document record already exists for this user."
                    final_response_data["existing_document_record_id"] = existing_doc_id
                    # Optionally include existing data preview (careful with large data)
                    final_response_data["extracted_data_preview"] = existing_doc.get("extracted_data", {})

                else:
                    # No existing document found, proceed with insertion
                    document_record = {
                        "user_id": user_id, # Store as ObjectId
                        "doc_type": doc_type,
                        "original_filename": safe_filename,
                        "scan_timestamp_utc": datetime.utcnow(),
                        "extracted_data": sanitized_data_to_save if isinstance(sanitized_data_to_save, dict) else {}, # Ensure it's a dict
                        "gemini_analysis_status": final_response_data.get("gemini_analysis_status", "N/A") # Store Gemini status if applicable
                        # Add other metadata if needed (e.g., file hash, OCR text snippet)
                    }
                    print("Inserting new document record into MongoDB...")
                    insert_result = documents_collection.insert_one(document_record)
                    inserted_doc_id = insert_result.inserted_id
                    print(f"Document record inserted successfully (ID: {inserted_doc_id})")
                    final_response_data["db_document_status"] = "Success"
                    final_response_data["document_record_id"] = str(inserted_doc_id) # Convert ObjectId for JSON
                    final_response_data["message"] = f"Successfully added '{doc_type.replace('_', ' ').capitalize()}' document data."
                    # Provide preview of the data just inserted
                    if sanitized_data_to_save:
                         final_response_data["extracted_data_preview"] = sanitized_data_to_save

            except Exception as e:
                print(f"Database error during document check or insertion: {e}")
                print(traceback.format_exc())
                final_response_data["db_document_status"] = "Failed (Database Error)"
                final_response_data["message"] = "An error occurred while saving the document data."

        elif not user_id:
            # Cannot store document if user couldn't be identified or linked
            final_response_data["db_document_status"] = "Skipped (User ID Missing or Not Found)"
            print("Skipping document storage: User ID was not established.")
            # Ensure a message is set if not already present
            if not final_response_data.get("message"):
                 final_response_data["message"] = "Could not store document data because the user could not be identified or linked."
        elif documents_collection is None: # Should be caught earlier
             final_response_data["db_document_status"] = "Skipped (DB Error)"


        # --- Prepare Final JSON Response ---
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        final_response_data["_processing_time_seconds"] = round(processing_time, 2)

        # Selectively build the response object with relevant keys
        cleaned_response = {}
        # Define the keys we want in the final response
        response_keys = [
            "user_id", "document_record_id", "existing_document_record_id",
            "db_user_status", "db_document_status", "message",
            "_processing_time_seconds", "warning", "passport_no_found_in_word",
            "Detected Document Type", "extracted_data_preview", "gemini_analysis_status"
        ]
        # Add the dynamically named ID field (e.g., Passport_No, Aadhaar_No) if it was set
        if 'id_field_name' in locals() and id_field_name and id_field_name in current_scan_results:
             response_keys.append(id_field_name)
             final_response_data[id_field_name] = current_scan_results[id_field_name]

        # Populate the cleaned response dictionary
        for key in response_keys:
            if key in final_response_data and final_response_data[key] is not None:
                 # Skip adding empty preview dictionaries
                if key == "extracted_data_preview" and not final_response_data[key]:
                    continue
                cleaned_response[key] = final_response_data[key]

        print(f"Request processing finished in {processing_time:.2f} seconds.")
        # Determine appropriate HTTP status code based on outcome
        status_code = 200 # Default to OK
        if final_response_data.get("db_document_status") == "Success":
            status_code = 201 # Created (if new doc was inserted) - Use 200 for simplicity if update/skip is common
        elif final_response_data.get("db_document_status") == "Skipped (Already Exists)":
             status_code = 200 # OK (or 204 No Content, but 200 with message is often better)
        elif "Failed" in final_response_data.get("db_document_status", "") or \
             "Failed" in final_response_data.get("db_user_status", ""):
             # Use 4xx for client-side issues (like user not found), 5xx for server-side
             if "not found" in final_response_data.get("db_user_status", "").lower():
                 status_code = 404 # Not Found
             else:
                 status_code = 500 # Internal Server Error for other failures

        return jsonify(cleaned_response), status_code

    except Exception as e:
        # Catch-all for any unexpected errors during the main processing block
        print(f"FATAL error occurred during /upload processing: {e}")
        print(traceback.format_exc())
        # Return a generic 500 error
        return jsonify({"error": "An unexpected internal server error occurred."}), 500
    finally:
        # Cleanup: Remove the temporarily saved file regardless of success or failure
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"Cleaned up temporary file: {file_path}")
            except OSError as e:
                # Log error but don't prevent response from being sent
                print(f"Error removing temporary file '{file_path}': {e}")


# --- API Endpoint to GET ALL USERS ---
@app.route('/api/getUsers', methods=['GET'])
def get_users():
    """Retrieves a list of all users from the database."""
    print("\n--- API Request Received: /api/getUsers ---")
    if users_collection is None:
        print("Error: User collection (DB) not available.")
        return jsonify({"error": "Database service is currently offline."}), 503
    try:
        print("Fetching users from database...")
        # Fetch only necessary fields (_id, name, dob_yob) and sort by name
        users_cursor = users_collection.find({}, {"_id": 1, "name": 1, "dob_yob": 1}).sort("name", pymongo.ASCENDING)
        users_list = list(users_cursor) # Convert cursor to list
        print(f"Found {len(users_list)} users.")

        # Format the user list for the response
        formatted_user_list = []
        for user in users_list:
            user_id_str = str(user['_id'])
            name = user.get('name', 'N/A').title() # Default to N/A and title case
            dob_yob = user.get('dob_yob', '') # Default to empty string
            # Create a display name combining name and DOB/YOB if available
            display_name = f"{name} ({dob_yob})" if dob_yob else name
            formatted_user_list.append({"id": user_id_str, "display_name": display_name})

        return jsonify(formatted_user_list)
    except Exception as e:
        print(f"Error fetching users from database: {e}")
        print(traceback.format_exc())
        return jsonify({"error": "An error occurred while fetching user data."}), 500


# --- API Endpoint for Form Filling Data ---
@app.route('/api/getFormData', methods=['GET'])
def get_form_data():
    """
    Retrieves and combines data from Word Form, Passport, Aadhaar, and User records
    for a specific user ID to pre-fill a form.
    Prioritizes Word Form data, then Passport, then Aadhaar, then User record defaults.
    """
    print("\n--- API Request Received: /api/getFormData ---")
    if mongo_client is None: # Check primary client connection
        print("Error: MongoDB client not connected.")
        return jsonify({"message": "Database service is currently offline."}), 503

    # Get user ID from query parameter
    user_id_str = request.args.get('id')
    if not user_id_str:
        print("Error: 'id' query parameter is missing.")
        return jsonify({"message": "Missing required 'id' parameter in the request."}), 400

    # Validate and convert user ID string to ObjectId
    try:
        user_id_obj = ObjectId(user_id_str)
    except Exception: # Catches InvalidId and other potential errors
        print(f"Error: Invalid user ID format received: '{user_id_str}'")
        return jsonify({"message": "Invalid user ID format provided."}), 400

    print(f"Requesting combined form data for User ID: {user_id_obj}")

    try:
        # 1. Fetch User Record
        if users_collection is None: return jsonify({"message": "User collection unavailable."}), 503
        user_data = users_collection.find_one({"_id": user_id_obj})
        if not user_data:
            print(f"Error: User with ID '{user_id_obj}' not found.")
            return jsonify({"message": f"User with ID {user_id_str} not found."}), 404 # Not Found

        # 2. Fetch Associated Documents (Passport, Aadhaar, Word Form)
        if documents_collection is None: return jsonify({"message": "Documents collection unavailable."}), 503
        docs_cursor = documents_collection.find({
            "user_id": user_id_obj,
            "doc_type": {"$in": ["passport", "aadhaar", WORD_DOC_TYPE]}
        })
        # Organize documents by type for easier access
        docs_by_type = {doc['doc_type']: doc.get("extracted_data", {}) for doc in docs_cursor}
        print(f"Found associated documents for user: {list(docs_by_type.keys())}")

        # Extract data from each source, defaulting to empty dict if not found
        passport_data = docs_by_type.get("passport", {})
        aadhaar_data = docs_by_type.get("aadhaar", {})
        word_form_data = docs_by_type.get(WORD_DOC_TYPE, {})

        # 3. Initialize Combined Data Structure
        # Define all possible keys expected by the form-filling target (e.g., Chrome extension)
        all_form_keys = [
            # Personal Info
            "surnames", "given_names", "full_name_native", "sex", "marital_status", "date_of_birth",
            "pob_city", "pob_state_province", "pob_country", "national_id",
            # Contact Info
            "home_address", "mailing_address_same_as_home", "primary_phone", "secondary_phone", "email",
            # Passport & ID
            "passport_number", "Type", "Country_Code", "Nationality", "Place_of_Issue", "Date_of_Issue", "Date_of_Expiry",
            "Aadhaar_No",
            # Family Info
            "father_surname","father_given_name" ,"father_dob", "father_in_us", "mother_surname","mother_given_name" ,"mother_dob", "mother_in_us",
            "spouse_surname","spouse_given_name", "spouse_dob", "spouse_pob", "spouse_address",
            "immediate_relatives_in_us", "other_relatives_in_us",
            # Employment Info (Current)
            "current_employer_name", "current_employer_address", "current_employer_duties","prevoius_employer_duties", "current_employment_start_date",
            # Previous Employment Info
            "prev_emp_1_name", "prev_emp_1_address", "prev_emp_1_phone", "prev_emp_1_job_title","prev_emp_1_supervisor_name","prev_emp_1_start_date","prev_emp_1_end_date","prev_emp_1_duties",
            "prev_emp_2_name", "prev_emp_2_address", "prev_emp_2_phone", "prev_emp_2_job_title","prev_emp_2_supervisor_name","prev_emp_2_start_date","prev_emp_2_end_date","prev_emp_2_duties",
            # Employment Info (Previous)
            "previous_employer_name", "previous_employer_address_phone", "previous_job_title",
            "previous_supervisor_name","previous_employment", "previous_employment_period", #"previous_employer_duties", # Often same as current, handle if needed
            # Education Info
            "attended_secondary_education_or_above","highest_qualification", "institution_name", "institution_address","education_institute_start_date","education_institute_end_date",
            # US Travel Info
            "us_arrival_date", "us_departure_date", "us_arrival_departure_cities", "us_flight_details",
            "us_visit_locations", "us_stay_address",
            # Trip Funding
            "trip_payer", "trip_payer_name", "trip_payer_mobile", "trip_payer_email", "trip_payer_relationship", # Added relationship
            "payer_address_same_as_applicant",
            # Travel Companions & History
            "travel_companions", "previous_us_visits", "previous_us_visa_issued", "previous_us_visa_refusal",
            "immigrant_petition_filed", "lost_stolen_passport_details",
            # US Contact
            "us_contact_name_or_org", "us_contact_surname","us_contact_given_name", "us_contact_relationship",
            "us_contact_street_address","us_contact_city","us_contact_state","us_contact_zip", "us_contact_phone", # Assuming phone/email are combined in Word form parsing
            # Miscellaneous
            "social_media_presence", "clan_or_tribe", "other_permanent_residency", "other_nationalities",
            "languages_spoken", "countries_visited_last_5_years", "organization_contributions", "monthly_income",
            # Form-specific flags/defaults
            "full_name_native_na", "other_names_used", "has_telecode", "pob_state_province_na"
        ]
        # Initialize all keys to None
        combined_data = {key: None for key in all_form_keys}
        # Set default values for flags/checkboxes if needed
        combined_data.update({
            "full_name_native_na": False,
            "other_names_used": "N", # Assuming 'N' for No as default
            "has_telecode": "N",    # Assuming 'N' for No as default
            "pob_state_province_na": False
        })

        # 4. Data Mapping Logic (Layering data sources)
        print("Mapping data sources (Priority: Word -> Passport -> Aadhaar -> User Record)...")

        # Layer 1: Populate from Word Form Data (Highest priority for fields it contains)
        # Iterate through all keys expected by the form
        for key in combined_data:
            # Check if the key exists in the parsed Word data and has a non-empty value
            if key in word_form_data and word_form_data[key] not in [None, ""]:
                combined_data[key] = word_form_data[key]
                # print(f"  -> Using Word Form for '{key}'") # Verbose logging if needed

        # Layer 2: Populate from Passport Data (Fill missing/empty OR override specific fields like names)
        # Define potential key variations found in Passport data (from Gemini or manual entry)
        passport_key_variants = {
            "surnames": ("Surname",),
            "given_names": ("Given Names", "Given_Names"),
            "sex": ("Sex",),
            "date_of_birth": ("Date of Birth", "Date_of_Birth"),
            "pob_raw": ("Place of Birth", "Place_of_Birth"), # Temporary key for PoB parsing
            "Nationality": ("Nationality",),
            "Country_Code": ("Country Code", "Country_Code"),
            "passport_number": ("Passport_No", "passport_number"), # Check specific stored key
            "Type": ("Type",),
            "Place_of_Issue": ("Place of Issue", "Place_of_Issue"),
            "Date_of_Issue": ("Date of Issue", "Date_of_Issue"),
            "Date_of_Expiry": ("Date of Expiry", "Date_of_Expiry")
        }
        for form_key, passport_options in passport_key_variants.items():
            passport_value = None
            # Find the first matching key variant in the passport data
            for p_key in passport_options:
                if p_key in passport_data and passport_data[p_key] not in [None, ""]:
                    passport_value = passport_data[p_key]
                    break # Use the first found value

            if passport_value: # Only proceed if a value was found in passport data
                # Determine if we should overwrite existing combined data
                # Overwrite if:
                #   a) The field in combined_data is currently empty/None OR
                #   b) The field is a name part (surnames, given_names), which we often prefer from the official doc
                should_overwrite = (combined_data.get(form_key) in [None, ""]) or \
                                   (form_key in ["surnames", "given_names"])

                if should_overwrite:
                    # print(f"  -> Using Passport for '{form_key}'") # Verbose logging
                    # Apply specific formatting if needed (e.g., uppercase names)
                    if form_key in ["surnames", "given_names"]:
                        combined_data[form_key] = str(passport_value).upper()
                    # Dates will be formatted consistently at the end
                    else:
                        combined_data[form_key] = passport_value

        # Special handling for Place of Birth (PoB) parsing from passport
        # If city is still missing and we got a raw PoB string from passport
        if combined_data.get("pob_city") is None and combined_data.get("pob_raw"):
            city, state_country = parse_place_of_birth(combined_data["pob_raw"])
            if city:
                combined_data["pob_city"] = city
                # If state/province is also missing, try filling it from the parsed PoB
                if state_country and combined_data.get("pob_state_province") is None:
                    combined_data["pob_state_province"] = state_country
                    # If state filled, mark NA as False
                    combined_data["pob_state_province_na"] = False
                elif not state_country and combined_data.get("pob_state_province") is None:
                     # If only city found, mark state NA as True if not already set
                     combined_data["pob_state_province_na"] = True

        # Remove the temporary raw key if it exists
        if "pob_raw" in combined_data: del combined_data["pob_raw"]


        # Layer 3: Populate from Aadhaar Data (Fill missing/empty fields)
        # Define potential key variations from Aadhaar data
        aadhaar_key_variants = {
            "full_name_aadhaar": ("Name",), # Temporary key for name splitting if needed
            "sex": ("Sex/Gender", "Sex_Gender"), # Check variations
            "date_of_birth": ("Date of Birth", "Date_of_Birth", "Year of Birth", "Year_of_Birth"), # DOB/YOB variations
            "Aadhaar_No": ("Aadhaar_No",), # Assuming stored with underscore
            "home_address": ("Address", "Full Address", "Full_Address") # Address variations
            # Add other relevant Aadhaar fields if extracted (e.g., Date of Issue)
        }

        # Handle DOB/YOB priority separately for Aadhaar (prefer full DOB)
        aadhaar_dob_value = None
        for dob_key in ("Date of Birth", "Date_of_Birth"):
            if dob_key in aadhaar_data and aadhaar_data[dob_key] not in [None, ""]:
                aadhaar_dob_value = aadhaar_data[dob_key]
                break
        if not aadhaar_dob_value: # Fallback to Year of Birth
            for yob_key in ("Year of Birth", "Year_of_Birth"):
                 if yob_key in aadhaar_data and aadhaar_data[yob_key] not in [None, ""]:
                     aadhaar_dob_value = aadhaar_data[yob_key]
                     break
        # Fill DOB only if currently missing in combined_data
        if combined_data.get("date_of_birth") in [None, ""] and aadhaar_dob_value:
            # print("  -> Using Aadhaar for 'date_of_birth'") # Verbose
            combined_data["date_of_birth"] = aadhaar_dob_value

        # Process other Aadhaar fields
        for form_key, aadhaar_options in aadhaar_key_variants.items():
            if form_key == "date_of_birth": continue # Handled above

            aadhaar_value = None
            for a_key in aadhaar_options:
                if a_key in aadhaar_data and aadhaar_data[a_key] not in [None, ""]:
                    aadhaar_value = aadhaar_data[a_key]
                    break

            # Fill only if the field is currently missing/empty in combined_data
            if combined_data.get(form_key) in [None, ""] and aadhaar_value:
                 # print(f"  -> Using Aadhaar for '{form_key}'") # Verbose
                 combined_data[form_key] = aadhaar_value

        # If name parts (surname/given) are still missing, try splitting Aadhaar name
        if combined_data.get("surnames") is None and combined_data.get("full_name_aadhaar"):
             print("  -> Using Aadhaar Name for splitting into surname/given names.")
             s_name, g_names = split_name(combined_data["full_name_aadhaar"])
             # Only assign if split was successful
             if s_name or g_names:
                 combined_data["surnames"] = s_name
                 combined_data["given_names"] = g_names
        # Remove the temporary Aadhaar name key
        if "full_name_aadhaar" in combined_data: del combined_data["full_name_aadhaar"]


        # Layer 4: Populate from User Record (Fill missing/empty as last resort, mainly for defaults/flags)
        # Map user record fields to form keys
        user_mapping = {
            "name": "user_record_name", # Temporary key for name splitting if needed
            "dob_yob": "date_of_birth", # Use user record DOB if still missing
            # Fields potentially stored directly on user record (if applicable)
            "marital_status": "marital_status",
            "full_name_native": "full_name_native",
            "full_name_native_na": "full_name_native_na",
            "other_names_used": "other_names_used",
            "has_telecode": "has_telecode",
            "pob_city": "pob_city",
            "pob_state_province": "pob_state_province",
            "pob_state_province_na": "pob_state_province_na",
            "pob_country": "pob_country"
            # Add other fields if they are stored directly on the user object
        }
        for user_key, form_key in user_mapping.items():
            user_value = user_data.get(user_key)
            if user_value is not None: # Only consider if user data has a value for this key
                current_form_value = combined_data.get(form_key)

                # Determine if we should use the user record value
                # Use it if the current form value is None, empty string,
                # or a default negative value (like 'N' or False) that should be overridden.
                use_user_value = False
                if isinstance(current_form_value, bool) and current_form_value is False:
                    # If current is False, override only if user value is True
                    if user_value: use_user_value = True
                elif current_form_value in [None, "", "N"]:
                    # If current is None, empty, or default 'N', use the user value
                    use_user_value = True

                if use_user_value:
                    # print(f"  -> Using User record for '{form_key}'") # Verbose
                    # Apply formatting for specific flags if needed
                    if form_key in ["other_names_used", "has_telecode"] and isinstance(user_value, str):
                         combined_data[form_key] = user_value.upper() # Ensure 'Y'/'N'
                    else:
                         combined_data[form_key] = user_value

        # Final attempt: If name still missing, split from user record name
        if combined_data.get("surnames") is None and combined_data.get("user_record_name"):
             print("  -> Using User record Name for splitting.")
             s_name, g_names = split_name(combined_data["user_record_name"])
             if s_name or g_names:
                 combined_data["surnames"] = s_name
                 combined_data["given_names"] = g_names
        # Remove temporary user name key
        if "user_record_name" in combined_data: del combined_data["user_record_name"]


        # 5. Final Formatting and Cleanup
        print("Applying final formatting (dates, flags)...")
        date_keys_to_format_yyyy_mm_dd = [
            "date_of_birth", "spouse_dob", "father_dob", "mother_dob",
            "Date_of_Issue", "Date_of_Expiry"
            # DO NOT include us_arrival_date, us_departure_date here if they should remain DD-MM-YYYY
        ]
        for date_key in date_keys_to_format_yyyy_mm_dd:
            original_date = combined_data.get(date_key)
            if original_date: # Check if key exists and has a value
                formatted_date = format_date_for_form(str(original_date)) # Ensure input is string
                if formatted_date and formatted_date != original_date:
                     print(f"  -> Formatting date '{date_key}': '{original_date}' -> '{formatted_date}'")
                     combined_data[date_key] = formatted_date
                elif not formatted_date:
                     print(f"  -> Warning: Could not re-format date '{date_key}': '{original_date}'")
                     # Keep original value if formatting fails

        # Recalculate POB NA flag based on final state value
        if not combined_data.get("pob_state_province") and not combined_data.get("pob_state_province_na"):
            print("  -> Setting pob_state_province_na to True as state/province is missing.")
            combined_data["pob_state_province_na"] = True
        elif combined_data.get("pob_state_province") and combined_data.get("pob_state_province_na"):
             print("  -> Setting pob_state_province_na to False as state/province is present.")
             combined_data["pob_state_province_na"] = False # Ensure it's False if state exists


        # --- End Mapping ---
        print("Final combined data prepared for response.")
        # Return the full dictionary, including keys with None values, as the frontend might expect them
        return jsonify(combined_data)

    except Exception as e:
        print(f"Error occurred in /api/getFormData processing: {e}")
        print(traceback.format_exc())
        return jsonify({"message": "An error occurred while processing the form data request."}), 500

# --- CORS Handling ---
# Read the Extension ID from environment variable or use a placeholder
# IMPORTANT: Replace "YOUR_EXTENSION_ID_HERE" with the actual Chrome Extension ID
# or set the CHROME_EXTENSION_ID environment variable.
YOUR_EXTENSION_ID = os.environ.get("CHROME_EXTENSION_ID", "YOUR_EXTENSION_ID_HERE")
if YOUR_EXTENSION_ID == "YOUR_EXTENSION_ID_HERE":
    print("\n*********************************************************************")
    print("WARNING: CHROME_EXTENSION_ID is not set in environment variables.")
    print("CORS will likely fail for the Chrome Extension.")
    print("Set the CHROME_EXTENSION_ID environment variable or update the code.")
    print("*********************************************************************\n")

# Construct the origin string for the Chrome extension
cors_origin = f"chrome-extension://{YOUR_EXTENSION_ID}"
# Apply CORS settings specifically to API routes
CORS(app, resources={r"/api/*": {"origins": cors_origin}})
print(f"CORS configured for API routes. Allowing origin: {cors_origin}")


# --- Server Start ---
if __name__ == '__main__':
    print("Starting Flask development server...")

    # Final checks for critical components before starting
    if mongo_client is None:
        print("FATAL: MongoDB connection failed during startup. Server cannot start.")
        exit(1) # Exit if DB connection failed

    # Print warnings for missing optional dependencies
    print("\n--- Optional Dependency Status ---")
    if docx is None: print("WARN: python-docx library not found. .docx file processing will fail.")
    else: print("OK: python-docx library found.")
    if PaddleOCR is None: print("WARN: paddleocr library not found. Image OCR processing will fail.")
    else: print("OK: paddleocr library found.")
    if genai is None: print("WARN: google-generativeai library not found. Gemini analysis will fail.")
    else: print("OK: google-generativeai library found.")
    print("---------------------------------\n")

    # Run the Flask app
    # debug=True enables auto-reloading and detailed error pages (disable in production)
    # host='0.0.0.0' makes the server accessible externally (use '127.0.0.1' for local only)
    # port=5000 is the default Flask port
    app.run(debug=True, host='0.0.0.0', port=5000)
