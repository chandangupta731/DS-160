console.log("Form Filler Content Script Loaded.");

// --- Configuration ---
const formFieldMapping = [
    // --- Personal Info ---
    {
        form_key: "surname",
        //label_texts: ["Surnames", "Surname", "Last Name", "Family Name", "Family name:"],
        api_keys: ["surnames", "Surname", "surname", "lastName", "family_name", "familienname"],
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SURNAME" } ,// VERIFY ID
        //html_xpath_locator: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[1]/div[1]/div[1]"
    },
    {
        form_key: "first_name", // Or "given_name" to align with backend
        //label_texts: ["Given Names"], // This is the potentially ambiguous one
        api_keys: ["given_names"], // Matches the key used in Python backend for applicant
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_GIVEN_NAME" }, // Existing ID locator
        //html_xpath_locator: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[1]/div[1]/div[2]" // New XPath locator
    },
    // --- DOB Specific Mappings (Needed for parsing) ---
    {
        form_key: "dob_day",
        label_texts: ["Day"],
        api_keys: [], // Filled by 'dob' logic
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlDOBDay" } // VERIFY ID
    },
    {
        form_key: "dob_month",
        label_texts: ["Month"],
        api_keys: [], // Filled by 'dob' logic
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlDOBMonth" } // VERIFY ID
    },
    {
        form_key: "dob_year",
        label_texts: ["Year"],
        api_keys: [], // Filled by 'dob' logic
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxDOBYear" } // VERIFY ID
    },
    // --- DOB Data Source Mapping ---
    {
        form_key: "dob", // Key to trigger DOB parsing
        label_texts: ["Date of birth", "Date"],
        api_keys: ["date_of_birth", "Date of Birth", "dob_ddmmyyyy", "dateOfBirth"],
        field_type: "hidden" // Indicates this holds data for other fields
    },
    // --- Other Personal Info ---
    {
        form_key: "place_of_birth",
        label_texts: ["City"], // Use specific label
        api_keys: ["pob_city", "Place of Birth", "placeOfBirth", "birthPlace", "geburtsort"],
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_POB_CITY" } // VERIFY ID
    },
    // --- POB State/Province Mappings ---
    // {
    //     form_key: "pob_state",
    //     label_texts: ["State/Province"], // Use specific label
    //     api_keys: ["pob_state_province"], // Filled only if pob_state_na is false/N
    //     field_type: "text",
    //     locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_POB_ST_PROVINCE" } // VERIFY ID
    // },
    {
        form_key: "pob_state_na",
        //label_texts: ["Does Not Apply"], // Label for the checkbox
        api_keys: ["pob_state_province_na"], // API key to control checkbox state (will be overridden by hardcoded value)
        field_type: "checkbox",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[3]/div[1]/div/div/div[3]/div/span/span/input" } // VERIFY ID
    },
    // --- POB Country ---
    {
        form_key: "country_of_birth",
        label_texts: ["Country/Region"], // Use specific label
        api_keys: ["pob_country", "Country_Code", "countryOfBirth", "birthCountryCode"],
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_POB_CNTRY" } // VERIFY ID
    },
    {
        form_key: "sex",
        label_texts: ["Sex", "Gender", "Sex:"],
        api_keys: ["sex", "Sex", "gender"],
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_GENDER"} // VERIFY ID
    },
    {
        form_key: "marital_status",
        label_texts: ["Marital status", "Civil Status"],
        api_keys: ["marital_status"],
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_MARITAL_STATUS" } // VERIFY ID & API data
    },
    {
        form_key: "current_nationality",
        label_texts: ["Current nationality"],
        api_keys: ["nationality", "Nationality"],
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_NATL"} // VERIFY ID
    },
    {
        form_key: "original_nationality",
        label_texts: ["Original nationality"],
        api_keys: ["originalNationality", "nationalityAtBirth"],
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_POB_NATL"} // VERIFY ID
    },
    // --- Checkboxes/Radios ---
    {
        form_key: "full_name_native_na",
        label_texts: ["Does Not Apply/Technology Not Available"],
        api_keys: ["full_name_native_na", "native_name_na"],
        field_type: "checkbox",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_FULL_NAME_NATIVE_NA" } // VERIFY ID
    },
    {
        form_key: "other_names_used",
        label_texts: ["Have you ever used other names"],
        api_keys: ["other_names_used"],
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblOtherNames" } // VERIFY Name
    },
    {
        form_key: "has_telecode",
        label_texts: ["Do you have a telecode"],
        api_keys: ["has_telecode"],
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblTelecodeQuestion" } // VERIFY Name
    },
    {
        form_key: "other_nationality_held",
        label_texts: ["Do you hold or have you held any nationality other"],
        api_keys: ["has_other_nationality", "other_nationalities"],
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblAPP_OTH_NATL_IND" } // VERIFY Name
    },
    {
        form_key: "permanent_resident_other_country",
        label_texts: ["Are you a permanent resident of a country/region other"],
        api_keys: ["is_permanent_resident_other", "other_permanent_residency"],
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblPermResOtherCntryInd" } // VERIFY Name
    },
    {
        form_key: "ssn_na",
        label_texts: ["U.S. Social Security Number", "Does Not Apply"],
        api_keys: ["ssn_not_applicable"],
        field_type: "checkbox",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_SSN_NA" } // VERIFY ID
    },
    {
        form_key: "tax_id_na",
        label_texts: ["U.S. Taxpayer ID Number", "Does Not Apply"],
        api_keys: ["tax_id_not_applicable"],
        field_type: "checkbox",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_TAX_ID_NA"} // VERIFY ID
    },
    // --- Passport/ID Info ---
    // POB State/Province mappings moved up near POB City/Country
    {
        form_key: "place_of_issue",
        label_texts: ["City"],
        api_keys: ["Place of Issue","Place_of_Issue", "poi_city", "placeOfIssue"],
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_ISSUED_IN_CITY"} // VERIFY ID
    },
    {
        form_key: "passport_issue_country",
        label_texts: ["Country/Authority that Issued Passport/Travel Document"],
        api_keys: ["Country_Code"], // API key from your Flask app
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_CNTRY" }
    },
    {
        form_key: "issue_country",
        label_texts: ["Country/Region"],
        api_keys: ["Country_Code"], // API key from your Flask app
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_IN_CNTRY" }
    },
    {
        form_key: "passport_number",
        label_texts: ["Passport Number", "Passport No."],
        api_keys: ["Passport_No_", "passport_number", "passportNumber"],
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_NUM"} // VERIFY ID
    },
    {
        form_key: "national_id",
        label_texts: ["National Identification Number"],
        api_keys: ["national_id", "Aadhaar_No"],
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_NATIONAL_ID"} // VERIFY ID
    },
    {
        form_key: "passport_issue_date_day",
        label_texts: ["Day"], // Label for day of passport issue date
        api_keys: [], // Filled by 'passport_issue_date' logic
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_DTEDay" }
    },
    {
        form_key: "passport_issue_date_month",
        label_texts: ["Month"], // Label for month of passport issue date
        api_keys: [], // Filled by 'passport_issue_date' logic
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_DTEMonth" }
    },
    {
        form_key: "passport_issue_date_year",
        label_texts: ["Year"], // Label for year of passport issue date
        api_keys: [], // Filled by 'passport_issue_date' logic
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_ISSUEDYear" }
    },
    {
        form_key: "passport_issue_date", // Hidden field to get the full date string
        label_texts: ["Issuance Date"],
        api_keys: ["Date_of_Issue"],
        field_type: "hidden"
    },
    // --- Passport Expiration Date Mappings ---
    {
        form_key: "passport_expiry_date_day",
        label_texts: ["Day"], // Label for day of passport expiry date
        api_keys: [], // Filled by 'passport_expiry_date' logic
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_EXPIRE_DTEDay" }
    },
    {
        form_key: "passport_expiry_date_month",
        label_texts: ["Month"], // Label for month of passport expiry date
        api_keys: [], // Filled by 'passport_expiry_date' logic
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_EXPIRE_DTEMonth" }
    },
    {
        form_key: "passport_expiry_date_year",
        label_texts: ["Year"], // Label for year of passport expiry date
        api_keys: [], // Filled by 'passport_expiry_date' logic
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_EXPIREYear" }
    },
    {
        form_key: "passport_expiry_na", // For "No Expiration" checkbox
        label_texts: ["No Expiration"],
        api_keys: [], // Will be determined by presence/absence of Date_of_Expiry
        field_type: "checkbox",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_cbxPPT_EXPIRE_NA" }
    },
    {
        form_key: "passport_expiry_date", // Hidden field to get the full date string
        label_texts: ["Expiration Date"],
        api_keys: ["Date_of_Expiry"],
        field_type: "hidden"
    },
    {
        form_key: "national_id_na",
        label_texts: ["Does Not Apply"], // Label associated with National ID
        api_keys: [], // Not controlled by API data directly when ID is present
        field_type: "checkbox",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_NATIONAL_ID_NA"} // **VERIFY THIS ID ON YOUR FORM**
    },
    // --- Travel Info ---
    {
        form_key: "other_persons_traveling",
        label_texts: ["Are there other persons traveling with you?"],
        api_keys: ["travel_companions"], // Key to check for presence of companions
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblOtherPersonsTravelingWithYou" } // Use name attribute
    },
    // --- Mappings for FIRST Travel Companion Details (if Yes is selected) ---
    {
        form_key: "companion_surname_1",
        label_texts: ["Surnames of Person Traveling With You"],
        api_keys: [], // Filled by parsing 'travel_companions'
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl00_tbxSurname" } // VERIFY ID
    },
    {
        form_key: "companion_given_name_1",
        label_texts: ["Given Names of Person Traveling With You"],
        api_keys: [], // Filled by parsing 'travel_companions'
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl00_tbxGivenName" } // VERIFY ID
    },
    {
        form_key: "companion_relationship_1",
        label_texts: ["Relationship with Person"],
        api_keys: [], // Filled by parsing 'travel_companions'
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl00_ddlTCRelationship" } // VERIFY ID
    },
    {
        form_key: "purpose_of_trip",
        label_texts: ["Purpose of Trip to the U.S."],
        api_keys: ["purpose_of_trip_code"],
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlPurposeOfTrip" } // VERIFY ID
    },
    {
        form_key: "purpose_specify",
        label_texts: ["Specify"],
        api_keys: ["purpose_specify_code"],
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlOtherPurpose" } // VERIFY ID
    },
    {
        form_key: "trip_payer_entity",
        label_texts: ["Person/Entity Paying for Your Trip"],
        api_keys: ["trip_payer"],
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlWhoIsPaying" } // VERIFY ID
    },
    {
        form_key: "specific_travel_plans",
        label_texts: ["Have you made specific travel plans?"],
        api_keys: [], // No API key needed, will be hardcoded
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblSpecificTravel" } // Use name attribute
    },
    {
        form_key: "traveling_as_organization",
        label_texts: ["Are you traveling as part of a group or organization?"],
        api_keys: [""], // Key to check for presence of companions - Needs API Key if dynamic
        field_type: "radio",
        locator: { type: "name", value: "ctl00_SiteContentPlaceHolder_FormView1_rblGroupTravel" } // Use name attribute - VERIFY NAME
    },
    // --- Mappings for Arrival Date Components ---
    {
        form_key: "arrival_date_day",
        label_texts: ["Day"],
        api_keys: [], // Filled by 'arrival_date' logic
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_DTEDay" } // VERIFY ID
    },
    {
        form_key: "arrival_date_month",
        label_texts: ["Month"],
        api_keys: [], // Filled by 'arrival_date' logic
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_DTEMonth" } // VERIFY ID
    },
    {
        form_key: "arrival_date_year",
        label_texts: ["Year"],
        api_keys: [], // Filled by 'arrival_date' logic
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxTRAVEL_DTEYear" } // VERIFY ID
    },
    // --- Mapping for Arrival Date Data Source ---
    {
        form_key: "arrival_date", // Key to trigger arrival date parsing
        label_texts: ["Intended Date of Arrival"],
        api_keys: ["us_arrival_date"],
        field_type: "hidden"
    },
    // --- Mapping for Departure Date Data Source (for LOS calculation) ---
    {
        form_key: "departure_date", // Key to receive departure date for calculation
        label_texts: ["Intended Date of Departure"],
        api_keys: ["us_departure_date"],
        field_type: "hidden"
    },
    // --- Mappings for Length of Stay Fields (Calculated) ---
    {
        form_key: "intended_los_value", // The number input field
        label_texts: ["Intended Length of Stay"],
        api_keys: [], // Filled by calculation
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxTRAVEL_LOS" } // VERIFY ID
    },
    {
        form_key: "intended_los_unit", // The unit select dropdown
        label_texts: ["Intended Length of Stay"],
        api_keys: [], // Filled by calculation
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_LOS_CD" } // VERIFY ID
    },
    // --- Mappings for US Stay Address Components ---
    {
        form_key: "us_address_street1",
        //label_texts: ["Street Address (Line 1)"],
        api_keys: [], // Filled by 'us_stay_address' logic
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div/div/div/div[2]/div[1]/input" } // VERIFY ID
    },
    {
        form_key: "us_address_street2",
        //label_texts: ["Street Address (Line 2)"],
        api_keys: [], // Filled by 'us_stay_address' logic
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div/div/div/div[2]/div[2]/input" } // VERIFY ID
    },
    {
        form_key: "us_address_city",
        //label_texts: ["City"],
        api_keys: [], // Filled by 'us_stay_address' logic
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div/div/div/div[2]/div[3]/input" } // VERIFY ID
    },
    {
        form_key: "us_address_state",
        //label_texts: ["State"],
        api_keys: [], // Filled by 'us_stay_address' logic
        field_type: "select",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div/div/div/div[2]/div[4]/select" } // VERIFY ID
    },
    {
        form_key: "us_address_zip",
        //label_texts: ["ZIP Code"],
        api_keys: [], // Filled by 'us_stay_address' logic
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div/div/div/div[2]/div[5]/input" } // VERIFY ID
    },
    // --- Mapping for Full US Stay Address Data Source ---
    {
        form_key: "us_stay_address", // Key to trigger address parsing
        label_texts: ["Address Where You Will Stay in the U.S."], // Text to check for conditional filling
        api_keys: ["us_stay_address"], // API key from Flask app
        field_type: "hidden" // Holds the full address string for parsing
    },
    // --- Mappings for Previous US Travel ---
    {
        form_key: "prev_us_travel",
        label_texts: ["Have you ever been in the U.S.?"],
        api_keys: ["previous_us_visits"], // API key from Flask app
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblPREV_US_TRAVEL_IND" } // VERIFY Name
    },
    {
        form_key: "prev_visa_issued",
        label_texts: ["Have you ever been issued a U.S. Visa?"],
        api_keys: ["previous_us_visa_issued"], // API key from Flask app
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblPREV_VISA_IND" } // VERIFY Name
    },
    {
        form_key: "prev_visa_refused",
        label_texts: ["Have you ever been refused a U.S. Visa"], // Partial label match
        api_keys: ["previous_us_visa_refusal"], // API key from Flask app
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblPREV_VISA_REFUSED_IND" } // VERIFY Name
    },
    {
        form_key: "iv_petition_filed",
        label_texts: ["Has anyone ever filed an immigrant petition on your behalf"], // Partial label match
        api_keys: ["immigrant_petition_filed"], // API key from Flask app
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblIV_PETITION_IND" } // VERIFY Name
    },
    // --- Mappings for Home Address ---
    {
        form_key: "home_address_street1",
        label_texts: ["Street Address (Line 1)"], // Label within Home Address section
        api_keys: [], // Filled by 'home_address' logic
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_LN1" } // VERIFY ID
    },
    {
        form_key: "home_address_street2",
        label_texts: ["Street Address (Line 2)"],
        api_keys: [],
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_LN2" } // VERIFY ID
    },
    {
        form_key: "home_address_city",
        label_texts: ["City"],
        api_keys: [],
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_CITY" } // VERIFY ID
    },
    {
        form_key: "home_address_state_na",
        //label_texts: ["Does Not Apply"], // Checkbox associated with Home Address State
        api_keys: [], // We will likely hardcode this or determine based on parsing
        field_type: "checkbox",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[1]/div/div/div[4]/span[3]/span/input" } // VERIFY ID
    },
    {
        form_key: "home_address_postal",
        label_texts: ["Postal Zone/ZIP Code"],
        api_keys: [],
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_POSTAL_CD" } // VERIFY ID
    },
    {
        form_key: "home_address_postal_na",
        label_texts: ["Does Not Apply"], // Checkbox associated with Home Address Postal Code
        api_keys: [],
        field_type: "checkbox",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_ADDR_POSTAL_CD_NA" } // VERIFY ID
    },
    {
        form_key: "home_address_country",
        label_texts: ["Country/Region"],
        api_keys: [], // Assuming country comes from elsewhere or defaults
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlCountry" } // VERIFY ID
    },
    // --- Mapping for Full Home Address Data Source ---
    {
        form_key: "home_address", // Key to trigger home address parsing
        label_texts: ["Home Address"], // Section header
        api_keys: ["home_address"], // API key from Flask app
        field_type: "hidden" // Holds the full address string for parsing
    },
    // In formFieldMapping array, before Mailing Address component mappings:
    {
        form_key: "mailing_address_same_as_home",
        label_texts: ["Is your Mailing Address the same as your Home Address?"],
        api_keys: ["mailing_address_same_as_home"], // API key from your Flask app
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblMailingAddrSame" } // Name attribute from the table tag in your HTML
    },
    // Inside the formFieldMapping array, for example, after the national_id_na mapping:
    {
        form_key: "work_phone_na", // Logical key for work phone "Does Not Apply"
        label_texts: ["Does Not Apply"], // Label for the checkbox
        api_keys: [], // Not controlled by API if we are hardcoding it
        field_type: "checkbox",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_BUS_TEL_NA" } // ID from your HTML
    },
    {
        form_key: "primary_phone",
        label_texts: ["Primary Phone Number"],
        api_keys: ["primary_phone", "APP_HOME_TEL"], // Assuming "primary_phone" or "APP_HOME_TEL" might be keys in your API data
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_HOME_TEL" }
    },
    {
        form_key: "secondary_phone",
        label_texts: ["Secondary Phone Number"],
        api_keys: ["secondary_phone", "APP_MOBILE_TEL"], // Assuming "secondary_phone" or "APP_MOBILE_TEL" might be keys in your API data
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_MOBILE_TEL" }
    },
    
    {
        form_key: "any_other_phone_numbers_used",
        label_texts: ["Have you used any other phone numbers in the last five years?"],
        api_keys: [""], // Assuming "secondary_phone" or "APP_MOBILE_TEL" might be keys in your API data
        field_type: "radio",
        locator: { type: "", value: "" }
    },
    {
        //label_texts: ["Email Address"],
        api_keys: ["email"], // Assuming "secondary_phone" or "APP_MOBILE_TEL" might be keys in your API data
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[5]/div[1]/div/div/input"}

    },
    {
        form_key: "any_other_email_used",
        label_texts: ["Have you used any other email addresses in the last five years?"],
        api_keys: [""], // Assuming "secondary_phone" or "APP_MOBILE_TEL" might be keys in your API data
        field_type: "radio",
        locator: { type: "", value: "" }
    },
    {
        form_key: "presence_on_any_other_websites",
        label_texts: ["Do you wish to provide information about your presence on any other websites or applications you have used within the last five years to create or share content (photos, videos, status updates, etc.)?"],
        api_keys: [""], // Assuming "secondary_phone" or "APP_MOBILE_TEL" might be keys in your API data
        field_type: "radio",
        locator: { type: "", value: "" }
    },
    {
        form_key: "social_media_platform_1", // For the first social media entry
        label_texts: ["Social Media Provider/Platform"],
        api_keys: [], // Filled by parsing 'social_media_presence'
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl00_ddlSocialMedia" } // ID from HTML
    },
    {
        form_key: "social_media_identifier_1", // For the first social media entry
        label_texts: ["Social Media Identifier"],
        api_keys: [], // Filled by parsing 'social_media_presence'
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl00_tbxSocialMediaIdent" } // ID from HTML
    },
    {
        form_key: "social_media_presence", // To capture the full string from API
        label_texts: ["Do you have a social media presence?"], // Main question label if available
        api_keys: ["social_media_presence"], // API key from Flask app
        field_type: "hidden" // Holds the full string for parsing
    },
    {
        form_key: "passport_document_type",
        label_texts: ["Passport/Travel Document Type"],
        api_keys: ["passport_type_api_key"], // Optional: Add an API key if you might also fill this dynamically
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_TYPE" }
    },
    {
        form_key: "passport_book_number_na",
        label_texts: ["Does Not Apply"],
        api_keys: [],
        field_type: "checkbox",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_cbexPPT_BOOK_NUM_NA" } // ID for the checkbox
    },
    {
        form_key: "lost_or_stolen_passport", // A unique key for this field
        label_texts: ["Have you ever lost a passport or had one stolen?"],
        api_keys: ["lost_stolen_passport_details"], // Your provided API key
        field_type: "radio",
        locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblLOST_PPT_IND" } // Using the 'name' attribute of the radio group
    },
    {
        form_key: "us_contact_surname",
       // label_texts: ["Surnames"], // Label text from the snippet
        api_keys: ["us_contact_surname"], // Data comes from parsing us_contact_full_name in fillForm logic
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_SURNAME" },
        html_xpath_locator:"/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[1]/div[2]/div[1]/div[1]"
    },
    // Contact Person Given Names (Filled from parsing us_contact_full_name)
    {
        form_key: "us_contact_given_names",
        //label_texts: ["Given Names"], // Label text from the snippet
        api_keys: ["us_contact_given_name"], // Data comes from parsing us_contact_full_name in fillForm logic
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_GIVEN_NAME" }, // ID from HTML snippet
        html_xpath_locator: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[1]/div[2]/div[1]/div[2]"
    },
    // Do Not Know checkbox for Contact Person Name
    {
        form_key: "us_contact_name_na",
        label_texts: [""], // Label text associated with this checkbox
        api_keys: [], // State likely determined by data availability or explicit 'us_contact_name_na' key if API provides
        field_type: "checkbox",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[1]/div[2]/div[2]/span/span/input" } // ID from HTML snippet
    },
    
    // Organization Name
    {
        form_key: "us_contact_organization",
        label_texts: ["Organization Name"], // Label text from the snippet
        api_keys: ["us_contact_name_or_org"], // Assuming this API key holds the organization name
        field_type: "text",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ORGANIZATION" } // ID from HTML snippet
    },
    // Do Not Know checkbox for Organization Name
    {
        form_key: "us_contact_org_na",
        label_texts: [""], // Label text associated with this checkbox
        api_keys: [], // State likely determined by data availability or explicit 'us_contact_org_na' key if API provides
        field_type: "checkbox",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[1]/div[2]/div[3]/div/span/span/input" } // ID from HTML snippet
    },
    
    
    // Relationship to You (for the contact person/organization)
    {
        form_key: "us_contact_relationship",
        label_texts: ["Relationship to You"], // Label text from the snippet
        api_keys: ["us_contact_relationship"], // API key from your Flask app
        field_type: "select",
        locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlUS_POC_REL_TO_APP" } // ID from HTML snippet
    },
    // Inside the formFieldMapping array...

// --- Mappings for US Contact Address Components ---
{
    form_key: "us_contact_address_street1", // Target field on the form
    //label_texts: ["U.S. Street Address (Line 1)"], // Label from HTML
    api_keys: ["us_contact_street_address"], // Filled by parsing 'us_contact_address'
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[3]/div/div/div[1]/input" } // ID from HTML
},
{
    form_key: "us_contact_address_city", // Target field
    //label_texts: ["City"],
    api_keys: ["us_contact_city"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[3]/div/div/div[3]/input" }
},
{
    form_key: "us_contact_address_state", // Target field
    //label_texts: ["State"],
    api_keys: ["us_contact_state"],
    field_type: "select", // State is a dropdown
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[3]/div/div/div[4]/select" }
},
{
    form_key: "us_contact_address_zip", // Target field
    //label_texts: ["ZIP Code"],
    api_keys: ["us_contact_zip"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[3]/div/div/div[5]/input" }
},

// --- Mappings for US Contact Phone and Email ---
{
    form_key: "us_contact_phone_number", // Target field for phone
    label_texts: [],
    api_keys: ["us_contact_phone"], // Filled by parsing 'us_contact_phone_and_email'
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[3]/div/div/div[6]/input" }
},
{
    form_key: "us_contact_email_na",
    label_texts: ["Does Not Apply"],
    api_keys: [],
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[3]/div/div/div[7]/div/div/div[2]/span/span/input" }
},
// Add these to your formFieldMapping array in content.js

// --- Father's Details ---
// Target field: Father's Surnames
{
    form_key: "father_surname_text", // Unique key for this mapping
    //label_texts: ["Surnames"], // Matches label in HTML for Father's section
    api_keys: ["father_surname"], // API provides 'father_surname' directly
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div/div[3]/fieldset[1]/div/div/div[1]/input" }
},
// Target field: Father's Given Names
{
    form_key: "father_given_name_text",
    //label_texts: ["Given Names"], // Matches label in HTML for Father's section
    api_keys: ["father_given_name"], // API provides 'father_given_name' directly
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div/div[3]/fieldset[1]/div/div/div[2]/input" }
},
{
    form_key: "mother_surname_text",
    //label_texts: ["Surnames"], // Label specifically for Mother's surname
    api_keys: ["mother_surname"], // API provides 'mother_surname' directly
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div/div[3]/fieldset[2]/div/div/div[1]/input" }
},
{
    form_key: "mother_given_name_text",
    //label_texts: ["Given Names"], // Label specifically for Mother's given name
    api_keys: ["mother_given_name"], // API provides 'mother_given_name' directly
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div/div[3]/fieldset[2]/div/div/div[2]/input" }
},
// Source field for Father's Date of Birth (from API)
{
    form_key: "father_dob_source",
    label_texts: [], // No direct label for source field
    api_keys: ["father_dob"], // API provides 'father_dob' (e.g., "YYYY-MM-DD")
    field_type: "hidden" // Indicates this holds data for other component fields
},
// Target field: Father's DOB Day
{
    form_key: "father_dob_day",
    label_texts: ["Day"], // Specific to Father's DOB section if form has multiple Day dropdowns
    api_keys: [], // Will be filled by parsing father_dob_source
    field_type: "select",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlFathersDOBDay" }
},
// Target field: Father's DOB Month
{
    form_key: "father_dob_month",
    label_texts: ["Month"], // Specific to Father's DOB section
    api_keys: [],
    field_type: "select",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlFathersDOBMonth" }
},
// Target field: Father's DOB Year
{
    form_key: "father_dob_year",
    label_texts: ["Year"], // Specific to Father's DOB section
    api_keys: [],
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxFathersDOBYear" }
},
// Target field: Is father in the U.S.?
{
    form_key: "father_in_us_radio",
    label_texts: ["Is your father in the U.S.?"],
    api_keys: ["father_in_us"], // API provides 'father_in_us' ("yes" or "no")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblFATHER_LIVE_IN_US_IND" }
},
{
    form_key: "mother_in_us_radio",
    label_texts: ["Is your mother in the U.S.?"],
    api_keys: ["mother_in_us"], // API provides 'mother_in_us' ("yes" or "no")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblMOTHER_LIVE_IN_US_IND" }
},
// Add these to your formFieldMapping array in content.js

// --- U.S. Relatives Information ---
{
    form_key: "immediate_relatives_in_us_radio", // Unique key for this mapping
    label_texts: ["Do you have any immediate relatives, not including parents, in the United States?"],
    api_keys: ["immediate_relatives_in_us"], // API provides 'immediate_relatives_in_us' ("yes" or "no")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblUS_IMMED_RELATIVE_IND" }
},
{
    form_key: "other_relatives_in_us_radio", // Unique key for this mapping
    label_texts: ["Do you have any other relatives in the United States?"],
    api_keys: ["other_relatives_in_us"], // API provides 'other_relatives_in_us' ("yes" or "no")
    field_type: "radio",
    locator: { type: "id", value: "ctl00$SiteContentPlaceHolder$FormView1$rblUS_OTHER_RELATIVE_IND"}
},
{
    form_key: "spouse_surname_text",
    label_texts: ["Spouse's Surnames"],
    api_keys: ["spouse_surname"], // From your API data
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxSpouseSurname" }
},
{
    form_key: "spouse_given_name_text",
    label_texts: ["Spouse's Given Names"],
    api_keys: ["spouse_given_name"], // From your API data
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxSpouseGivenName" }
},
{
    form_key: "spouse_pob_city_text",
    //label_texts: ["City"], // For Spouse's POB City
    api_keys: ["spouse_pob"], // Will be filled by parsing spouse_pob_source
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[1]/div[2]/div/div/div[1]/input" }
},
{
    form_key: "spouse_pob_country_select",
    label_texts: ["Country/Region"], // For Spouse's POB Country
    api_keys: ["spouse_pob"], // Will be filled by parsing spouse_pob_source
    field_type: "select",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlSpousePOBCountry" }
},
{
    form_key: "employer_school_name_text", // Changed form_key
    label_texts: ["Present Employer or School Name"],
    api_keys: ["current_employer_name"], // From your formData
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSchName" }
},
{
    form_key: "monthly_income_text",
    label_texts: ["Monthly Income in Local Currency (if employed)"],
    api_keys: ["monthly_income"], // From your formData
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxCURR_MONTHLY_SALARY" }
},
{
    form_key: "describe_duties_textarea",
    label_texts: ["Briefly describe your duties:"],
    api_keys: ["current_employer_duties"], // From your formData
    field_type: "textarea",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxDescribeDuties" }
},
{
    form_key: "mother_dob_source",
    label_texts: [], // No direct label for source field
    api_keys: ["mother_dob"], // API provides 'mother_dob' (e.g., "YYYY-MM-DD")
    field_type: "hidden" // Indicates this holds data for other component fields
},
// Target field: Mother's DOB Day
{
    form_key: "mother_dob_day",
    label_texts: ["Day"], // Specific to Mother's DOB section
    api_keys: [], // Will be filled by parsing mother_dob_source
    field_type: "select",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlMothersDOBDay" }
},
// Target field: Mother's DOB Month
{
    form_key: "mother_dob_month",
    label_texts: ["Month"], // Specific to Mother's DOB section
    api_keys: [],
    field_type: "select",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlMothersDOBMonth" }
},
// Target field: Mother's DOB Year
{
    form_key: "mother_dob_year",
    label_texts: ["Year"], // Specific to Mother's DOB section
    api_keys: [],
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxMothersDOBYear" }
},
{
    form_key: "spouse_dob_source",
    label_texts: ["Spouse's Date of Birth"],
    api_keys: ["spouse_dob"], // API provides 'spouse_dob' (e.g., "YYYY-MM-DD")
    field_type: "hidden"
},
// Target field: Spouse's DOB Day
{
    form_key: "spouse_dob_day",
    label_texts: ["Day"], // Contextually for Spouse's DOB
    api_keys: [], // Will be filled by parsing spouse_dob_source
    field_type: "select",
    // !!! CRITICAL: Verify this ID. If spouse has unique DOB fields, update this ID. !!!
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[1]/div[1]/div[3]/select[1]" }
},
// Target field: Spouse's DOB Month
{
    form_key: "spouse_dob_month",
    label_texts: ["Month"], // Contextually for Spouse's DOB
    api_keys: [],
    field_type: "select",
    // !!! CRITICAL: Verify this ID. If spouse has unique DOB fields, update this ID. !!!
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[1]/div[1]/div[3]/select[2]" }
},
// Target field: Spouse's DOB Year
{
    form_key: "spouse_dob_year",
    label_texts: ["Year"], // Contextually for Spouse's DOB
    api_keys: [],
    field_type: "text",
    // !!! CRITICAL: Verify this ID. If spouse has unique DOB fields, update this ID. !!!
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[1]/div[1]/div[3]/input[2]" }
},
{
    form_key: "employment_start_date_source",
    label_texts: ["Start Date"], // Label text from the snippet
    api_keys: ["current_employment_start_date"], // From formData (e.g., "01/08/2022 till date")
    field_type: "hidden"
},
// Target fields for Employment Start Date components
{
    form_key: "employment_start_date_day",
    label_texts: ["Day"], // Context: Employment Start Date
    api_keys: [],
    field_type: "select",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlEmpDateFromDay" }
},
{
    form_key: "employment_start_date_month",
    label_texts: ["Month"], // Context: Employment Start Date
    api_keys: [],
    field_type: "select",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlEmpDateFromMonth" }
},
{
    form_key: "employment_start_date_year",
    label_texts: ["Year"], // Context: Employment Start Date
    api_keys: [],
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxEmpDateFromYear" }
},

{
    form_key: "employer_school_address_source",
    api_keys: ["current_employer_address"], // From your formData
    field_type: "hidden" // This will be parsed by a helper function
},
// Target fields for parsed employer/school address
{
    form_key: "employer_school_street1_text",
    //label_texts: ["Street Address (Line 1)"], // Context: Employer/School
    api_keys: [], // To be filled by parsing 'employer_school_address_source'
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[1]/input" }
},
{
    form_key: "employer_school_street2_text",
    //label_texts: ["Street Address (Line 2)"], // Context: Employer/School
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[2]/input" }
},
{
    form_key: "employer_school_city_text",
    //label_texts: ["City"], // Context: Employer/School
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[3]/input" }
},
{
    form_key: "employer_school_state_text",
    //label_texts: ["State/Province"], // Context: Employer/School
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[4]/input[1]" }
},
{
    form_key: "employer_school_state_na_checkbox",
    label_texts: ["Does Not Apply"], // Context: Employer/School State
    api_keys: [], // Logic will handle this based on parsed state
    field_type: "checkbox",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_cbxWORK_EDUC_ADDR_STATE_NA" }
},
{
    form_key: "employer_school_postal_text",
    //label_texts: ["Postal Zone/ZIP Code"], // Context: Employer/School
    api_keys: [],
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxWORK_EDUC_ADDR_POSTAL_CD" }
},
{
    form_key: "employer_school_postal_na_checkbox",
    label_texts: ["Does Not Apply"], // Context: Employer/School Postal
    api_keys: [], // Logic will handle this
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[5]/span[3]/span/input" }
},
{
    form_key: "employer_school_country_select",
   // label_texts: ["Country/Region"], // Context: Employer/School
    api_keys: [], // Will be filled by parsing, or needs a dedicated API key if country is separate
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[7]/select" }
},
{
    form_key: "employer_school_phone_text",
    //label_texts: ["Phone Number"], // Context: Employer/School
    api_keys: ["current_employer_phone"], // ASSUMED API key. Your API needs to provide this, or it needs parsing from address.
                                        // Your formData does not currently show this key.
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[6]/input" }
},
{
    form_key: "previously_employed_radio",
    label_texts: ["Were you previously employed?"],
    api_keys: ["previous_employment"],
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblPreviouslyEmployed" }
},


// Add these to your formFieldMapping array in content.js

// --- "Were you previously employed?" Radio Button ---

// --- PREVIOUS EMPLOYER 1 ---
// Source fields (if you prefer to group data for parsing functions)

{
    form_key: "prev_emp_1_start_date_source",
    api_keys: ["prev_emp_1_start_date"], // API key for start date string of 1st employer
    field_type: "hidden"
},
{
    form_key: "prev_emp_1_end_date_source",
    api_keys: ["prev_emp_1_end_date"], // API key for end date string of 1st employer
    field_type: "hidden"
},

// Target fields for Previous Employer 1
{
    form_key: "prev_emp_1_name_text",
    //label_texts: ["Employer Name"], // Context: Previous Employer 1
    api_keys: ["prev_emp_1_name"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[1]/input" }
},
{
    form_key: "prev_emp_1_address_source",
    api_keys: ["prev_emp_1_address"], // API key for the full address string of 1st employer
    field_type: "hidden"
},
{
    form_key: "prev_emp_1_street1_text",
    api_keys: [], // Filled by parsing prev_emp_1_address_source
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[1]/input" }
},
{
    form_key: "prev_emp_1_street2_text",
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[2]/input" }
},
{
    form_key: "prev_emp_1_city_text",
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[3]/input" }
},
{
    form_key: "prev_emp_1_state_text",
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[4]/div/input" }
},
{
    form_key: "prev_emp_1_state_na_checkbox",
    api_keys: [],
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[4]/div/div/span/span/span/input" }
},
{
    form_key: "prev_emp_1_postal_text",
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[5]/div/input" }
},
{
    form_key: "prev_emp_1_postal_na_checkbox",
    api_keys: [],
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[5]/div/div/span/span/span/input" }
},
{
    form_key: "prev_emp_1_country_select",
    api_keys: [], // E.g., ["prev_emp_1_country_code_parsed_from_address"]
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[6]/select" } // HTML uses generic DropDownList2
},
{
    form_key: "prev_emp_1_phone_text",
    api_keys: ["prev_emp_1_phone"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[7]/input" }
},
{
    form_key: "prev_emp_1_job_title_text",
    api_keys: ["prev_emp_1_job_title"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/input[1]" }
},
{
    form_key: "prev_emp_1_supervisor_surname_unk",
    api_keys: [],
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[3]/span/span/input" }
},
{
    form_key: "prev_emp_1_supervisor_given_name_unk",
    api_keys: [],
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[4]/span/span/input" }
},
{
    form_key: "prev_emp_1_start_date_day",
    api_keys: [],
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[5]/div/select[1]" }
},
{
    form_key: "prev_emp_1_start_date_month",
    api_keys: [],
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[5]/div/select[2]" }
},
{
    form_key: "prev_emp_1_start_date_year",
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[5]/div/input" }
},
{
    form_key: "prev_emp_1_end_date_day",
    api_keys: [],
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[6]/div/select[1]" }
},
{
    form_key: "prev_emp_1_end_date_month",
    api_keys: [],
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[6]/div/select[2]" }
},
{
    form_key: "prev_emp_1_end_date_year",
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[6]/div/input" }
},
{
    form_key: "prev_emp_1_duties_textarea",
    api_keys: ["prev_emp_1_duties"],
    field_type: "textarea",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[7]/textarea" }
},

// --- Other Education Section ---
{
    form_key: "attended_secondary_education_radio",
    label_texts: ["Have you attended any educational institutions at a secondary level or above?"],
    api_keys: ["attended_secondary_education_or_above"], // ASSUMED API key ("yes" or "no")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblOtherEduc" }
},
// Mappings for the FIRST Educational Institution (dtlPrevEduc_ctl00_...)

{
    form_key: "education_1_address_source",
    api_keys: ["institution_address"],
    field_type: "hidden"
},
// Target fields for FIRST Educational Institution
{
    form_key: "education_1_name_text",
    api_keys: ["institution_name"], // Parsed from education_institute_address or highest_education_qualification
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/input[1]" }
},
{
    form_key: "education_1_street1_text",
    api_keys: [], // Parsed from education_institute_address
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/input[2]" }
},
{
    form_key: "education_1_street2_text",
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/input[3]" }
},
{
    form_key: "education_1_city_text",
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/input[4]" }
},
{
    form_key: "education_1_state_text",
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/div[1]/div/input" }
},
{
    form_key: "education_1_state_na_checkbox",
    api_keys: [],
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/div[1]/div/span[3]/span/input" }
},
{
    form_key: "education_1_postal_text",
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/div[2]/div/input" }
},
{
    form_key: "education_1_postal_na_checkbox",
    api_keys: [],
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/div[2]/div/span[3]/span/input" }
},
{
    form_key: "education_1_country_select",
    api_keys: [], // Parsed from address or a new API key like "education_1_country_code"
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/div[3]/select" }
},
{
    form_key: "education_1_course_text",
    api_keys: ["highest_qualification"], // Could use highest_education_qualification or a parsed portion
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/input[5]" }
},
// Education 1: Date of Attendance From components

{
    form_key: "education_1_start_date_source",
    api_keys: ["education_institute_start_date"],
    field_type: "hidden"
},
{
    form_key: "education_1_start_date_day", // Renamed for clarity
    api_keys: [],
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/div[4]/select[1]" }
},
{
    form_key: "education_1_start_date_month", // Renamed
    api_keys: [],
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/div[4]/select[2]" }
},
{
    form_key: "education_1_start_date_year", // Renamed
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/div[4]/input" }
},
// Education 1: Date of Attendance To components

{
    form_key: "education_1_end_date_source",
    api_keys: ["education_institute_end_date"],
    field_type: "hidden"
},
{
    form_key: "education_1_end_date_day", // Renamed
    api_keys: [],
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/div[5]/select[1]" }
},
{
    form_key: "education_1_end_date_month", // Renamed
    api_keys: [],
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/div[5]/select[2]" }
},
{
    form_key: "education_1_end_date_year", // Renamed
    api_keys: [],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/div[5]/input" }
},
// Add these to your formFieldMapping array in content.js

// --- Clan or Tribe ---
{
    form_key: "clan_or_tribe_radio",
    label_texts: ["Do you belong to a clan or tribe?"],
    api_keys: ["clan_or_tribe"], // From formData (e.g., "no")
                                 // processApiValue should convert to "Y" or "N"
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblCLAN_TRIBE_IND" }
},

// --- Countries Visited ---
{
    form_key: "countries_visited_radio",
    label_texts: ["Have you traveled to any countries/regions within the last five years?"],
    api_keys: ["countries_visited_last_5_years"], // If this string is non-empty and not "no", select "Yes".
                                                // processApiValue needs to handle this logic.
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblCOUNTRIES_VISITED_IND" }
},
{
    form_key: "countries_visited_1_select", // For the first language input
    api_keys: [], // This will be filled by the new helper, not directly by API key in main loop
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[3]/fieldset/div/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div/select" }
},
// If "Yes" is selected, a new section would appear for listing countries.

// --- Organization Contributions ---
{
    form_key: "organization_contributions_radio",
    label_texts: ["Have you belonged to, contributed to, or worked for any professional, social, or charitable organization?"],
    api_keys: ["organization_contributions"], // From formData (e.g., "no")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblORGANIZATION_IND" }
},
// Note: HTML for listing organizations if "Yes" is not provided.

// --- Specialized Skills ---
{
    form_key: "specialized_skills_radio",
    label_texts: ["Do you have any specialized skills or training, such as firearms, explosives, nuclear, biological, or chemical experience?"],
    api_keys: [""], // ASSUMED API key (expected "Yes" or "No")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblSPECIALIZED_SKILLS_IND" }
},

// --- Military Service ---
{
    form_key: "military_service_radio",
    label_texts: ["Have you ever served in the military?"],
    api_keys: ["served_in_military"], // ASSUMED API key (expected "Yes" or "No")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblMILITARY_SERVICE_IND" }
},
// Note: HTML for military details if "Yes" is not provided.

// --- Insurgent Organization Involvement ---
{
    form_key: "insurgent_org_radio",
    label_texts: ["Have you ever served in, been a member of, or been involved with a paramilitary unit, vigilante unit, rebel group, guerrilla group, or insurgent organization?"],
    api_keys: ["served_in_insurgent_org"], // ASSUMED API key (expected "Yes" or "No")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblINSURGENT_ORG_IND" }
},
// In formFieldMapping array:
{
    form_key: "language_1_name_text", // For the first language input
    label_texts: ["Language Name"], // Adjust if needed
    api_keys: [], // This will be filled by the new helper, not directly by API key in main loop
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_dtlLANGUAGES_ctl00_tbxLANGUAGE_NAME" }
},
// --- End of Additional Security Questions Mappings ---
// Add these to your formFieldMapping array in content.js

// --- Security and Background: Part 1 (Medical) ---
{
    form_key: "communicable_disease_radio",
    label_texts: ["Do you have a communicable disease of public health significance?"],
    api_keys: [""], // ASSUMED API key (e.g., "Yes" or "No")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblDisease" }
},
{
    form_key: "mental_physical_disorder_radio",
    label_texts: ["Do you have a mental or physical disorder that poses or is likely to pose a threat"], // Partial label match
    api_keys: [""], // ASSUMED API key (e.g., "Yes" or "No")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblDisorder" }
},
{
    form_key: "drug_abuser_addict_radio",
    label_texts: ["Are you or have you ever been a drug abuser or addict?"],
    api_keys: ["is_drug_abuser_addict"], // ASSUMED API key (e.g., "Yes" or "No")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblDruguser" }
},
// Add these to your formFieldMapping array in content.js

// --- Security and Background: Part 2 (Further Questions) ---
{
    form_key: "arrested_convicted_radio",
    label_texts: ["Have you ever been arrested or convicted for any offense or crime"], // Partial label match
    api_keys: [""], // ASSUMED API key (e.g., "Yes" or "No")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblArrested" }
},
{
    form_key: "controlled_substances_radio",
    label_texts: ["Have you ever violated, or engaged in a conspiracy to violate, any law relating to controlled substances?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblControlledSubstances" }
},
{
    form_key: "prostitution_vice_radio",
    label_texts: ["Are you coming to the United States to engage in prostitution or unlawful commercialized vice"], // Partial
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblProstitution" }
},
{
    form_key: "money_laundering_radio",
    label_texts: ["Have you ever been involved in, or do you seek to engage in, money laundering?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblMoneyLaundering" }
},
{
    form_key: "human_trafficking_offense_radio",
    label_texts: ["Have you ever committed or conspired to commit a human trafficking offense"], // Partial
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblHumanTrafficking" }
},
{
    form_key: "knowingly_aided_radio",
    label_texts: ["Have you ever knowingly aided, abetted, assisted or colluded with an individual who has committed, or conspired to commit a severe human trafficking offense in the United States or outside the United States?"], // Partial
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00_SiteContentPlaceHolder_FormView1_lblASSIST_PERSON_TRAFFIC_IND" }
},
{
    form_key: "human_trafficking_related_radio",
    label_texts: ["Are you the spouse, son, or daughter of an individual who has committed or conspired to commit a human trafficking offense"], // Partial
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblHumanTraffickingRelated" }
},
// Add these to your formFieldMapping array in content.js

// --- Security and Background: Part 3 (Further Questions from new snippet) ---
{
    form_key: "illegal_activity_radio",
    label_texts: ["Do you seek to engage in espionage, sabotage, export control violations, or any other illegal activity"], // Partial label match
    api_keys: [""], // ASSUMED API key (e.g., "Yes" or "No")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblIllegalActivity" }
},
{
    form_key: "terrorist_activity_radio",
    label_texts: ["Do you seek to engage in terrorist activities while in the United States or have you ever engaged in terrorist activities?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblTerroristActivity" }
},
{
    form_key: "terrorist_support_radio",
    label_texts: ["Have you ever or do you intend to provide financial assistance or other support to terrorists or terrorist organizations?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblTerroristSupport" }
},
{
    form_key: "terrorist_org_member_radio",
    label_texts: ["Are you a member or representative of a terrorist organization?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblTerroristOrg" }
},
{
    form_key: "genocide_participation_radio",
    label_texts: ["Have you ever ordered, incited, committed, assisted, or otherwise participated in genocide?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblGenocide" }
},
{
    form_key: "torture_participation_radio",
    label_texts: ["Have you ever committed, ordered, incited, assisted, or otherwise participated in torture?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblTorture" }
},
{
    form_key: "extrajudicial_killing_radio",
    label_texts: ["Have you committed, ordered, incited, assisted, or otherwise participated in extrajudicial killings, political killings, or other acts of violence?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblExViolence" }
},
{
    form_key: "child_soldiers_radio",
    label_texts: ["Have you ever engaged in the recruitment or the use of child soldiers?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblChildSoldier" }
},
{
    form_key: "religious_freedom_violation_radio",
    label_texts: ["Have you, while serving as a government official, been responsible for or directly carried out, at any time, particularly severe violations of religious freedom?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblReligiousFreedom" }
},
{
    form_key: "population_controls_radio",
    label_texts: ["Have you ever been directly involved in the establishment or enforcement of population controls"], // Partial
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblPopulationControls" }
},
{
    form_key: "coercive_transplantation_radio",
    label_texts: ["Have you ever been directly involved in the coercive transplantation of human organs or bodily tissue?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblTransplant" }
},
{
    form_key: "spouse_son_daughter_terrorist_activity_radio",
    label_texts: ["Are you the spouse, son, or daughter of an individual who has engaged in terrorist activity, including providing financial assistance or other support to terrorists or terrorist organizations, in the last five years?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00_SiteContentPlaceHolder_FormView1_lblTERROR_REL_IND" }
},
{
    form_key: "deported_radio",
    label_texts: ["Have you ever been removed or deported from any country?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblDeport" }
},
{
    form_key: "Sought_fraud_or_willful_misrepresentation_radio",
    label_texts: ["Have you ever sought to obtain or assist others to obtain a visa, entry into the United States, or any other United States immigration benefit by fraud or willful misrepresentation or other unlawful means?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_lblIMMGRATN_FRAUD_IND" }
},
// Add these to your formFieldMapping array in content.js

// --- Security and Background: Part 6 (Further Questions from new snippet) ---
{
    form_key: "withheld_child_custody_radio",
    label_texts: ["Have you ever withheld custody of a U.S. citizen child"], // Partial label match
    api_keys: [""], // ASSUMED API key (e.g., "Yes" or "No")
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblChildCustody" }
},
{
    form_key: "voting_violation_radio",
    label_texts: ["Have you voted in the United States in violation of any law or regulation?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblVotingViolation" }
},
{
    form_key: "renounced_citizenship_tax_radio",
    label_texts: ["Have you ever renounced United States citizenship for the purposes of avoiding taxation?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblRenounceExp" }
},
// --- End of Security and Background Mappings for this snippet ---
// --- End of Security and Background Mappings for this snippet ---
// --- End of Security and Background Mappings for this snippet ---
// --- End of Security and Background: Part 1 Mappings ---

// End of new mappings... (make sure this is inside the main array ']')
];

const hardcodedValues = {
    "country_of_birth": "IND",
    "full_name_native_na": true,
    // "sex": "MALE", // Commented out - let dynamic data fill if available
    // "place_of_issue": "NEW DELHI", // Commented out - let dynamic data fill if available
    "permanent_resident_other_country": "N",
    "other_names_used": "N",
    "has_telecode": "N",
    "ssn_na": true,
    "tax_id_na": true,
    "purpose_of_trip": "B",
    "purpose_specify": "B1-B2", // **VERIFY THIS VALUE ON THE LIVE FORM**
    "pob_state_na": true, // Force "Does Not Apply" for Place of Birth State
    "specific_travel_plans": "N", // Hardcode "Specific travel plans?" to No
    "traveling_as_organization": "N",
    "work_phone_na": true,
    "any_other_phone_numbers_used": "N",
    "any_other_email_used": "N",
    "presence_on_any_other_websites": "N",
    "passport_document_type": "R",
    "passport_book_number_na": true,
    "us_contact_org_na" : true,
    "us_contact_email_na": true,
    "prev_emp_1_supervisor_surname_unk": true,
    "prev_emp_1_supervisor_given_name_unk": true,
    "specialized_skills_radio": "N",
    "military_service_radio": "N",
    "insurgent_org_radio": "N",
    "clan_or_tribe_radio": "N",
    "communicable_disease_radio": "N",
    "mental_physical_disorder_radio": "N",
    "drug_abuser_addict_radio": "N",
    "arrested_convicted_radio": "N",
    "controlled_substances_radio": "N",
    "prostitution_vice_radio": "N",
    "money_laundering_radio": "N",
    "human_trafficking_offense_radio": "N",
    "knowingly_aided_radio": "N",
    "human_trafficking_related_radio": "N",
    "illegal_activity_radio": "N",
    "terrorist_activity_radio": "N",
    "terrorist_support_radio":"N",
    "terrorist_org_member_radio":"N",
    "genocide_participation_radio":"N",
    "torture_participation_radio":"N",
    "extrajudicial_killing_radio":"N",
    "child_soldiers_radio":"N",
    "religious_freedom_violation_radio":"N",
    "population_controls_radio":"N",
    "coercive_transplantation_radio":"N",
    "spouse_son_daughter_terrorist_activity_radio":"N",
    "deported_radio":"N",
    "Sought_fraud_or_willful_misrepresentation_radio":"N",
    "withheld_child_custody_radio":"N",
    "voting_violation_radio":"N",
    "renounced_citizenship_tax_radio":"N",
};

// --- Helper Functions ---

/**
 * Finds the corresponding DOM element(s) for a given mapping.
 */
function findElement(mapping) {
    let element = null;
    const { form_key, label_texts, locator, field_type } = mapping;

    // 1. Attempt using locator
    if (locator?.type && locator.value) { // Optional chaining for safety
        try {
            switch (locator.type) {
                case 'id':
                    element = document.getElementById(locator.value);
                    break;
                case 'name':
                    const elementsByName = document.getElementsByName(locator.value);
                    if (elementsByName?.length > 0) {
                        element = (field_type === 'radio') ? elementsByName : elementsByName[0];
                    }
                    break;
                case 'css':
                    element = document.querySelector(locator.value);
                    break;
                case 'xpath':
                    element = document.evaluate(locator.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    break;
                default:
                    console.warn(`Unknown locator type: ${locator.type} for key "${form_key}".`);
            }
        } catch (error) {
            console.error(`Error finding element using locator ${locator.type} = "${locator.value}" for key "${form_key}":`, error);
            element = null;
        }
    }

    // 2. Fallback to label matching if locator failed/absent
    if (!element && label_texts?.length > 0 && !(field_type === 'hidden' && !locator) && !(element instanceof NodeList)) {
        const labels = document.querySelectorAll('label, span'); // Include spans
        for (const label of labels) {
            if (label.nodeType === Node.ELEMENT_NODE && label.textContent) {
                const labelText = label.textContent.trim();
                if (labelText) {
                    const isMatch = label_texts.some(mappingText =>
                        labelText.toLowerCase().includes(mappingText.toLowerCase().trim())
                    );
                    if (isMatch) {
                        const foundControl = findControlForLabel(label);
                        if (foundControl) {
                            if (field_type === 'radio' && foundControl.name) {
                                const radioGroup = document.getElementsByName(foundControl.name);
                                if (radioGroup?.length > 0) {
                                    element = radioGroup;
                                    break;
                                }
                            } else {
                                element = foundControl;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    // Log if element not found (and wasn't expected to be hidden without locator)
    if (!element && !(field_type === 'hidden' && !locator)) {
         console.warn(`Could not find element for form key "${form_key}". Locator: ${JSON.stringify(locator)}, Labels: ${label_texts?.join(', ')}`);
    }
    return element;
}

/**
 * Finds the control associated with a given label element.
 */
function findControlForLabel(labelElement) {
    if (!labelElement) return null;
    const htmlFor = labelElement.getAttribute('for');
    if (htmlFor) {
        const elementById = document.getElementById(htmlFor);
        if (elementById) return elementById;
    }
    // Simplified checks - prioritize direct association or common patterns
    const nestedControl = labelElement.querySelector('input, select, textarea');
    if (nestedControl) return nestedControl;

    let sibling = labelElement.nextElementSibling;
    if (sibling && ['INPUT', 'SELECT', 'TEXTAREA'].includes(sibling.tagName)) return sibling;

    let parent = labelElement.parentElement;
    if(parent) {
        // Check sibling of parent
        let parentSibling = parent.nextElementSibling;
        if(parentSibling) {
            const controlInSibling = parentSibling.querySelector('input, select, textarea');
            if(controlInSibling) return controlInSibling;
        }
        // Check within parent if structure is <div>Label</div><div><input/></div>
        const controlInParent = parent.querySelector('input, select, textarea');
         if (controlInParent && controlInParent !== labelElement && parent.contains(controlInParent)) {
             return controlInParent;
         }
    }
    return null;
}


/**
 * Fills a specific form element (input, select, checkbox, radio) with a value.
 */
function fillElement(elementOrList, field_type, valueToFill, form_key, dataType) {
    let filled = false;
    try {
        switch (field_type) {
            case 'text':
            case 'textarea':
                const textElement = elementOrList;
                // Check if it's a valid input/textarea element before accessing properties
                if (textElement && (textElement.tagName === 'INPUT' || textElement.tagName === 'TEXTAREA') && textElement.type !== 'radio' && textElement.type !== 'checkbox') {
                    const stringValue = String(valueToFill);
                    if (textElement.value !== stringValue) {
                        textElement.value = stringValue;
                        console.log(`Set ${dataType} ${field_type} "${form_key}" to: "${stringValue}".`);
                        filled = true;
                        textElement.dispatchEvent(new Event('input', { bubbles: true }));
                        textElement.dispatchEvent(new Event('change', { bubbles: true }));
                    } else { filled = true; /* Already correct */ }
                } else { console.warn(`Cannot fill ${dataType} ${field_type} "${form_key}": Element invalid or null.`); }
                break;

            case 'select':
                const selectElement = elementOrList;
                if (selectElement?.tagName === 'SELECT') {
                    let optionFound = false;
                    const normalizedValue = String(valueToFill).trim().toLowerCase();
                    for (const option of selectElement.options) {
                        const normVal = option.value.trim().toLowerCase();
                        const normText = option.text.trim().toLowerCase();
                        // Match value OR text
                        if (normVal === normalizedValue || normText === normalizedValue) {
                            if (!option.selected) {
                                option.selected = true;
                                console.log(`Selected option "${option.value}" for ${dataType} select "${form_key}" (matched "${valueToFill}").`);
                                filled = true;
                                selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                            } else { filled = true; /* Already correct */ }
                            optionFound = true; break;
                        }
                    }
                    if (!optionFound) console.warn(`Could not find option matching "${normalizedValue}" for ${dataType} select "${form_key}".`);
                } else { console.warn(`Cannot fill ${dataType} select "${form_key}": Element invalid or null.`); }
                break;

                case 'checkbox':
                    const checkboxElement = elementOrList;
                    if (checkboxElement?.tagName === 'INPUT' && checkboxElement.type === 'checkbox') {
                        const checked = (typeof valueToFill === 'boolean' && valueToFill) ||
                                        (typeof valueToFill === 'string' && ['y', 'true', '1'].includes(valueToFill.toLowerCase()));
                        console.log(`DEBUG CHECKBOX: form_key="${form_key}", valueToFill="${valueToFill}" (type: ${typeof valueToFill}), determined checked state: ${checked}`);
                        if (checkboxElement.checked !== checked) {
                            checkboxElement.checked = checked; // Set the state directly
                            console.log(`Set ${dataType} checkbox "${form_key}" to: ${checked}.`);
                            filled = true;
    
                            // --- MODIFICATION: Conditionally dispatch click ---
                            // Avoid dispatching 'click' for potentially problematic checkboxes like passport_book_number_na
                            // to prevent triggering interfering onclick handlers. Still dispatch 'change'.
                            if (form_key !== 'passport_book_number_na') {
                               checkboxElement.dispatchEvent(new Event('click', { bubbles: true }));
                            }
                            checkboxElement.dispatchEvent(new Event('change', { bubbles: true }));
                            // --- END MODIFICATION ---
    
                        } else { filled = true; /* Already correct */ }
                    } else { console.warn(`Cannot fill ${dataType} checkbox "${form_key}": Element invalid or null.`); }
                    break;

            case 'radio':
                const radioButtons = elementOrList;
                if (radioButtons instanceof NodeList && radioButtons.length > 0) {
                    let radioSelected = false;
                    const stringValue = String(valueToFill);
                    for (const radio of radioButtons) {
                        if (radio.tagName === 'INPUT' && radio.type === 'radio' && radio.value === stringValue) {
                            if (!radio.checked) {
                                radio.checked = true;
                                radioSelected = true;
                                console.log(`Selected ${dataType} radio "${radio.value}" for group "${form_key}".`);
                                filled = true;
                                radio.dispatchEvent(new Event('click', { bubbles: true }));
                                radio.dispatchEvent(new Event('change', { bubbles: true }));
                            } else { radioSelected = true; filled = true; /* Already correct */ }
                            break;
                        }
                    }
                    if (!radioSelected) console.warn(`Could not find ${dataType} radio with value "${stringValue}" for group "${form_key}".`);
                } else { console.warn(`Cannot fill ${dataType} radio group "${form_key}": Invalid/empty element list.`); }
                break;

            default:
                console.warn(`Unsupported field type "${field_type}" for key "${form_key}" in fillElement.`);
        }
    } catch (error) {
        console.error(`Error in fillElement for key "${form_key}" with ${dataType} value "${valueToFill}":`, error);
        filled = false;
    }
    return filled;
}

// Place this with your other helper functions in content.js

// Add this function to your "Helper Functions" section in content.js

// Ensure this function definition is in your "Helper Functions" section,
// BEFORE fillForm or any code that calls it.

/**
 * Fills the details for the FIRST educational institution using direct API keys for name
 * and a combined address string. Handles parsing for address components.
 * @param {object} formData - The data object from the API.
 * @param {object} mappedElements - Object containing the mapped DOM elements for the form.
 */
function fillEducationalInstitution_1_Details(formData, mappedElements) {
    const institutionPrefix = "education_1"; // Specific for the first institution
    console.log(`[${institutionPrefix} Info] Attempting to fill educational institution details.`);
    let filledSomethingOverall = false;

    // 1. Fill Institution Name
    const nameMapping = formFieldMapping.find(m => m.form_key === `${institutionPrefix}_name_text`);
    const institutionName = nameMapping ? findValueFromApiKeys(formData, nameMapping.api_keys) : undefined;
    const nameElement = mappedElements[`${institutionPrefix}_name_text`];

    if (nameElement) {
        if (institutionName !== undefined && institutionName !== null && String(institutionName).trim() !== "") {
            console.log(`  [${institutionPrefix}] Filling Name: "${institutionName}"`);
            if (fillElement(nameElement, 'text', institutionName, `${institutionPrefix}_name_text`, 'dynamic')) {
                filledSomethingOverall = true;
            }
        } else {
            console.log(`  [${institutionPrefix}] No institution name from API. Clearing field.`);
            fillElement(nameElement, 'text', '', `${institutionPrefix}_name_text`, 'logic_clear');
        }
    } else {
        console.warn(`  [${institutionPrefix}] Element for "${institutionPrefix}_name_text" not found.`);
    }

    // 2. Parse and Fill Institution Address
    const addressSourceMapping = formFieldMapping.find(m => m.form_key === `${institutionPrefix}_address_source`); // Assuming you still have this for the address string
    const fullAddressString = addressSourceMapping ? findValueFromApiKeys(formData, addressSourceMapping.api_keys) : undefined;

    // Define keys for this institution's address components using the institutionPrefix
    const street1Key = `${institutionPrefix}_street1_text`;
    const street2Key = `${institutionPrefix}_street2_text`;
    const cityKey = `${institutionPrefix}_city_text`;
    const stateTextKey = `${institutionPrefix}_state_text`;
    const stateNaKey = `${institutionPrefix}_state_na_checkbox`;
    const postalTextKey = `${institutionPrefix}_postal_text`;
    const postalNaKey = `${institutionPrefix}_postal_na_checkbox`;
    const countryKey = `${institutionPrefix}_country_select`;

    if (!fullAddressString || typeof fullAddressString !== 'string' || fullAddressString.trim() === "") {
        console.warn(`[${institutionPrefix} Address] Address string is empty or invalid. Clearing fields & setting NAs.`);
        if (mappedElements[street1Key]) fillElement(mappedElements[street1Key], 'text', '', street1Key, 'logic_clear');
        if (mappedElements[street2Key]) fillElement(mappedElements[street2Key], 'text', '', street2Key, 'logic_clear');
        if (mappedElements[cityKey]) fillElement(mappedElements[cityKey], 'text', '', cityKey, 'logic_clear');
        if (mappedElements[stateTextKey]) fillElement(mappedElements[stateTextKey], 'text', '', stateTextKey, 'logic_clear');
        if (mappedElements[stateNaKey]) fillElement(mappedElements[stateNaKey], 'checkbox', true, stateNaKey, 'logic_set_na');
        if (mappedElements[postalTextKey]) fillElement(mappedElements[postalTextKey], 'text', '', postalTextKey, 'logic_clear');
        if (mappedElements[postalNaKey]) fillElement(mappedElements[postalNaKey], 'checkbox', true, postalNaKey, 'logic_set_na');
        const countryEl = mappedElements[countryKey];
        if (countryEl && countryEl.options?.length > 0) countryEl.selectedIndex = 0;
        return filledSomethingOverall; // Return based on whether name was filled
    }

    console.log(`  [${institutionPrefix} Address] Parsing: "${fullAddressString}"`);
    let addressParts = { street1: '', street2: '', city: '', state: '', postalCode: '', country: 'IND' }; // Default country
    let remainingAddress = fullAddressString.trim();

    // Simplified Address Parsing Logic (adapt as needed, especially for international addresses)
    const pinRegex = /\b(\d{6})\s*$/; // Indian PIN
    let match = remainingAddress.match(pinRegex);
    if (match) {
        addressParts.postalCode = match[1];
        remainingAddress = remainingAddress.substring(0, match.index).trim().replace(/,$/, '').trim();
    }

    const addressComponents = remainingAddress.split(',').map(s => s.trim()).filter(s => s);
    if (addressComponents.length > 0) {
        if (addressComponents.length > 1) {
            const potentialState = addressComponents.pop();
            if (potentialState.length > 2) addressParts.state = potentialState; else addrParts.push(potentialState);
        }
        if (addressComponents.length > 0) addressParts.city = addressComponents.pop();
        addressParts.street1 = addressComponents.join(', ').trim();
    } else if (remainingAddress) {
        addressParts.street1 = remainingAddress;
    }

    if (addressParts.street1 && addressParts.street1.length > 40) {
        let splitPoint = addressParts.street1.substring(0, 40).lastIndexOf(' ');
        if (splitPoint === -1 || splitPoint < 10) splitPoint = 40;
        addressParts.street2 = addressParts.street1.substring(splitPoint).trim();
        addressParts.street1 = addressParts.street1.substring(0, splitPoint).trim();
    }
    console.log(`  [${institutionPrefix} Addr] Parsed Parts: `, addressParts);

    // Fill address elements
    if (mappedElements[street1Key] && addressParts.street1) {
        if(fillElement(mappedElements[street1Key], 'text', addressParts.street1, street1Key, 'dynamic')) filledSomethingOverall = true;
    }
    if (mappedElements[street2Key]) {
        if(fillElement(mappedElements[street2Key], 'text', addressParts.street2 || '', street2Key, 'dynamic')) filledSomethingOverall = true;
    }
    if (mappedElements[cityKey] && addressParts.city) {
        if(fillElement(mappedElements[cityKey], 'text', addressParts.city, cityKey, 'dynamic')) filledSomethingOverall = true;
    }

    const stateElement = mappedElements[stateTextKey];
    const stateNaElement = mappedElements[stateNaKey];
    if (stateElement) {
        if (addressParts.state) {
            if(fillElement(stateElement, 'text', addressParts.state, stateTextKey, 'dynamic')) filledSomethingOverall = true;
            if (stateNaElement) fillElement(stateNaElement, 'checkbox', false, stateNaKey, 'logic');
        } else if (stateNaElement) {
            fillElement(stateElement, 'text', '', stateTextKey, 'logic_clear');
            fillElement(stateNaElement, 'checkbox', true, stateNaKey, 'logic_set_na');
        }
    } else if (stateNaElement){
        fillElement(stateNaElement, 'checkbox', true, stateNaKey, 'logic_set_na_no_text_field');
    }

    const postalElement = mappedElements[postalTextKey];
    const postalNaElement = mappedElements[postalNaKey];
    if (postalElement) {
        if (addressParts.postalCode) {
            if(fillElement(postalElement, 'text', addressParts.postalCode, postalTextKey, 'dynamic')) filledSomethingOverall = true;
            if (postalNaElement) fillElement(postalNaElement, 'checkbox', false, postalNaKey, 'logic');
        } else if (postalNaElement) {
            fillElement(postalElement, 'text', '', postalTextKey, 'logic_clear');
            fillElement(postalNaElement, 'checkbox', true, postalNaKey, 'logic_set_na');
        }
    } else if (postalNaElement) {
         fillElement(postalNaElement, 'checkbox', true, postalNaKey, 'logic_set_na_no_text_field');
    }

    const countryElement = mappedElements[countryKey];
    if (countryElement && addressParts.country) {
        if(fillElement(countryElement, 'select', addressParts.country, countryKey, 'dynamic')) filledSomethingOverall = true;
    }
    
    // Course of Study and Attendance Dates are not handled by this specific function
    // as their mappings were not included in your latest request for this section.
    // They would be handled by other direct API keys or other parsing functions.

    return filledSomethingOverall;
}

/**
 * Parses a comma-separated string of languages and fills the first language field.
 * @param {string} languagesString - The string from formData.languages_spoken.
 * @param {object} mappedElements - Object containing mapped DOM elements.
 * @param {string} languageFieldKey - The form_key for the first language input field (e.g., "language_1_name_text").
 */
function parseAndFillLanguagesSpoken(languagesString, mappedElements, languageFieldKey) {
    console.log(`[Languages Spoken] Attempting to parse: "${languagesString}"`);
    const languageInputElement = mappedElements[languageFieldKey];

    if (!languageInputElement) {
        console.warn(`[Languages Spoken] Element for key "${languageFieldKey}" not found.`);
        return false;
    }

    if (languagesString && typeof languagesString === 'string' && languagesString.trim() !== "" && languagesString.toLowerCase() !== "no" && languagesString.toLowerCase() !== "none") {
        const languagesArray = languagesString.split(',').map(lang => lang.trim()).filter(lang => lang);
        if (languagesArray.length > 0) {
            const firstLanguage = languagesArray[0];
            console.log(`  [Languages Spoken] Filling first language: "${firstLanguage}"`);
            fillElement(languageInputElement, 'text', firstLanguage, languageFieldKey, 'dynamic');
            if (languagesArray.length > 1) {
                console.warn(`  [Languages Spoken] Multiple languages found ("${languagesString}"). Only the first ("${firstLanguage}") was filled. Further languages require "Add Another" logic.`);
            }
            return true;
        } else {
            console.log(`  [Languages Spoken] No valid languages found after parsing "${languagesString}". Clearing field.`);
            fillElement(languageInputElement, 'text', '', languageFieldKey, 'logic_clear');
        }
    } else {
        console.log(`  [Languages Spoken] No languages provided or input indicates none. Clearing field.`);
        fillElement(languageInputElement, 'text', '', languageFieldKey, 'logic_clear');
    }
    return false;
}
/**
 * Handles the "Have you traveled to any countries/regions within the last five years?" radio
 * and fills the first country in the list if applicable.
 * @param {string} countriesVisitedString - The string from formData.countries_visited_last_5_years
 * (e.g., "Malaysia, vietnam", "no", or empty).
 * @param {object} mappedElements - Object containing mapped DOM elements.
 */
function parseAndFillCountriesVisited(countriesVisitedString, mappedElements) {
    console.log(`[Countries Visited] Processing string: "${countriesVisitedString}"`);
    let actionPerformed = false;

    const radioKey = 'countries_visited_radio';
    const firstCountryDropdownKey = 'countries_visited_1_select';

    const radioGroupElement = mappedElements[radioKey];
    const firstCountryDropdownElement = mappedElements[firstCountryDropdownKey];

    if (!radioGroupElement) {
        console.warn(`[Countries Visited] Radio group element for key "${radioKey}" not found.`);
        return false; // Cannot proceed without the radio button
    }

    let selectYesRadio = false;
    let countriesArray = [];

    if (countriesVisitedString && typeof countriesVisitedString === 'string') {
        const lowerVal = countriesVisitedString.toLowerCase().trim();
        if (lowerVal !== "" && lowerVal !== "no" && lowerVal !== "none") {
            selectYesRadio = true;
            countriesArray = countriesVisitedString.split(',')
                                .map(country => country.trim())
                                .filter(country => country);
            console.log(`  [Countries Visited] Parsed countries:`, countriesArray);
        }
    }

    const radioValueToSet = selectYesRadio ? "Y" : "N";
    console.log(`  [Countries Visited] Setting radio "${radioKey}" to: "${radioValueToSet}"`);
    if (fillElement(radioGroupElement, 'radio', radioValueToSet, radioKey, 'dynamic')) {
        actionPerformed = true;
    }

    // If "Yes" was selected and there are countries to list for the first dropdown
    if (selectYesRadio && countriesArray.length > 0 && firstCountryDropdownElement) {
        const firstCountryName = countriesArray[0];
        console.log(`  [Countries Visited] Attempting to select first country: "${firstCountryName}" in dropdown "${firstCountryDropdownKey}"`);
        if (fillElement(firstCountryDropdownElement, 'select', firstCountryName, firstCountryDropdownKey, 'dynamic')) {
            actionPerformed = true;
            if (countriesArray.length > 1) {
                console.warn(`  [Countries Visited] Filled first country ("${firstCountryName}"). Remaining countries ("${countriesArray.slice(1).join(', ')}") require "Add Another" logic not implemented in this basic function.`);
            }
        } else {
            console.warn(`  [Countries Visited] Could not select "${firstCountryName}" in dropdown "${firstCountryDropdownKey}". Check if the country name/code exists in the dropdown options.`);
        }
    } else if (selectYesRadio && countriesArray.length === 0) {
        console.log(`  [Countries Visited] Radio set to "Yes", but no countries were parsed from the string: "${countriesVisitedString}". First country dropdown will not be filled.`);
    } else if (selectYesRadio && !firstCountryDropdownElement) {
        console.warn(`  [Countries Visited] Radio set to "Yes", but element for key "${firstCountryDropdownKey}" not found.`);
    }

    return actionPerformed;
}

/**
 * Parses a previous employer's address string and fills the component fields.
 * Handles State/Province NA and Postal/ZIP NA checkboxes.
 * @param {string} fullAddressString - The complete address string from the API.
 * @param {string} employerPrefix - e.g., "prev_emp_1" or "prev_emp_2".
 * @param {object} mappedElements - Object containing the mapped DOM elements for the form.
 */
function parseAndFillPreviousEmployerAddress(fullAddressString, employerPrefix, mappedElements) {
    console.log(`[${employerPrefix} Addr] Attempting to parse: "${fullAddressString}"`);
    if (!fullAddressString || typeof fullAddressString !== 'string' || fullAddressString.trim() === "") {
        console.warn(`[${employerPrefix} Addr] Address string is empty or invalid. Setting NA checkboxes and clearing fields.`);
        // Define keys for this employer's address components
        const street1Key = `${employerPrefix}_street1_text`;
        const street2Key = `${employerPrefix}_street2_text`;
        const cityKey = `${employerPrefix}_city_text`;
        const stateKey = `${employerPrefix}_state_text`;
        const stateNaKey = `${employerPrefix}_state_na_checkbox`;
        const postalKey = `${employerPrefix}_postal_text`;
        const postalNaKey = `${employerPrefix}_postal_na_checkbox`;
        const countryKey = `${employerPrefix}_country_select`;

        // Clear fields and check NA where applicable
        if (mappedElements[street1Key]) fillElement(mappedElements[street1Key], 'text', '', street1Key, 'logic_clear');
        if (mappedElements[street2Key]) fillElement(mappedElements[street2Key], 'text', '', street2Key, 'logic_clear');
        if (mappedElements[cityKey]) fillElement(mappedElements[cityKey], 'text', '', cityKey, 'logic_clear');
        if (mappedElements[stateKey]) fillElement(mappedElements[stateKey], 'text', '', stateKey, 'logic_clear');
        if (mappedElements[stateNaKey]) fillElement(mappedElements[stateNaKey], 'checkbox', true, stateNaKey, 'logic_set_na');
        if (mappedElements[postalKey]) fillElement(mappedElements[postalKey], 'text', '', postalKey, 'logic_clear');
        if (mappedElements[postalNaKey]) fillElement(mappedElements[postalNaKey], 'checkbox', true, postalNaKey, 'logic_set_na');
        if (mappedElements[countryKey] && mappedElements[countryKey].options.length > 0) mappedElements[countryKey].selectedIndex = 0;

        return 0;
    }

    let filledCount = 0;
    const address = { street1: '', street2: '', city: '', state: '', postalCode: '', country: '' };
    let remainingAddress = fullAddressString.trim();

    // Heuristic parsing: This will need adjustment for various international address formats.
    // This example prioritizes finding elements from right-to-left of a comma-separated address.

    // 1. Attempt to extract Postal Code (common patterns: 5-10 alphanumeric chars, may include hyphen or space)
    // This regex is very broad; more specific ones per country are better if possible.
    const postalRegex = /([A-Z0-9\s-]{3,10})\s*$/i;
    let match = remainingAddress.match(postalRegex);
    if (match && /\d/.test(match[1])) { // Check if it contains at least one digit
        address.postalCode = match[1].trim();
        remainingAddress = remainingAddress.substring(0, match.index).trim().replace(/,$/, '').trim();
        console.log(`  [${employerPrefix} Addr] Extracted Postal: "${address.postalCode}"`);
    } else {
        console.log(`  [${employerPrefix} Addr] Postal code not clearly extracted.`);
    }

    // 2. Attempt to extract Country (if dropdown exists, try to match; otherwise, assume last significant part)
    const countryElement = mappedElements[`${employerPrefix}_country_select`];
    const partsForCountry = remainingAddress.split(',').map(p => p.trim()).filter(p => p);
    if (partsForCountry.length > 0) {
        const potentialCountry = partsForCountry[partsForCountry.length - 1];
        let countryMatched = false;
        if (countryElement) {
            for (const option of countryElement.options) {
                if (option.text.toUpperCase() === potentialCountry.toUpperCase() || option.value.toUpperCase() === potentialCountry.toUpperCase()) {
                    address.country = option.value; // Use the option's value attribute
                    partsForCountry.pop();
                    remainingAddress = partsForCountry.join(', ').trim();
                    countryMatched = true;
                    console.log(`  [${employerPrefix} Addr] Matched Country in dropdown: "${address.country}" for "${potentialCountry}"`);
                    break;
                }
            }
        }
        if (!countryMatched && potentialCountry.length > 3 && potentialCountry.split(" ").length <= 3) { // Heuristic if no dropdown match or no dropdown
            // If it wasn't matched in dropdown but looks like a country name
            address.country = potentialCountry; // Store it; fillElement will try to match by text
            partsForCountry.pop();
            remainingAddress = partsForCountry.join(', ').trim();
            console.log(`  [${employerPrefix} Addr] Tentatively Extracted Country: "${address.country}"`);
        }
    }
     if (!address.country && address.postalCode && address.postalCode.match(/^\d{6}$/)) { // Default for Indian PIN
        address.country = "IND";
        console.log(`  [${employerPrefix} Addr] Defaulted country to IND based on PIN format.`);
    }


    // 3. Re-split remaining for City and State
    const remainingPartsAfterCountry = remainingAddress.split(',').map(p => p.trim()).filter(p => p);
    if (remainingPartsAfterCountry.length > 0) {
        if (remainingPartsAfterCountry.length > 1) { // Assume last is state, one before is city
            address.state = remainingPartsAfterCountry.pop();
            console.log(`  [${employerPrefix} Addr] Extracted State: "${address.state}"`);
        }
        if (remainingPartsAfterCountry.length > 0) {
            address.city = remainingPartsAfterCountry.pop();
            console.log(`  [${employerPrefix} Addr] Extracted City: "${address.city}"`);
        }
        address.street1 = remainingPartsAfterCountry.join(', ').trim();
    } else if (remainingAddress) {
        address.street1 = remainingAddress; // Whatever is left is street
    }


    // Split street1 if too long (e.g., for a 40-char limit)
    if (address.street1 && address.street1.length > 40) {
        let splitPoint = address.street1.substring(0, 40).lastIndexOf(' ');
        if (splitPoint === -1 || splitPoint < 10) splitPoint = 40; // Avoid tiny first lines
        address.street2 = address.street1.substring(splitPoint).trim();
        address.street1 = address.street1.substring(0, splitPoint).trim();
        console.log(`  [${employerPrefix} Addr] Street address split: S1="${address.street1}", S2="${address.street2}"`);
    }

    console.log(`  [${employerPrefix} Addr] Final Parsed Parts:`, address);

    // Fill form elements
    if (mappedElements[`${employerPrefix}_street1_text`] && address.street1) {
        if(fillElement(mappedElements[`${employerPrefix}_street1_text`], 'text', address.street1, `${employerPrefix}_street1_text`, 'dynamic')) filledCount++;
    }
    if (mappedElements[`${employerPrefix}_street2_text`]) { // Fill even if empty to clear previous
        if(fillElement(mappedElements[`${employerPrefix}_street2_text`], 'text', address.street2 || '', `${employerPrefix}_street2_text`, 'dynamic')) filledCount++;
    }
    if (mappedElements[`${employerPrefix}_city_text`] && address.city) {
        if(fillElement(mappedElements[`${employerPrefix}_city_text`], 'text', address.city, `${employerPrefix}_city_text`, 'dynamic')) filledCount++;
    }

    const stateTextEl = mappedElements[`${employerPrefix}_state_text`];
    const stateNaEl = mappedElements[`${employerPrefix}_state_na_checkbox`];
    if (stateTextEl) {
        if (address.state) {
            if(fillElement(stateTextEl, 'text', address.state, `${employerPrefix}_state_text`, 'dynamic')) filledCount++;
            if (stateNaEl) fillElement(stateNaEl, 'checkbox', false, `${employerPrefix}_state_na_checkbox`, 'logic');
        } else if (stateNaEl) { // No state parsed, check NA
            fillElement(stateTextEl, 'text', '', `${employerPrefix}_state_text`, 'logic_clear');
            fillElement(stateNaEl, 'checkbox', true, `${employerPrefix}_state_na_checkbox`, 'logic_set_na');
        }
    }

    const postalTextEl = mappedElements[`${employerPrefix}_postal_text`];
    const postalNaEl = mappedElements[`${employerPrefix}_postal_na_checkbox`];
    if (postalTextEl) {
        if (address.postalCode) {
            if(fillElement(postalTextEl, 'text', address.postalCode, `${employerPrefix}_postal_text`, 'dynamic')) filledCount++;
            if (postalNaEl) fillElement(postalNaEl, 'checkbox', false, `${employerPrefix}_postal_na_checkbox`, 'logic');
        } else if (postalNaEl) {
            fillElement(postalTextEl, 'text', '', `${employerPrefix}_postal_text`, 'logic_clear');
            fillElement(postalNaEl, 'checkbox', true, `${employerPrefix}_postal_na_checkbox`, 'logic_set_na');
        }
    }

    const countrySelEl = mappedElements[`${employerPrefix}_country_select`];
    if (countrySelEl && address.country) {
        if(fillElement(countrySelEl, 'select', address.country, `${employerPrefix}_country_select`, 'dynamic')) filledCount++;
    }

    return filledCount;
}

/**
 * Parses a date string, prioritizing DD-MM-YYYY format.
 * @param {string} dateString - The date string to parse.
 * @returns {Date|null} A Date object or null if parsing fails.
 */
function parseDateString(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;

    // 1. Try DD-MM-YYYY format (MOST EXPECTED)
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString)) {
        const parts = dateString.split('-');
        // Construct as<y_bin_46>-MM-DD for reliability with Date constructor
        const isoString = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        const date = new Date(isoString);
        // Basic validation
        const [day, month, year] = parts.map(Number);
         if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return date;
        }
    }

    // 2. Try<y_bin_46>-MM-DD format (Common alternative)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateString)) {
        const date = new Date(dateString);
        const [year, month, day] = dateString.split('-').map(Number);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return date;
        }
    }

    // 3. Try dd/mm/yyyy format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
        const parts = dateString.split('/');
        const isoString = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        const date = new Date(isoString);
        const [day, month, year] = parts.map(Number);
         if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return date;
        }
    }

    // 4. Try "Day[th] Month Year" format (Less likely if primary is DD-MM-YYYY)
    const cleanedDateString = dateString.replace(/(\d+)(st|nd|rd|th)/, '$1');
    let date = new Date(cleanedDateString);
    if (!isNaN(date.getTime())) {
        return date;
    }


    console.warn(`Could not parse date string: "${dateString}" with supported formats (DD-MM-YYYY,<y_bin_46>-MM-DD, dd/mm/yyyy, Day Month Year).`);
    return null;
}


/**
 * Gets the 3-letter month abbreviation (uppercase) for a given month number (1-12).
 */
function getMonthAbbreviation(monthNumber) {
    const num = parseInt(monthNumber, 10);
    if (isNaN(num) || num < 1 || num > 12) return null;
    const abbreviations = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return abbreviations[num - 1];
}


/**
 * Parses a date string and fills the corresponding day, month, year elements.
 * Adapts to month dropdown using abbreviations (JAN) or numbers (1).
 */
function parseAndFillDateComponents(dateString, dateKeyPrefix, mappedElements) {
    let filledCount = 0;
    const date = parseDateString(dateString); // Use the updated parser

    if (!date) {
        console.warn(`Could not parse date for key prefix "${dateKeyPrefix}": "${dateString}"`);
        return 0;
    }

    const day = date.getDate(); // 1-31
    const month = date.getMonth() + 1; // 1-12
    const year = date.getFullYear();

    const dayElement = mappedElements[`${dateKeyPrefix}_day`];
    const monthElement = mappedElements[`${dateKeyPrefix}_month`];
    const yearElement = mappedElements[`${dateKeyPrefix}_year`];

    // Fill Day
    if (dayElement) {
        const dayValue = String(day).padStart(2, '0');
        if (fillElement(dayElement, 'select', dayValue, `${dateKeyPrefix}_day`, 'dynamic')) {
            filledCount++;
        }
    } else console.warn(`${dateKeyPrefix}_day element not found.`);

    // Fill Month
    if (monthElement) {
        let monthValueToUse = getMonthAbbreviation(month); // Try abbreviation first (e.g., "MAR")
        if (!monthValueToUse) { // Fallback if abbreviation not found (shouldn't happen for 1-12)
            console.warn(`Could not get month abbreviation for month ${month} for ${dateKeyPrefix}. Falling back to numeric.`);
            monthValueToUse = String(month).padStart(2, '0'); // e.g., "03"
        }

        if (fillElement(monthElement, 'select', monthValueToUse, `${dateKeyPrefix}_month`, 'dynamic')) {
            filledCount++;
        } else {
            // If abbreviation match failed, try with zero-padded number as a last resort
            // This is useful if fillElement's text match fails and value match is needed for "01", "02" etc.
            console.log(`Retrying month selection for ${dateKeyPrefix} with numeric value.`);
            monthValueToUse = String(month).padStart(2, '0');
            if (fillElement(monthElement, 'select', monthValueToUse, `${dateKeyPrefix}_month`, 'dynamic')) {
                filledCount++;
            }
        }
    } else console.warn(`${dateKeyPrefix}_month element not found.`);


    // Fill Year
    if (yearElement) {
         if (fillElement(yearElement, 'text', String(year), `${dateKeyPrefix}_year`, 'dynamic')) {
             filledCount++;
         }
    } else console.warn(`${dateKeyPrefix}_year element not found.`);

    return filledCount;
}

/**
 * Calculates the length of stay and the appropriate unit.
 */
function calculateLengthOfStay(arrivalDateString, departureDateString) {
    const arrivalDate = parseDateString(arrivalDateString);
    const departureDate = parseDateString(departureDateString);

    if (!arrivalDate || !departureDate || departureDate <= arrivalDate) {
        console.warn("Invalid or non-sequential arrival/departure dates for LOS calculation.", { arrival: arrivalDateString, departure: departureDateString });
        return null;
    }
    const diffTime = Math.abs(departureDate - arrivalDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 365) return { value: Math.floor(diffDays / 365), unit: 'Y' };
    if (diffDays >= 30) return { value: Math.floor(diffDays / 30.44), unit: 'M' }; // Use avg days/month
    if (diffDays >= 7) return { value: Math.floor(diffDays / 7), unit: 'W' };
    return { value: diffDays, unit: 'D' };
}

/**
 * Processes the raw value from the API before filling.
 */
function processApiValue(value, field_type, form_key) {
    let processedValue = value; // Start with original value

    // --- Specific Mapping for Payer Dropdown ---
    if (form_key === 'trip_payer_entity' && typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        // Map common text values to the required option values
        const payerMap = {
            "self": "S",
            "other person": "O",
            "other": "O", // Handle variations
            "present employer": "P",
            "employer in the u.s.": "U",
            "other company/organization": "C"
        };
        // Use the mapped value if found, otherwise keep the original value
        processedValue = payerMap[lowerValue] ?? value;
        if (processedValue !== value && !payerMap[lowerValue]) {
             console.warn(`Could not map dynamic value "${value}" for "${form_key}". Using original.`);
        }
    }
    // --- Specific Logic for Travel Companions Radio ---
    else if (form_key === 'other_persons_traveling') {
        // Determine 'Y' or 'N' based on whether the 'travel_companions' data is present and not explicitly 'no'
        if (value && typeof value === 'string' && value.trim().toLowerCase() !== 'no' && value.trim() !== '') {
            processedValue = 'Y';
        } else if (value && typeof value !== 'string' && value !== null && value !== undefined) {
             processedValue = 'Y';
        }
        else {
            processedValue = 'N';
        }
        console.log(`Processed travel_companions value "${value}" to radio value "${processedValue}"`);
    }
    // --- Generic Logic for other Radio Buttons (Yes/No to Y/N) ---
    // Added specific checks for previous travel/visa questions
    else if (['prev_us_travel', 'prev_visa_issued', 'prev_visa_refused', 'iv_petition_filed'].includes(form_key) && typeof value === 'string') {
         const lowerValue = value.toLowerCase();
         // Check for variations of yes/no, presence of details often implies "yes"
         if (lowerValue === 'yes' || (lowerValue !== 'no' && value.trim() !== '')) {
              processedValue = 'Y';
         } else {
              processedValue = 'N';
         }
         console.log(`Processed ${form_key} value "${value}" to radio value "${processedValue}"`);
    }
    else if (field_type === 'radio' && typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'yes') processedValue = 'Y';
        else if (lowerValue === 'no') processedValue = 'N';
    }

    return processedValue;
}
/**
* Finds the first available value from formData corresponding to a list of API keys.
 * @param {object} formData - The data object from the API.
 * @param {string[]} apiKeys - An array of potential API keys to check in formData.
 * @param {boolean} [requireNonEmptyString=false] - If true, and the found value is a string, it will be skipped if it's empty after trimming.
 * @returns {*} The value found, or undefined if no key matches or value is unsuitable.
 */
function findValueFromApiKeys(formData, apiKeys, requireNonEmptyString = false) {
    if (!formData || !apiKeys || apiKeys.length === 0) {
        // console.warn("findValueFromApiKeys: formData or apiKeys are invalid.", { formData, apiKeys });
        return undefined;
    }
    for (const key of apiKeys) {
        if (Object.prototype.hasOwnProperty.call(formData, key) && formData[key] !== null && formData[key] !== undefined) {
            if (requireNonEmptyString && typeof formData[key] === 'string' && formData[key].trim() === '') {
                continue; // Skip empty strings if required
            }
            return formData[key];
        }
    }
    return undefined;
}

/**
 * Handles filling a Parent's Date of Birth components and its "Do Not Know" checkbox.
 * @param {string} dobString - The parent's DOB string (e.g., "YYYY-MM-DD") from the API.
 * @param {string} parentPrefix - e.g., "father", "mother", "spouse".
 * @param {object} mappedElements - Object containing the mapped DOM elements.
 */
function handleParentDOB(dobString, parentPrefix, mappedElements) {
    console.log(`[${parentPrefix} DOB Handler] Called with dobString: "${dobString}" (type: ${typeof dobString})`);
    const dobUnkElement = mappedElements[`${parentPrefix}_dob_unk`];
    const dayElement = mappedElements[`${parentPrefix}_dob_day`];
    const monthElement = mappedElements[`${parentPrefix}_dob_month`];
    const yearElement = mappedElements[`${parentPrefix}_dob_year`];

    const setDateFieldsDisabled = (disabled) => {
        if (dayElement) dayElement.disabled = disabled;
        if (monthElement) monthElement.disabled = disabled;
        if (yearElement) yearElement.disabled = disabled;
    };

    if (!dobString || String(dobString).trim() === "" || String(dobString).trim().toLowerCase() === "unknown") {
        console.log(`[${parentPrefix} DOB Handler] DOB string is empty or "unknown". Checking 'Do Not Know'.`);
        if (dobUnkElement) fillElement(dobUnkElement, 'checkbox', true, `${parentPrefix}_dob_unk`, 'logic_unk_due_to_empty_dob');
        setDateFieldsDisabled(true);
        if (dayElement && dayElement.options?.length > 0) dayElement.selectedIndex = 0;
        if (monthElement && monthElement.options?.length > 0) monthElement.selectedIndex = 0;
        if (yearElement) yearElement.value = '';
        return;
    }

    console.log(`[${parentPrefix} DOB Handler] Attempting to parse and fill DOB from: "${dobString}"`);
    const filledDateParts = parseAndFillDateComponents(dobString, `${parentPrefix}_dob`, mappedElements);
    console.log(`[${parentPrefix} DOB Handler] parseAndFillDateComponents returned: ${filledDateParts}`);

    if (filledDateParts > 0) {
        console.log(`[${parentPrefix} DOB Handler] Successfully filled parts for DOB. Unchecking 'Do Not Know'.`);
        if (dobUnkElement) fillElement(dobUnkElement, 'checkbox', false, `${parentPrefix}_dob_unk`, 'logic_unk_due_to_filled_dob');
        setDateFieldsDisabled(false);
    } else {
        console.warn(`[${parentPrefix} DOB Handler] Failed to parse/fill DOB: "${dobString}". Checking 'Do Not Know'.`);
        if (dobUnkElement) fillElement(dobUnkElement, 'checkbox', true, `${parentPrefix}_dob_unk`, 'logic_unk_due_to_parse_fail');
        setDateFieldsDisabled(true);
    }
}

/**
 * Attempts to parse a US address string into components.
 * IMPROVED to be more robust.
 * @param {string} fullAddress - The complete address string.
 * @returns {object|null} An object with keys like street1, street2, city, state, zip, or null.
 */
function parseUSAddress(fullAddress) {
    if (!fullAddress || typeof fullAddress !== 'string') return null;

    console.log(`Parsing US Address: "${fullAddress}"`);
    const address = { street1: null, street2: null, city: null, state: null, zip: null };

    // US States mapping (Abbreviation -> Abbreviation, Full Name -> Abbreviation)
    const usStates = { AL: 'AL', ALABAMA: 'AL', AK: 'AK', ALASKA: 'AK', AZ: 'AZ', ARIZONA: 'AZ', AR: 'AR', ARKANSAS: 'AR', CA: 'CA', CALIFORNIA: 'CA', CO: 'CO', COLORADO: 'CO', CT: 'CT', CONNECTICUT: 'CT', DE: 'DE', DELAWARE: 'DE', DC: 'DC', 'DISTRICT OF COLUMBIA': 'DC', FL: 'FL', FLORIDA: 'FL', GA: 'GA', GEORGIA: 'GA', HI: 'HI', HAWAII: 'HI', ID: 'ID', IDAHO: 'ID', IL: 'IL', ILLINOIS: 'IL', IN: 'IN', INDIANA: 'IN', IA: 'IA', IOWA: 'IA', KS: 'KS', KANSAS: 'KS', KY: 'KY', KENTUCKY: 'KY', LA: 'LA', LOUISIANA: 'LA', ME: 'ME', MAINE: 'ME', MD: 'MD', MARYLAND: 'MD', MA: 'MA', MASSACHUSETTS: 'MA', MI: 'MI', MICHIGAN: 'MI', MN: 'MN', MINNESOTA: 'MN', MS: 'MS', MISSISSIPPI: 'MS', MO: 'MO', MISSOURI: 'MO', MT: 'MT', MONTANA: 'MT', NE: 'NE', NEBRASKA: 'NE', NV: 'NV', NEVADA: 'NV', NH: 'NH', 'NEW HAMPSHIRE': 'NH', NJ: 'NJ', 'NEW JERSEY': 'NJ', NM: 'NM', 'NEW MEXICO': 'NM', NY: 'NY', 'NEW YORK': 'NY', NC: 'NC', 'NORTH CAROLINA': 'NC', ND: 'ND', 'NORTH DAKOTA': 'ND', OH: 'OH', OHIO: 'OH', OK: 'OK', OKLAHOMA: 'OK', OR: 'OR', OREGON: 'OR', PA: 'PA', PENNSYLVANIA: 'PA', RI: 'RI', 'RHODE ISLAND': 'RI', SC: 'SC', 'SOUTH CAROLINA': 'SC', SD: 'SD', 'SOUTH DAKOTA': 'SD', TN: 'TN', TENNESSEE: 'TN', TX: 'TX', TEXAS: 'TX', UT: 'UT', UTAH: 'UT', VT: 'VT', VERMONT: 'VT', VA: 'VA', VIRGINIA: 'VA', WA: 'WA', WASHINGTON: 'WA', WV: 'WV', 'WEST VIRGINIA': 'WV', WI: 'WI', WISCONSIN: 'WI', WY: 'WY', WYOMING: 'WY', AS: 'AS', 'AMERICAN SAMOA': 'AS', GU: 'GU', GUAM: 'GU', MP: 'MP', 'NORTHERN MARIANA ISLANDS': 'MP', PR: 'PR', 'PUERTO RICO': 'PR', VI: 'VI', 'VIRGIN ISLANDS': 'VI' };

    // Regex for ZIP code (5 or 5-4 digits), potentially anywhere but often last
    const zipRegex = /\b(\d{5})(?:[-\s]?(\d{4}))?\b/;
    let remainingAddress = fullAddress;

    // Extract ZIP code
    const zipMatch = remainingAddress.match(zipRegex);
    if (zipMatch) {
        address.zip = zipMatch[1] + (zipMatch[2] ? `-${zipMatch[2]}` : ''); // Format as 12345 or 12345-6789
        remainingAddress = remainingAddress.replace(zipMatch[0], '').trim(); // Remove ZIP from string
        console.log(`  Found ZIP: ${address.zip}`);
    } else {
        console.warn("  Could not reliably identify ZIP code.");
    }

    // Extract State (Abbreviation or Full Name) - look near the end
    remainingAddress = remainingAddress.replace(/[-,.\s]+$/, '').trim(); // Clean trailing chars
    let potentialCityStateParts = remainingAddress.split(/,|\s+/).filter(p => p); // Split and remove empty

    // Check last 1, 2, or 3 parts for state name/abbr
    for (let i = Math.min(potentialCityStateParts.length, 3); i >= 1; i--) {
        const potentialState = potentialCityStateParts.slice(-i).join(' ').toUpperCase();
        if (usStates[potentialState]) {
            address.state = usStates[potentialState]; // Store the abbreviation
            // Remove the state parts from the end
            potentialCityStateParts.splice(-i);
            remainingAddress = potentialCityStateParts.join(' ').trim();
            console.log(`  Found State: ${address.state} (matched "${potentialState}")`);
            break;
        }
    }
     if (!address.state) {
         console.warn("  Could not reliably identify State.");
     }

    // Extract City (Usually the part before the State/ZIP)
    remainingAddress = remainingAddress.replace(/[-,.\s]+$/, '').trim(); // Clean again
    const cityParts = remainingAddress.split(/,|\s+/).filter(p => p); // Split remaining by comma or space
    if (cityParts.length > 0) {
         // Assume the last part is the city after removing state/zip
         address.city = cityParts.pop();
         remainingAddress = cityParts.join(' ').trim(); // What's left is street address
         console.log(`  Found City: ${address.city}`);
    } else {
        console.warn("  Could not reliably identify City.");
    }


    // Assign remaining string to Street Address lines
    // Basic split by common unit designators (case-insensitive)
    // This assumes the unit designator is the *last* part of street2 if present
    const streetRegex = /^(.*?)\s+(APT|UNIT|STE|#)\s*(.*)$/i;
    const streetMatch = remainingAddress.match(streetRegex);

    if (streetMatch) {
        address.street1 = streetMatch[1]?.trim() || null; // Part before designator
        address.street2 = (streetMatch[2] + " " + streetMatch[3]).trim(); // Designator + rest
    } else {
        // If no unit designator found, assign whole remaining part to street1
        address.street1 = remainingAddress.trim() || null;
        address.street2 = null;
    }

    console.log(`  Assigned Street 1: ${address.street1}`);
    if(address.street2) console.log(`  Assigned Street 2: ${address.street2}`);


    console.log("  Final Parsed Address:", address);
    return address;
}


/**
 * Parses a full US address string and fills the component fields.
 * @param {string} fullAddress - The complete address string from the API.
 * @param {object} mappedElements - The object containing found form elements.
 * @returns {number} Count of address fields successfully filled.
 */
function parseAndFillUSAddress(fullAddress, mappedElements) {
    let filledCount = 0;
    const parsed = parseUSAddress(fullAddress);

    if (!parsed) {
        console.warn("US Address parsing failed.");
        return 0;
    }

    // Fill individual components
    const fieldsToFill = [
        { key: 'us_address_street1', value: parsed.street1, type: 'text' },
        { key: 'us_address_street2', value: parsed.street2, type: 'text' },
        { key: 'us_address_city', value: parsed.city, type: 'text' },
        { key: 'us_address_state', value: parsed.state, type: 'select' }, // State is a dropdown
        { key: 'us_address_zip', value: parsed.zip, type: 'text' }
    ];

    fieldsToFill.forEach(field => {
        if (field.value) { // Only attempt to fill if parsing yielded a value
            const element = mappedElements[field.key];
            if (element) {
                // Add try-catch around individual fillElement calls for address parts
                try {
                    if (fillElement(element, field.type, field.value, field.key, 'dynamic')) {
                        filledCount++;
                    }
                } catch (error) {
                     console.error(`Error filling address component "${field.key}":`, error);
                }
            } else {
                console.warn(`Element not found for US address component: "${field.key}"`);
            }
        }
    });

    return filledCount;
}

/**
* Splits a full name into surname and given names.
* Basic implementation: assumes last word is surname.
* @param {string} fullName - The full name string.
* @returns {{surname: string|null, givenName: string|null}}
*/
function splitFullName(fullName) {
    if (!fullName || typeof fullName !== 'string') {
        return { surname: null, givenName: null };
    }
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) {
        return { surname: null, givenName: null };
    }
    if (parts.length === 1) {
        return { surname: null, givenName: parts[0] }; // Assume only given name if one word
    }
    const surname = parts.pop(); // Last part as surname
    const givenName = parts.join(' '); // Rest as given name
    return { surname, givenName };
}

/**
* Parses the travel_companions string and fills the first companion's details.
* @param {string} companionsString - The string from the API (e.g., "Name1 (Relation1)\nName2").
* @param {object} mappedElements - The object containing found form elements.
* @returns {number} Count of companion fields successfully filled for the first companion.
*/
function parseAndFillTravelCompanions(companionsString, mappedElements) {
    if (!companionsString || typeof companionsString !== 'string') return 0;

    const companions = companionsString.split('\n').map(s => s.trim()).filter(s => s);
    if (companions.length === 0) return 0;

    console.log(`Found ${companions.length} travel companion entries.`);
    const firstCompanionString = companions[0];
    let filledCount = 0;

    // Basic parsing: Try to find relationship in parentheses, otherwise assume full name
    let fullName = firstCompanionString;
    let relationship = null; // Default relationship
    const relationMatch = firstCompanionString.match(/\(([^)]+)\)$/); // Look for (Relation) at the end

    if (relationMatch) {
        relationship = relationMatch[1].trim(); // Extract text within parentheses
        fullName = firstCompanionString.replace(relationMatch[0], '').trim(); // Remove relation part from name
        console.log(`Parsed companion: Name="${fullName}", Relationship="${relationship}"`);
    } else {
        console.log(`Parsed companion: Name="${fullName}", Relationship=null (defaulting)`);
        // Default relationship if not found - use 'OTHER' as it's common
        relationship = 'OTHER'; // Or 'O' if that's the value in the dropdown
    }

    // Split the full name
    const { surname, givenName } = splitFullName(fullName);

    // Map relationship text to dropdown value (case-insensitive)
    const relationshipMap = {
        "parent": "P", "spouse": "S", "child": "C",
        "other relative": "R", "friend": "F",
        "business associate": "B", "other": "O"
    };
    const relationshipValue = relationshipMap[relationship?.toLowerCase()] || 'O'; // Default to 'OTHER' value

    // Fill the fields for the first companion
    const fieldsToFill = [
        { key: 'companion_surname_1', value: surname, type: 'text' },
        { key: 'companion_given_name_1', value: givenName, type: 'text' },
        { key: 'companion_relationship_1', value: relationshipValue, type: 'select' }
    ];

    fieldsToFill.forEach(field => {
        if (field.value) {
            const element = mappedElements[field.key];
            if (element) {
                try {
                    if (fillElement(element, field.type, field.value, field.key, 'dynamic')) {
                        filledCount++;
                    }
                } catch (error) {
                     console.error(`Error filling companion component "${field.key}":`, error);
                }
            } else {
                console.warn(`Element not found for companion component: "${field.key}"`);
            }
        }
    });

    // Log if more companions need manual entry
    if (companions.length > 1) {
        console.warn(`Filled details for the first travel companion (${fullName}). Please manually add the remaining ${companions.length - 1} companions using the 'Add Another' button.`);
    }

    return filledCount > 0; // Return true if any part of the first companion was filled
}

/**
* Parses the Home Address string and fills the component fields.
* Prioritizes filling Street 1 and Postal Code. Assumes country is India.
* Leaves City and State blank and checks their 'Does Not Apply' boxes.
* @param {string} fullAddress - The complete address string from the API.
* @param {object} mappedElements - The object containing found form elements.
* @returns {number} Count of address fields successfully filled.
*/
function parseAndFillHomeAddress(fullAddress, mappedElements) {
    if (!fullAddress || typeof fullAddress !== 'string') {
        console.warn("Home Address string is empty or invalid.");
        return 0;
    }
    console.log(`Parsing Home Address: "${fullAddress}"`);
    let filledCount = 0;
    let remainingAddressForStreet1 = fullAddress.trim();
    let pinCode = null;
    let city = null;
    const MAX_STREET1_LENGTH = 38; // Max length for Street Address Line 1

    // Attempt to extract 6-digit PIN code from the end
    const pinRegex = /\b(\d{6})\b$/;
    const pinMatch = remainingAddressForStreet1.match(pinRegex);
    if (pinMatch) {
        pinCode = pinMatch[1];
        remainingAddressForStreet1 = remainingAddressForStreet1.substring(0, pinMatch.index).trim().replace(/[,.\s]+$/, '');
        console.log(`  Found PIN Code: ${pinCode}`);
    } else {
        console.warn("  Could not reliably identify 6-digit PIN code at the end of home address.");
    }

    // Attempt to extract City (last word before PIN, if PIN was found, or last word otherwise)
    if (remainingAddressForStreet1) {
        const addressParts = remainingAddressForStreet1.split(/\s+/);
        if (addressParts.length > 0) {
            let potentialCity = addressParts.pop();
            if (addressParts.length > 0 && addressParts[addressParts.length - 1].toLowerCase() === 'post') {
                addressParts.pop(); // Remove "post" if it's before the city
            }
            city = potentialCity;
            remainingAddressForStreet1 = addressParts.join(' ').trim();
            console.log(`  Attempted City Extraction: "${city}"`);
        }
    }

    // --- Fill Fields ---
    const street1Element = mappedElements['home_address_street1'];
    const street2Element = mappedElements['home_address_street2'];
    const cityElement = mappedElements['home_address_city'];
    const postalCodeElement = mappedElements['home_address_postal'];
    const countryElement = mappedElements['home_address_country'];
    const stateNaElement = mappedElements['home_address_state_na'];
    const postalNaElement = mappedElements['home_address_postal_na'];

    // Fill Street Address 1 and 2
    if (street1Element && remainingAddressForStreet1) {
        let street1Value = remainingAddressForStreet1;
        let street2Value = "";

        if (remainingAddressForStreet1.length > MAX_STREET1_LENGTH) {
            let splitIndex = remainingAddressForStreet1.substring(0, MAX_STREET1_LENGTH).lastIndexOf(' ');
            if (splitIndex === -1 || splitIndex < MAX_STREET1_LENGTH / 2) { // If no space or space is too early, just truncate
                splitIndex = MAX_STREET1_LENGTH;
            }
            street1Value = remainingAddressForStreet1.substring(0, splitIndex).trim();
            street2Value = remainingAddressForStreet1.substring(splitIndex).trim();
            console.log(`  Street address too long, splitting: Line 1="${street1Value}", Line 2="${street2Value}"`);
        }

        try {
            if (fillElement(street1Element, 'text', street1Value, 'home_address_street1', 'dynamic')) {
                filledCount++;
            }
            if (street2Element && street2Value) { // Only fill street 2 if there's content for it
                if (fillElement(street2Element, 'text', street2Value, 'home_address_street2', 'dynamic')) {
                    filledCount++;
                }
            } else if (street2Element) {
                street2Element.value = ''; // Ensure it's empty if no overflow
            }
        } catch (error) { console.error(`Error filling home_address_street1/2:`, error); }
    }


    // Fill City if found
    if (cityElement && city) {
        try {
            if (fillElement(cityElement, 'text', city, 'home_address_city', 'dynamic')) {
                filledCount++;
            }
        } catch (error) { console.error(`Error filling home_address_city:`, error); }
    }


    // Fill Postal Code if found
    let postalFilled = false;
    if (postalCodeElement && pinCode) {
        try {
            if (fillElement(postalCodeElement, 'text', pinCode, 'home_address_postal', 'dynamic')) {
                filledCount++;
                postalFilled = true;
            }
        } catch (error) { console.error(`Error filling home_address_postal:`, error); }
    }

    // Fill Country (Defaulting to INDIA - adjust if API provides country)
    if (countryElement) {
        try {
            // Assuming 'IND' is the correct value for India in the dropdown
            if (fillElement(countryElement, 'select', 'IND', 'home_address_country', 'dynamic')) {
                filledCount++;
            }
        } catch (error) { console.error(`Error filling home_address_country:`, error); }
    }

    // Handle "Does Not Apply" checkboxes
    // Check State NA (since we are not filling the state field)
    if (stateNaElement) {
        try {
            // Always check NA for state since we don't parse it from home_address
            fillElement(stateNaElement, 'checkbox', true, 'home_address_state_na', 'dynamic');
        } catch (error) { console.error(`Error checking home_address_state_na:`, error); }
    }
    // Check/Uncheck Postal NA based on whether we filled the postal code
    if (postalNaElement) {
         try {
            // Check NA only if postal code was NOT filled
            fillElement(postalNaElement, 'checkbox', !postalFilled, 'home_address_postal_na', 'dynamic');
         } catch (error) { console.error(`Error setting home_address_postal_na:`, error); }
    }

    // Leave State blank as it's not reliably parsed

    return filledCount;
}

/**
 * Fills the Present Employer or School Name field.
 * @param {object} formData - The data object from the API.
 * @param {object} mappedElements - Object containing the mapped DOM elements.
 */
function parseAndFillEmployerSchoolName(formData, mappedElements) {
    console.log("[Employer/School Name] Attempting to fill...");
    const mapping = formFieldMapping.find(m => m.form_key === 'employer_school_name_text');
    if (!mapping) {
        console.warn("[Employer/School Name] Mapping not found for 'employer_school_name_text'.");
        return;
    }

    const employerNameValue = findValueFromApiKeys(formData, mapping.api_keys);
    const element = mappedElements['employer_school_name_text'];

    if (!element) {
        console.warn("[Employer/School Name] HTML element not found for 'employer_school_name_text'.");
        return;
    }

    if (employerNameValue !== undefined && employerNameValue !== null) {
        // If API provides an empty string, we'll fill it. If it's null/undefined, we treat as "not provided".
        const valueToFill = String(employerNameValue); // Ensure it's a string
        console.log(`[Employer/School Name] API value: "${valueToFill}"`);
        fillElement(element, 'text', valueToFill, 'employer_school_name_text', 'dynamic');
    } else {
        console.log("[Employer/School Name] No data provided by API for 'current_employer_name'. Clearing field.");
        fillElement(element, 'text', '', 'employer_school_name_text', 'logic_clear'); // Clear if no data
    }
}

/**
 * Parses the Employer/School address string and fills the component fields.
 * Handles State NA and Postal NA checkboxes.
 * @param {string} fullAddress - The complete address string from the API.
 * @param {object} mappedElements - The object containing found form elements.
 * @returns {number} Count of address fields successfully filled.
 */
function parseAndFillEmployerSchoolAddress(fullAddress, mappedElements) {
    if (!fullAddress || typeof fullAddress !== 'string' || fullAddress.trim() === "") {
        console.warn("[Employer/School Address] Address string is empty or invalid. Handling NA checkboxes.");
        const street1El = mappedElements['employer_school_street1_text'];
        const street2El = mappedElements['employer_school_street2_text'];
        const cityEl = mappedElements['employer_school_city_text'];
        const stateTextEl = mappedElements['employer_school_state_text'];
        const stateNaEl = mappedElements['employer_school_state_na_checkbox'];
        const postalTextEl = mappedElements['employer_school_postal_text'];
        const postalNaEl = mappedElements['employer_school_postal_na_checkbox'];
        const countryEl = mappedElements['employer_school_country_select'];

        if (street1El) fillElement(street1El, 'text', '', 'employer_school_street1_text', 'logic_clear');
        if (street2El) fillElement(street2El, 'text', '', 'employer_school_street2_text', 'logic_clear');
        if (cityEl) fillElement(cityEl, 'text', '', 'employer_school_city_text', 'logic_clear');
        if (stateTextEl) fillElement(stateTextEl, 'text', '', 'employer_school_state_text', 'logic_clear');
        if (stateNaEl) fillElement(stateNaEl, 'checkbox', true, 'employer_school_state_na_checkbox', 'logic_set_na');
        if (postalTextEl) fillElement(postalTextEl, 'text', '', 'employer_school_postal_text', 'logic_clear');
        if (postalNaEl) fillElement(postalNaEl, 'checkbox', true, 'employer_school_postal_na_checkbox', 'logic_set_na');
        if (countryEl && countryEl.options.length > 0) countryEl.selectedIndex = 0; // Reset country

        return 0;
    }
    console.log(`[Employer/School Address] Parsing: "${fullAddress}"`);
    let filledCount = 0;
    let addressParts = {
        street1: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'IND' // Defaulting to India, adjust if country info is in address string or from API
    };

    let remainingAddress = fullAddress.trim();

    // Attempt to extract Indian PIN code (6 digits from the end)
    const pinRegex = /\b(\d{6})\s*$/;
    let match = remainingAddress.match(pinRegex);
    if (match) {
        addressParts.postalCode = match[1];
        remainingAddress = remainingAddress.substring(0, match.index).trim().replace(/,$/, '').trim();
        console.log("  [Emp Addr] Extracted Postal (IND):", addressParts.postalCode);
    }

    // Attempt to extract State then City (common for Indian addresses: ..., City, State, PIN)
    const addressComponents = remainingAddress.split(',').map(s => s.trim()).filter(s => s);
    if (addressComponents.length > 0) {
        if (addressComponents.length > 1) { // Potentially State and City available
            const potentialState = addressComponents.pop();
            if (potentialState.length > 2 && potentialState.toUpperCase() !== addressParts.city?.toUpperCase()) { // Basic check
                addressParts.state = potentialState;
                console.log("  [Emp Addr] Extracted State:", addressParts.state);
                if (addressComponents.length > 0) {
                    addressParts.city = addressComponents.pop();
                    console.log("  [Emp Addr] Extracted City (after state):", addressParts.city);
                }
            } else { // Assume it was city or part of city
                addressParts.city = potentialState;
                 console.log("  [Emp Addr] Extracted City (no clear state after it):", addressParts.city);
            }
        } else if (addressComponents.length === 1 && !addressParts.city) { // Only one part left, could be city
            addressParts.city = addressComponents.pop();
            console.log("  [Emp Addr] Extracted City (single remaining part):", addressParts.city);
        }
        addressParts.street1 = addressComponents.join(', ').trim();
    } else if (!addressParts.city && remainingAddress) { // No commas, but text remains
         addressParts.street1 = remainingAddress; // Could be street, or city if address is very short
         console.log("  [Emp Addr] No commas found, remaining treated as street1:", addressParts.street1);
    }


    if (addressParts.street1 && addressParts.street1.length > 40) {
        let splitPoint = addressParts.street1.substring(0, 40).lastIndexOf(' ');
        if (splitPoint === -1 || splitPoint < 10) splitPoint = 40;
        addressParts.street2 = addressParts.street1.substring(splitPoint).trim();
        addressParts.street1 = addressParts.street1.substring(0, splitPoint).trim();
    }

    console.log("  [Emp Addr] Final Parsed: ", addressParts);

    // Fill elements
    if (mappedElements['employer_school_street1_text'] && addressParts.street1) {
        if(fillElement(mappedElements['employer_school_street1_text'], 'text', addressParts.street1, 'employer_school_street1_text', 'dynamic')) filledCount++;
    }
    if (mappedElements['employer_school_street2_text'] && addressParts.street2) {
        if(fillElement(mappedElements['employer_school_street2_text'], 'text', addressParts.street2, 'employer_school_street2_text', 'dynamic')) filledCount++;
    }
    if (mappedElements['employer_school_city_text'] && addressParts.city) {
        if(fillElement(mappedElements['employer_school_city_text'], 'text', addressParts.city, 'employer_school_city_text', 'dynamic')) filledCount++;
    }

    const stateElement = mappedElements['employer_school_state_text'];
    const stateNaElement = mappedElements['employer_school_state_na_checkbox'];
    if (stateElement && addressParts.state) {
        if(fillElement(stateElement, 'text', addressParts.state, 'employer_school_state_text', 'dynamic')) filledCount++;
        if (stateNaElement) fillElement(stateNaElement, 'checkbox', false, 'employer_school_state_na_checkbox', 'logic');
    } else if (stateNaElement) {
        if (stateElement) fillElement(stateElement, 'text', '', 'employer_school_state_text', 'logic_clear');
        fillElement(stateNaElement, 'checkbox', true, 'employer_school_state_na_checkbox', 'logic_set_na');
    }

    const postalElement = mappedElements['employer_school_postal_text'];
    const postalNaElement = mappedElements['employer_school_postal_na_checkbox'];
    if (postalElement && addressParts.postalCode) {
        if(fillElement(postalElement, 'text', addressParts.postalCode, 'employer_school_postal_text', 'dynamic')) filledCount++;
        if (postalNaElement) fillElement(postalNaElement, 'checkbox', false, 'employer_school_postal_na_checkbox', 'logic');
    } else if (postalNaElement) {
        if (postalElement) fillElement(postalElement, 'text', '', 'employer_school_postal_text', 'logic_clear');
        fillElement(postalNaElement, 'checkbox', true, 'employer_school_postal_na_checkbox', 'logic_set_na');
    }

    const countryElement = mappedElements['employer_school_country_select'];
    if (countryElement && addressParts.country) {
        if(fillElement(countryElement, 'select', addressParts.country, 'employer_school_country_select', 'dynamic')) filledCount++;
    }

    return filledCount;
}

/**
 * Parses the social_media_presence string and fills the platform and identifier fields.
 * @param {string} socialMediaString - The string from the API (e.g., "Facebook – Amar Venkat", "NONE", or empty).
 * @param {object} mappedElements - The object containing found form elements.
 * @returns {boolean} True if any social media field was successfully filled, false otherwise.
 */
function parseAndFillSocialMedia(socialMediaString, mappedElements) {
    if (!socialMediaString || typeof socialMediaString !== 'string') {
        console.log("No social media presence string provided or string is invalid.");
        const platformElement = mappedElements['social_media_platform_1'];
        if (platformElement) {
            fillElement(platformElement, 'select', 'NONE', 'social_media_platform_1', 'dynamic');
            const identifierElement = mappedElements['social_media_identifier_1'];
            if (identifierElement && identifierElement.type === 'text') {
                identifierElement.value = '';
                identifierElement.disabled = true;
            }
        }
        return false;
    }

    const lowerSocialMediaString = socialMediaString.trim().toLowerCase();
    let platformValue = 'NONE'; // Default to NONE
    let identifierValue = '';
    let filledSomething = false;

    console.log(`Parsing Social Media: "${socialMediaString}"`);

    const platformMap = {
        "ask.fm": "ASKF", "askfm": "ASKF", "douban": "DUBN", "facebook": "FCBK",
        "flickr": "FLKR", "google+": "GOGL", "google plus": "GOGL", "instagram": "INST",
        "linkedin": "LINK", "myspace": "MYSP", "pinterest": "PTST", "qzone": "QZNE",
        "qq": "QZNE", "reddit": "RDDT", "sina weibo": "SWBO", "weibo": "SWBO",
        "tencent weibo": "TWBO", "tumblr": "TUMB", "twitter": "TWIT", "twoo": "TWOO",
        "vine": "VINE", "vkontakte": "VKON", "vk": "VKON", "youku": "YUKU",
        "youtube": "YTUB", "none": "NONE"
    };

    if (lowerSocialMediaString === "no" || lowerSocialMediaString === "none" || lowerSocialMediaString === "") {
        platformValue = "NONE";
    } else {
        const parts = socialMediaString.split(/\s*–\s*|\s*-\s*/); // Split by ' – ' or ' - '
        if (parts.length >= 2) {
            const platformName = parts[0].trim().toLowerCase();
            identifierValue = parts.slice(1).join(' ').trim();
            platformValue = platformMap[platformName] || 'SONE'; // Default to "Select One" if not mapped
            if (platformValue === 'SONE' && platformName !== '') {
                console.warn(`Unmapped social media platform: "${parts[0].trim()}". Defaulting to "Select One".`);
            }
        } else if (parts.length === 1 && parts[0].trim() !== '') {
            const potentialPlatformName = parts[0].trim().toLowerCase();
            if (platformMap[potentialPlatformName]) {
                platformValue = platformMap[potentialPlatformName];
                identifierValue = '';
            } else {
                platformValue = 'NONE'; // Assume it's an identifier if platform not recognized
                identifierValue = parts[0].trim();
                console.warn(`Could not identify platform for "${parts[0].trim()}". Assuming identifier, setting platform to NONE.`);
            }
        }
    }

    const platformElement = mappedElements['social_media_platform_1'];
    const identifierElement = mappedElements['social_media_identifier_1'];

    if (platformElement) {
        if (fillElement(platformElement, 'select', platformValue, 'social_media_platform_1', 'dynamic')) {
            filledSomething = true;
        }
    } else {
        console.warn("Social media platform dropdown element not found.");
    }

    if (identifierElement) {
        if (platformValue !== 'NONE' && platformValue !== 'SONE' && identifierValue) {
            identifierElement.disabled = false;
            if (fillElement(identifierElement, 'text', identifierValue, 'social_media_identifier_1', 'dynamic')) {
                filledSomething = true;
            }
        } else {
            identifierElement.value = '';
            identifierElement.disabled = true;
        }
    } else {
        console.warn("Social media identifier text input element not found.");
    }
    return filledSomething;
}


// --- Main Filling Functions ---

/**
 * Fills the form using dynamic data received from the API/message.
 */
function fillForm(formData, mappedElements) {
    console.log("Attempting to fill form with dynamic data...");
    let fieldsFilledCount = 0;
    let arrivalDateStr = null;
    let departureDateStr = null;
    //let spouseDOBStr = null;
    // let usStayAddressStr = null; // Not used directly, usAddressValue is used
    // let homeAddressStr = null; // Not used directly, homeAddressValue is used
    let pobStateNaValue = undefined; // Store the value for POB NA checkbox
    // let travelCompanionsStr = null; // Not used directly, companionsValue is used

    // --- First Pass: Handle interdependent fields like POB State NA ---


    // --- Second Pass: Fill remaining fields and gather data for parsing ---
    for (const mapping of formFieldMapping) {
        const { form_key, api_keys, field_type } = mapping;

        if (Object.hasOwnProperty.call(hardcodedValues, form_key)) {
            continue;
        }

        const specialKeys = ['dob', 'arrival_date', 'departure_date', 'us_stay_address', 'home_address', 'pob_state_na', 'intended_los_value', 'intended_los_unit', 'social_media_presence', 'passport_issue_date', 'passport_expiry_date','spouse_dob_source','employment_start_date_source','employer_school_address_source','prev_emp_1_address_source','prev_emp_1_start_date_source','prev_emp_1_end_date_source','education_1_address_source','education_1_start_date_source','education_1_end_date_source'];
        const dateComponentKeys = ['dob_day', 'dob_month', 'dob_year', 'arrival_date_day', 'arrival_date_month', 'arrival_date_year', 'passport_issue_date_day', 'passport_issue_date_month', 'passport_issue_date_year', 'passport_expiry_date_day', 'passport_expiry_date_month', 'passport_expiry_date_year','employment_start_date_day','employment_start_date_month','employment_start_date_year','prev_emp_1_start_date_day','prev_emp_1_start_date_month','prev_emp_1_start_date_year','prev_emp_1_end_date_day','prev_emp_1_end_date_month','prev_emp_1_end_date_year','education_1_start_date_day','education_1_start_date_month','education_1_start_date_year','education_1_end_date_day','education_1_end_date_month','education_1_end_date_year'];
        const addressComponentKeys = ['us_address_street1', 'us_address_street2', 'us_address_city', 'us_address_state', 'us_address_zip'];
        const homeAddressComponentKeys = ['home_address_street1', 'home_address_street2', 'home_address_city', 'home_address_state', 'home_address_state_na', 'home_address_postal', 'home_address_postal_na', 'home_address_country'];
        const companionComponentKeys = ['companion_surname_1', 'companion_given_name_1', 'companion_relationship_1'];
        const socialMediaComponentKeys = ['social_media_platform_1', 'social_media_identifier_1'];

        if (!api_keys || api_keys.length === 0 || specialKeys.includes(form_key) || dateComponentKeys.includes(form_key) || addressComponentKeys.includes(form_key) || companionComponentKeys.includes(form_key) || homeAddressComponentKeys.includes(form_key) || socialMediaComponentKeys.includes(form_key) || form_key === 'national_id_na' || form_key === 'passport_expiry_na' ) {
             continue;
        }

        if (form_key === 'pob_state') {
            const isNa = (typeof pobStateNaValue === 'boolean' && pobStateNaValue) ||
                         (typeof pobStateNaValue === 'string' && ['y', 'true', '1'].includes(String(pobStateNaValue).toLowerCase()));
            const isHardcodedNa = hardcodedValues['pob_state_na'] === true;
            if (isNa || isHardcodedNa) {
                continue;
            }
             const naCheckboxElement = mappedElements['pob_state_na'];
             if (naCheckboxElement?.checked && !isHardcodedNa) {
                 fillElement(naCheckboxElement, 'checkbox', false, 'pob_state_na', 'dynamic');
             }
        }

        let valueToFill = undefined;
        for (const apiKey of api_keys) {
            if (Object.prototype.hasOwnProperty.call(formData, apiKey) && formData[apiKey] !== null && formData[apiKey] !== undefined) {
                valueToFill = formData[apiKey];
                break;
            }
        }

        if (valueToFill === undefined || (typeof valueToFill === 'string' && valueToFill.trim() === '')) {
            continue;
        }

        try {
            const processedValue = processApiValue(valueToFill, field_type, form_key);
            if (field_type !== 'hidden') {
                const elementOrList = mappedElements[form_key];
                if (!elementOrList) {
                    console.warn(`Element not found for key "${form_key}" for dynamic fill.`);
                    continue;
                }
                if (form_key === 'pob_state') {
                    console.log(`DEBUG: About to fill POB State. Element:`, elementOrList, `Value: "${processedValue}"`);
                }
                if (fillElement(elementOrList, field_type, processedValue, form_key, 'dynamic')) {
                    if (form_key === 'pob_state') {
                         console.log(`DEBUG: POB State value AFTER fillElement: "${elementOrList.value}"`);
                    }
                    fieldsFilledCount++;
                }
            }
        } catch (error) {
            console.error(`Error filling dynamic field "${form_key}" with value "${valueToFill}":`, error);
        }
    }

     // --- Handle Date, Address, Companion, and National ID Parsing (after main loop) ---
     const dobMapping = formFieldMapping.find(m => m.form_key === 'dob');
     const arrivalMapping = formFieldMapping.find(m => m.form_key === 'arrival_date');
     const departureMapping = formFieldMapping.find(m => m.form_key === 'departure_date');
     const usAddressMapping = formFieldMapping.find(m => m.form_key === 'us_stay_address');
     const homeAddressMapping = formFieldMapping.find(m => m.form_key === 'home_address');
     const companionsMapping = formFieldMapping.find(m => m.form_key === 'other_persons_traveling');
     const nationalIdMapping = formFieldMapping.find(m => m.form_key === 'national_id');
     const socialMediaPresenceMapping = formFieldMapping.find(m => m.form_key === 'social_media_presence');
     const passportIssueDateMapping = formFieldMapping.find(m => m.form_key === 'passport_issue_date');
     const passportExpiryDateMapping = formFieldMapping.find(m => m.form_key === 'passport_expiry_date');
     const spouseDobMapping = formFieldMapping.find(m => m.form_key === 'spouse_dob_source');
     const spousePobMapping = formFieldMapping.find(m => m.form_key === 'spouse_pob_source');
     const employerSchoolAddressMapping = formFieldMapping.find(m => m.form_key === 'employer_school_address_source');
     const employmentStartDateMapping = formFieldMapping.find(m => m.form_key === 'employment_start_date_source');
     const prevEmp1StartDateMapping = formFieldMapping.find(m => m.form_key === 'prev_emp_1_start_date_source');
     const prevEmp1EndDateMapping = formFieldMapping.find(m => m.form_key === 'prev_emp_1_end_date_source');
     //const eduInstitutionMapping = formFieldMapping.find(m => m.form_key === 'education_1_address_source');
     const eduInstitutionStartDateMapping = formFieldMapping.find(m => m.form_key === 'education_1_start_date_source');
     const eduInstitutionEndDateMapping = formFieldMapping.find(m => m.form_key === 'education_1_end_date_source');
     



     const fatherDobMapping = formFieldMapping.find(m => m.form_key === 'father_dob_source');
     const motherDobMapping = formFieldMapping.find(m => m.form_key === 'mother_dob_source');


     const fatherDobValue = findValueFromApiKeys(formData, fatherDobMapping?.api_keys);
     const motherDobValue = findValueFromApiKeys(formData, motherDobMapping?.api_keys);
     const spouseDobValue = findValueFromApiKeys(formData, spouseDobMapping?.api_keys);
     const employmentStartDateValue = findValueFromApiKeys(formData, employmentStartDateMapping?.api_keys); 
     const prevEmp1StartDateValue = findValueFromApiKeys(formData, prevEmp1StartDateMapping?.api_keys); 
     const prevEmp1EndDateValue = findValueFromApiKeys(formData, prevEmp1EndDateMapping?.api_keys); 
     const eduInstitutionStartDatevalue = findValueFromApiKeys(formData, eduInstitutionStartDateMapping?.api_keys);
     const eduInstitutionEndDatevalue = findValueFromApiKeys(formData, eduInstitutionEndDateMapping?.api_keys);
     const languagesSpokenString = findValueFromApiKeys(formData, ["languages_spoken"]);
     const countriesVisitedString = findValueFromApiKeys(formData, ["countries_visited_last_5_years"]);





     const prevEmp1AddressValue = findValueFromApiKeys(formData, formFieldMapping.find(m => m.form_key === 'prev_emp_1_address_source')?.api_keys);
     const eduInstitutionValue = findValueFromApiKeys(formData, formFieldMapping.find(m => m.form_key === 'education_1_address_source')?.api_keys);



     


     let dobValue = undefined;
     if (dobMapping?.api_keys) {
         for (const key of dobMapping.api_keys) {
             if (formData.hasOwnProperty(key) && formData[key] !== null) { dobValue = formData[key]; break; }
         }
     }

     let arrivalValue = undefined;
      if (arrivalMapping?.api_keys) {
         for (const key of arrivalMapping.api_keys) {
             if (formData.hasOwnProperty(key) && formData[key] !== null) { arrivalValue = formData[key]; break; }
         }
     }

     let departureValue = undefined;
      if (departureMapping?.api_keys) {
         for (const key of departureMapping.api_keys) {
             if (formData.hasOwnProperty(key) && formData[key] !== null) { departureValue = formData[key]; break; }
         }
     }

     let usAddressValue = undefined;
      if (usAddressMapping?.api_keys) {
         for (const key of usAddressMapping.api_keys) {
             if (formData.hasOwnProperty(key) && formData[key] !== null) { usAddressValue = formData[key]; break; }
         }
     }

     let employerSchoolAddressValue  = undefined;
     if (employerSchoolAddressMapping?.api_keys) {
        for (const key of employerSchoolAddressMapping.api_keys) {
            if (formData.hasOwnProperty(key) && formData[key] !== null) { employerSchoolAddressValue = formData[key]; break; }
        }
    }


     let homeAddressValue = undefined;
      if (homeAddressMapping?.api_keys) {
         for (const key of homeAddressMapping.api_keys) {
             if (formData.hasOwnProperty(key) && formData[key] !== null) { homeAddressValue = formData[key]; break; }
         }
     }

     let companionsValue = undefined;
      if (companionsMapping?.api_keys) {
          for (const key of companionsMapping.api_keys) {
              if (formData.hasOwnProperty(key) && formData[key] !== null) { companionsValue = formData[key]; break; }
          }
      }

      let nationalIdApiValue = undefined;
      if (nationalIdMapping?.api_keys) {
          for (const key of nationalIdMapping.api_keys) {
              if (formData.hasOwnProperty(key) && formData[key] !== null && String(formData[key]).trim() !== '') {
                  nationalIdApiValue = formData[key];
                  break;
              }
          }
      }

      let socialMediaPresenceValue = undefined;
      if (socialMediaPresenceMapping?.api_keys) {
          for (const key of socialMediaPresenceMapping.api_keys) {
              if (formData.hasOwnProperty(key) && formData[key] !== null) {
                  socialMediaPresenceValue = formData[key];
                  break;
              }
          }
      }

      let passportIssueDateValue = undefined;
      if(passportIssueDateMapping?.api_keys){
          for(const key of passportIssueDateMapping.api_keys){
              if(formData.hasOwnProperty(key) && formData[key] !== null){ passportIssueDateValue = formData[key]; break;}
          }
      }

      let passportExpiryDateValue = undefined;
      if(passportExpiryDateMapping?.api_keys){
          for(const key of passportExpiryDateMapping.api_keys){
              if(formData.hasOwnProperty(key) && formData[key] !== null){ passportExpiryDateValue = formData[key]; break;}
          }
      }


     // Now parse and fill using the found values
     try { // Wrap parsing/filling blocks to catch errors
         if (dobValue) {
             parseAndFillDateComponents(dobValue, 'dob', mappedElements);
         }

         if (employmentStartDateValue) {
            parseAndFillDateComponents(employmentStartDateValue, 'employment_start_date', mappedElements);
        }

        if (prevEmp1StartDateValue) {
            parseAndFillDateComponents(prevEmp1StartDateValue, 'prev_emp_1_start_date', mappedElements);
        }

        if (prevEmp1EndDateValue) {
            parseAndFillDateComponents(prevEmp1EndDateValue, 'prev_emp_1_end_date', mappedElements);
        }

        if (eduInstitutionStartDatevalue) {
            parseAndFillDateComponents(eduInstitutionStartDatevalue, 'education_1_start_date', mappedElements);
        }

        if (eduInstitutionEndDatevalue) {
            parseAndFillDateComponents(eduInstitutionEndDatevalue, 'education_1_end_date', mappedElements);
        }

         if (arrivalValue) {
             arrivalDateStr = arrivalValue; // Store for LOS
             parseAndFillDateComponents(arrivalDateStr, 'arrival_date', mappedElements);
         }
         if (departureValue) {
             departureDateStr = departureValue; // Store for LOS
         }
         if (prevEmp1AddressValue) {
            parseAndFillPreviousEmployerAddress(prevEmp1AddressValue, "prev_emp_1", mappedElements);
        }

        if (eduInstitutionValue) {
            parseAndFillPreviousEmployerAddress(eduInstitutionValue, "education_1", mappedElements);
        }
         // --- Conditional US Address Filling ---
         const usAddressLabelElement = document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_lblAddressInUS');
         if (usAddressLabelElement && usAddressValue) {
             parseAndFillUSAddress(usAddressValue, mappedElements);
         } else if (usAddressValue) {
             console.log("Did not find 'Address Where You Will Stay' label, skipping US address filling.");
         }
         // --- Fill Home Address ---
         const homeAddressLabelElement = document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_lblHomeAdressInfo');
         if (homeAddressLabelElement && homeAddressValue) {
             parseAndFillHomeAddress(homeAddressValue, mappedElements);
         } else if (homeAddressValue) {
            console.log("Did not find 'Home Address' label, skipping Home address filling.");
         }


         parseAndFillEmployerSchoolName(formData, mappedElements); // <<< CALL NEW FUNCTION HERE

         if (employerSchoolAddressValue) {
            console.log("Attempting to parse and fill Employer/School Address from:", employerSchoolAddressValue);
            parseAndFillEmployerSchoolAddress(employerSchoolAddressValue, mappedElements);
        }

         if (fatherDobValue !== undefined) {
            handleParentDOB(String(fatherDobValue || ""), 'father', mappedElements);
        } else { /* ... logic for 'Do Not Know' ... */ }
        if (motherDobValue !== undefined) {
            handleParentDOB(String(motherDobValue || ""), 'mother', mappedElements);
        } else { /* ... logic for 'Do Not Know' ... */ }

        if (spouseDobValue !== undefined) {
            handleParentDOB(String(spouseDobValue || ""), 'spouse', mappedElements);
        } else { /* ... logic for 'Do Not Know' ... */ }

        if (employmentStartDateValue !== undefined) {
            handleParentDOB(String(employmentStartDateValue || ""), 'employmentStartDate', mappedElements);
        } else { /* ... logic for 'Do Not Know' ... */ }


         if (companionsValue) {
             parseAndFillTravelCompanions(companionsValue, mappedElements);
         }

         // --- Logic for National ID and its NA checkbox ---
         if (nationalIdApiValue) { // If a National ID is provided
            const nationalIdElement = mappedElements['national_id'];
            const nationalIdNaElement = mappedElements['national_id_na']; // Get the NA checkbox element

            if (nationalIdElement) {
                if (fillElement(nationalIdElement, 'text', nationalIdApiValue, 'national_id', 'dynamic')) {
                    // Successfully filled the National ID text field
                    if (nationalIdNaElement) { // If the NA checkbox element was found
                        console.log(`National ID ("${nationalIdApiValue}") filled, ensuring 'national_id_na' is unchecked.`);
                        fillElement(nationalIdNaElement, 'checkbox', false, 'national_id_na', 'dynamic'); // Uncheck the NA box
                    } else {
                        console.warn("Could not find the 'Does Not Apply' checkbox for National ID (national_id_na) to uncheck it. Verify its locator.");
                    }
                }
            } else {
                console.warn("Element for 'national_id' text field not found.");
            }
        } else {
            // If national_id is not provided or is empty, the 'national_id_na' checkbox
            // should ideally be checked (or left to page default / hardcoding if any).
            const nationalIdNaElement = mappedElements['national_id_na'];
            if (nationalIdNaElement && !Object.hasOwnProperty.call(hardcodedValues, 'national_id_na')) { // Only check if not hardcoded
                console.log("National ID not provided or empty in API data. Checking 'national_id_na' checkbox.");
                fillElement(nationalIdNaElement, 'checkbox', true, 'national_id_na', 'dynamic');
            }
        }
        // --- END National ID Logic ---

        // --- Social Media Parser ---
        if (socialMediaPresenceValue !== undefined) {
            if (document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl00_lblSocialMediaPlatform')) {
                console.log("Found social media section, proceeding with social media parsing.");
                parseAndFillSocialMedia(socialMediaPresenceValue, mappedElements);
            } else if (socialMediaPresenceValue && socialMediaPresenceValue.trim().toLowerCase() !== "none" && socialMediaPresenceValue.trim().toLowerCase() !== "no" && socialMediaPresenceValue.trim() !== "") {
                console.log("Did not find social media section header, skipping social media filling.");
            }
        }
        // --- END Social Media Parser ---

        // --- Passport Issue Date ---
        if (passportIssueDateValue) {
            if (!parseAndFillDateComponents(passportIssueDateValue, 'passport_issue_date', mappedElements)) {
                 console.warn(`Failed to fill Passport Issue Date components for value: ${passportIssueDateValue}`);
            }
        } else {
            console.warn("Passport Issue Date (Date_of_Issue) not found in API data. Date fields for passport issue will not be filled.");
        }

        if (languagesSpokenString !== undefined) { // Check if the key was present
            parseAndFillLanguagesSpoken(languagesSpokenString, mappedElements, "language_1_name_text");
        } else {
            console.log("[Main Fill] No 'languages_spoken' data from API. Clearing first language field if mapped.");
            const langEl = mappedElements["language_1_name_text"];
            if (langEl) fillElement(langEl, 'text', '', "language_1_name_text", 'logic_clear');
        }
        if (countriesVisitedString !== undefined) { // Check if the key was present in API data
            parseAndFillCountriesVisited(countriesVisitedString, mappedElements);
        } else {
            console.log("[Main Fill] No 'countries_visited_last_5_years' data from API. Radio may default or be unfilled.");
            // Optionally, explicitly set to 'No' if the API key is missing entirely
            const cvRadioEl = mappedElements["countries_visited_radio"];
            if (cvRadioEl) fillElement(cvRadioEl, 'radio', 'N', "countries_visited_radio", 'logic_default_no');
        }


        // --- Passport Expiry Date & NA Checkbox ---
        const passportExpiryNaCheckbox = mappedElements['passport_expiry_na'];
        if (passportExpiryDateValue) { // If API provides any value for expiry date
            if (parseAndFillDateComponents(passportExpiryDateValue, 'passport_expiry_date', mappedElements)) {
                // If date was successfully parsed and filled, uncheck "No Expiration"
                if (passportExpiryNaCheckbox) {
                    fillElement(passportExpiryNaCheckbox, 'checkbox', false, 'passport_expiry_na', 'dynamic');
                }
            } else {
                 // If date string was present but couldn't be parsed/filled, it's likely invalid or "No Expiration" applies
                 console.warn(`Passport Expiry Date ("${passportExpiryDateValue}") could not be parsed or filled. Checking "No Expiration".`);
                 if (passportExpiryNaCheckbox) {
                    fillElement(passportExpiryNaCheckbox, 'checkbox', true, 'passport_expiry_na', 'dynamic');
                    // Optionally, disable/clear expiry date fields
                    ['passport_expiry_date_day', 'passport_expiry_date_month', 'passport_expiry_date_year'].forEach(key => {
                        const el = mappedElements[key];
                        if (el) {
                            if (el.tagName === 'SELECT') el.selectedIndex = 0;
                            else if (el.tagName === 'INPUT') el.value = '';
                            el.disabled = true; // Disable the fields
                        }
                    });
                }
            }
        } else {
             // If API did NOT provide Date_of_Expiry (i.e., passportExpiryDateValue is null/undefined)
             console.warn("Passport Expiry Date (Date_of_Expiry) not found in API data. Checking 'No Expiration'.");
             if (passportExpiryNaCheckbox) {
                fillElement(passportExpiryNaCheckbox, 'checkbox', true, 'passport_expiry_na', 'dynamic');
                ['passport_expiry_date_day', 'passport_expiry_date_month', 'passport_expiry_date_year'].forEach(key => {
                    const el = mappedElements[key];
                    if (el) {
                        if (el.tagName === 'SELECT') el.selectedIndex = 0;
                        else if (el.tagName === 'INPUT') el.value = '';
                        el.disabled = true; // Disable the fields
                    }
                });
            }
        }


     } catch (error) {
         console.error("Error during date, address, social media, or companion parsing/filling:", error);
     }


    // --- Calculate and Fill Length of Stay ---
    try { // Wrap LOS calculation/filling
        if (arrivalDateStr && departureDateStr) {
            const los = calculateLengthOfStay(arrivalDateStr, departureDateStr);
            if (los) {
                const losValueElement = mappedElements['intended_los_value'];
                const losUnitElement = mappedElements['intended_los_unit'];

                if (losValueElement && fillElement(losValueElement, 'text', los.value, 'intended_los_value', 'dynamic')) {
                    fieldsFilledCount++; // Count LOS value as filled
                } else { console.warn("Could not find or fill Intended Length of Stay value field."); }

                if (losUnitElement && fillElement(losUnitElement, 'select', los.unit, 'intended_los_unit', 'dynamic')) {
                    fieldsFilledCount++; // Count LOS unit as filled
                } else { console.warn("Could not find or fill Intended Length of Stay unit field."); }
            } else { console.warn("Length of Stay calculation failed or resulted in null."); }
        }
    } catch(error) {
         console.error("Error during Length of Stay calculation/filling:", error);
    }

    console.log(`Dynamic form filling finished. ${fieldsFilledCount} direct fields/groups filled (Date/LOS/Address/Companion parts handled separately).`);
}

/**
 * Fills the form using hardcoded values defined in the script.
 */
function fillHardcodedFields(mappedElements) {
    console.log("Attempting to fill form with hardcoded data...");
    let fieldsFilledCount = 0;

    for (const form_key in hardcodedValues) {
        if (Object.hasOwnProperty.call(hardcodedValues, form_key)) {
            const valueToFill = hardcodedValues[form_key];
            const mapping = formFieldMapping.find(m => m.form_key === form_key);

            if (!mapping) {
                console.warn(`No mapping found for hardcoded key "${form_key}".`);
                continue;
            }
            const { field_type } = mapping;
            if (valueToFill === undefined || valueToFill === null || (typeof valueToFill === 'string' && valueToFill.trim() === '' && field_type !== 'checkbox')) {
                continue;
            }
            const elementOrList = mappedElements[form_key];
            if (!elementOrList) {
                console.warn(`Element not found for hardcoded key "${form_key}". Cannot fill.`);
                continue;
            }
            // Add try-catch around hardcoded field filling as well
            try {
                 if (form_key === 'pob_state_na') {
                    // console.log(`DEBUG: Hardcoding POB State NA. Element:`, elementOrList, `Value: "${valueToFill}"`);
                 }
                if (fillElement(elementOrList, field_type, valueToFill, form_key, 'hardcoded')) {
                    if (form_key === 'pob_state_na') {
                         // console.log(`DEBUG: POB State NA value AFTER hardcoded fillElement: "${elementOrList.checked}"`);
                    }
                    fieldsFilledCount++;
                }
            } catch (error) {
                 console.error(`Error filling hardcoded field "${form_key}":`, error);
            }
        }
    }
    console.log(`Hardcoded form filling finished. ${fieldsFilledCount} fields/groups filled.`);
}


// --- Initialization and Message Handling ---

/**
 * Finds and maps all relevant form elements based on formFieldMapping.
 */
function findAndMapFormElements() {
    const foundElements = {};
    // console.log("Starting element mapping..."); // Reduce noise
    formFieldMapping.forEach(mapping => {
        // Add try-catch around findElement to prevent mapping errors stopping everything
        try {
            const element = findElement(mapping);
            if (element) {
                foundElements[mapping.form_key] = element;
            }
        } catch (error) {
            console.error(`Error finding element for key "${mapping.form_key}":`, error);
        }
    });
    // console.log("Finished element mapping. Mapped elements found for keys:", Object.keys(foundElements));
    return foundElements;
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request.action);
    // Wrap the entire message handling in try-catch
    try {
        const mappedElements = findAndMapFormElements(); // Find elements on message receipt

        if (request.action === "fillForm" && request.data) {
            console.log("Received dynamic form data payload.");
            // --- ADDED JSON LOGGING ---
            console.log("Received formData:", JSON.stringify(request.data, null, 2)); // Log the received JSON
            // --------------------------
            // --- MODIFIED ORDER: Hardcode first ---
            fillHardcodedFields(mappedElements);
            fillForm(request.data, mappedElements); // Fill dynamic data (will skip hardcoded fields)
            // ------------------------------------
            sendResponse({ status: "Filling complete." }); // Removed auto-next logic

        } else if (request.action === "fillHardcoded") {
            console.log("Received 'fillHardcoded' action.");
            fillHardcodedFields(mappedElements); // Fill only hardcoded values
            sendResponse({ status: "Hardcoded filling completed." }); // Removed auto-next logic

        } else if (request.action === "fillForm" && !request.data) {
            console.warn("Received 'fillForm' message but no data payload.");
            sendResponse({ status: "Error: No data for fillForm." });
        } else {
            console.log("Received unhandled message action:", request.action);
            sendResponse({ status: "Unknown action" });
        }
    } catch (error) {
         console.error("Error processing message:", request.action, error);
         sendResponse({ status: "Error processing message." });
    }
    // Return true because sendResponse might be called asynchronously
    return true;
});

console.log("Form Filler Content Script initialized. Waiting for messages...");
