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
        //label_texts: ["City"], // Use specific label
        api_keys: ["pob_city", "Place of Birth", "placeOfBirth", "birthPlace", "geburtsort"],
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[3]/div[1]/div/div/div[2]/input" } // VERIFY ID
    },
    //--- POB State/Province Mappings ---
    {
        form_key: "pob_state",
        //label_texts: ["State/Province"], // Use specific label
        api_keys: ["pob_state_province"], // Filled only if pob_state_na is false/N
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[3]/div[1]/div/div/div[3]/input" } // VERIFY ID
    },
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
        //label_texts: ["Country/Region"], // Use specific label
        api_keys: ["pob_country", "Country_Code", "countryOfBirth", "birthCountryCode"],
        field_type: "select",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[3]/div[1]/div/div/select" } // VERIFY ID
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
        api_keys: ["nationality", "Nationality","Country_Code"],
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
        label_texts: [""], 
        api_keys: ["full_name_native_na", "native_name_na"],
        field_type: "checkbox",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[1]/div[1]/div[3]/div/span/span/input" } // VERIFY ID
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
        label_texts: ["Do you hold or have you held any nationality other than the one indicated above on nationality?"],
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
        label_texts: [""],
        api_keys: [""],
        field_type: "checkbox",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[3]/div[1]/div[2]/span[3]/span/input" } // VERIFY ID
    },
    {
        form_key: "tax_id_na",
        label_texts: [""],
        api_keys: ["tax_id_not_applicable"],
        field_type: "checkbox",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[3]/div[1]/div[3]/div/span/span/input"} // VERIFY ID
    },
    // --- Passport/ID Info ---
    // POB State/Province mappings moved up near POB City/Country
    {
        form_key: "Passport_place_of_issue",
        //label_texts: ["City"],
        api_keys: ["Place_of_Issue"],
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[2]/div[2]/div/div[3]/div/div[1]/input"} // VERIFY ID
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
        //label_texts: ["Country/Region"],
        api_keys: ["Country_Code"], // API key from your Flask app
        field_type: "select",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[2]/div[2]/div/div[3]/div/div[3]/select" }
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
    form_key: "trip_payer_surname_text",
    label_texts: ["Surnames of Person Paying for Trip"],
    api_keys: ["trip_payer_surname"], // From your formData
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxPayerSurname" }
},
{
    form_key: "trip_payer_given_name_text",
    label_texts: ["Given Names of Person Paying for Trip"],
    api_keys: ["trip_payer_given_name"], // From your formData
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxPayerGivenName" }
},
{
    form_key: "trip_payer_phone_text",
    label_texts: ["Telephone Number"], // Label for Payer's Telephone
    api_keys: ["trip_payer_telephone"], // From your formData
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxPayerPhone" }
},
{
    form_key: "trip_payer_email_text",
    label_texts: ["Email Address"], // Label for Payer's Email
    api_keys: ["trip_payer_email"], // From your formData
    field_type: "text",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_tbxPAYER_EMAIL_ADDR" }
},
{
    form_key: "trip_payer_relationship_select",
    label_texts: ["Relationship to You"], // Label for Payer's Relationship
    api_keys: ["trip_payer_relationship"], // From your formData
    field_type: "select",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlPayerRelationship" }
},
{
    form_key: "payer_address_same_radio",
    label_texts: ["Is the address of the party paying for your trip the same as your Home or Mailing Address?"],
    api_keys: ["trip_payer_address_same_as_home"], // From your formData
    field_type: "radio",
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblPayerAddrSameAsInd" }
},

{
    form_key: "payer_address_street1",
    //label_texts: ["Street Address (Line 1)"], // Context: Payer Address
    api_keys: ["payer_address_street_line1"], // No direct API key in provided formData for this specific field
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[4]/div/fieldset/div[2]/div/div/div[6]/div/div[1]/input" }
},
{
    form_key: "payer_address_street2",
    //label_texts: ["Street Address (Line 2)"], // Context: Payer Address
    api_keys: ["payer_address_street_line2"], // No direct API key
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[4]/div/fieldset/div[2]/div/div/div[6]/div/div[2]/input" }
},
{
    form_key: "payer_address_city",
    //label_texts: ["City"], // Context: Payer Address
    api_keys: ["payer_address_city"], // No direct API key
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[4]/div/fieldset/div[2]/div/div/div[6]/div/div[3]/input" }
},
{
    form_key: "payer_address_state",
    //label_texts: ["State/Province"], // Context: Payer Address
    api_keys: ["payer_address_state"], // No direct API key
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[4]/div/fieldset/div[2]/div/div/div[6]/div/div[4]/div/input" }
},
{
    form_key: "payer_address_postal",
    //label_texts: ["Postal Zone/ZIP Code"], // Context: Payer Address
    api_keys: ["payer_address_zip_code"], // No direct API key
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[4]/div/fieldset/div[2]/div/div/div[6]/div/div[5]/div/input" }
},
{
    form_key: "payer_address_country",
    //label_texts: ["Country/Region"], // Context: Payer Address
    api_keys: ["payer_address_country"], // No direct API key, might default or be parsed
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[4]/div/fieldset/div[2]/div/div/div[6]/div/div[6]/select" }
},
// End of Trip Payer Section Mappings
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
        api_keys: ["us_stay_address_line1"], // Filled by 'us_stay_address' logic
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div/div/div/div[2]/div[1]/input" } // VERIFY ID
    },
    {
        form_key: "us_address_street2",
        //label_texts: ["Street Address (Line 2)"],
        api_keys: ["us_stay_address_line2"], // Filled by 'us_stay_address' logic
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div/div/div/div[2]/div[2]/input" } // VERIFY ID
    },
    {
        form_key: "us_address_city",
        //label_texts: ["City"],
        api_keys: ["us_stay_address_city"], // Filled by 'us_stay_address' logic
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div/div/div/div[2]/div[3]/input" } // VERIFY ID
    },
    {
        form_key: "us_address_state",
        //label_texts: ["State"],
        api_keys: ["us_stay_address_state"], // Filled by 'us_stay_address' logic
        field_type: "select",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div/div/div/div[2]/div[4]/select" } // VERIFY ID
    },
    {
        form_key: "us_address_zip",
        //label_texts: ["ZIP Code"],
        api_keys: ["us_stay_address_zip_code"], // Filled by 'us_stay_address' logic
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div/div/div/div[2]/div[5]/input" } // VERIFY ID
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
        form_key: "prev_visa_refused_details",
        //label_texts: ["Have you ever been refused a U.S. Visa"], // Partial label match
        api_keys: ["previous_us_visa_refusal_details"], // API key from Flask app
        field_type: "textarea",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[5]/fieldset/div[1]/div/div[2]/div/div/textarea" } // VERIFY Name
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
        //label_texts: ["Street Address (Line 1)"], // Label within Home Address section
        api_keys: ["home_address_line1"], // Filled by 'home_address' logic
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[1]/div/div/div[1]/input" } // VERIFY ID
    },
    {
        form_key: "home_address_street2",
        //label_texts: ["Street Address (Line 2)"],
        api_keys: ["home_address_line2"],
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[1]/div/div/div[2]/input" } // VERIFY ID
    },
    {
        form_key: "home_address_city",
        //label_texts: ["City"],
        api_keys: ["home_address_city"],
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[1]/div/div/div[3]/input" } // VERIFY ID
    },
    {
        form_key: "home_address_state",
        //label_texts: ["Does Not Apply"], // Checkbox associated with Home Address State
        api_keys: ["home_address_state"], // We will likely hardcode this or determine based on parsing
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[1]/div/div/div[4]/input[1]" } // VERIFY ID
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
        //label_texts: ["Postal Zone/ZIP Code"],
        api_keys: ["home_address_zip"],
        field_type: "text",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[1]/div/div/div[5]/input[1]" } // VERIFY ID
    },
    {
        form_key: "home_address_postal_na",
        //label_texts: ["Does Not Apply"], // Checkbox associated with Home Address Postal Code
        api_keys: [],
        field_type: "checkbox",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[1]/div/div/div[5]/input[1]" } // VERIFY ID
    },
    {
        form_key: "home_address_country",
        //label_texts: ["Country/Region"],
        api_keys: [], // Assuming country comes from elsewhere or defaults
        field_type: "select",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[1]/div/div/div[6]/select" } // VERIFY ID
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
        label_texts: [""], // Label for the checkbox
        api_keys: [], // Not controlled by API if we are hardcoding it
        field_type: "checkbox",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[3]/div[1]/div[3]/span[3]/span/input" } // ID from your HTML
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
        label_texts: [""],
        api_keys: [],
        field_type: "checkbox",
        locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset[2]/div[2]/div/div[1]/span[3]/span/input" } // ID for the checkbox
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
        form_key: "us_contact_relationship_select",
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
    api_keys: ["us_contact_street_address_line1"], // Filled by parsing 'us_contact_address'
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[3]/div/div/div[1]/input" } // ID from HTML
},
{
    form_key: "us_contact_address_street2", // Target field
    //label_texts: ["U.S. Street Address (Line 2)"],
    api_keys: ["us_contact_street_address_line2"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[3]/div/div/div[2]/input" }
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
    //label_texts: ["Does Not Apply"],
    api_keys: [],
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[3]/div/div/div[7]/div/div/div[2]/span/span/input" }
},
{
    form_key: "us_contact_email_text",
    //label_texts: ["Does Not Apply"],
    api_keys: [],
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[2]/fieldset/div/div[3]/div/div/div[7]/div/div/input[1]" }
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
// Add these to your formFieldMapping array in content.js

// --- Spouse's Place of Birth ---
// Source field for Spouse's Place of Birth (from API)
{
    form_key: "spouse_pob_source",
    label_texts: ["Spouse's Place of Birth"], // Matches the section header
    api_keys: ["spouse_pob"], // API provides 'spouse_pob' as "City, Country"
    field_type: "hidden"     // Indicates this holds data for parsing
},
// Target field: Spouse's POB City
{
    form_key: "spouse_pob_city_text",
    //label_texts: ["City"], // Label for the city input in Spouse POB section
    api_keys: [],          // Will be filled by parsing spouse_pob_source
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[1]/div[2]/div/div/div[1]/input" }
},
// Target checkbox: Spouse's POB City "Do Not Know"
{
    form_key: "spouse_pob_city_unk",
    //label_texts: ["Do Not Know"], // Associated with Spouse's POB City
    api_keys: [],               // Logic will handle this based on parsed city
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[1]/div[2]/div/div/div[1]/div/span/span/input" }
},
// Target field: Spouse's POB Country/Region
{
    form_key: "spouse_pob_country_select",
    //label_texts: ["Country/Region"], // Label for the country dropdown in Spouse POB section
    api_keys: [],                  // Will be filled by parsing spouse_pob_source
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset[1]/div[2]/div/div/div[2]/select" }
},
// --- End of Spouse's Place of Birth Mappings ---
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
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$tbxDescribeDuties"}
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
// Add this to your formFieldMapping array

// --- Spouse's Address Type ---
{
    form_key: "spouse_address_type_select",
    label_texts: ["Spouse's Address"],
    api_keys: ["spouse_address"],
    field_type: "select",
    locator: { type: "id", value: "ctl00_SiteContentPlaceHolder_FormView1_ddlSpouseAddressType" }
},
// --- End of Spouse's Address Type Mapping ---
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
// Target fields for parsed employer/school address
{
    form_key: "employer_school_street1_text",
    //label_texts: ["Street Address (Line 1)"], // Context: Employer/School
    api_keys: ["present_employer_address_line1"], // To be filled by parsing 'employer_school_address_source'
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[1]/input" }
},
{
    form_key: "employer_school_street2_text",
    //label_texts: ["Street Address (Line 2)"], // Context: Employer/School
    api_keys: ["present_employer_address_line2"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[2]/input" }
},
{
    form_key: "employer_school_city_text",
    //label_texts: ["City"], // Context: Employer/School
    api_keys: ["present_employer_address_city"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[3]/input" }
},
{
    form_key: "employer_school_state_text",
    //label_texts: ["State/Province"], // Context: Employer/School
    api_keys: ["present_employer_address_state"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[4]/input[1]" }
},
{
    form_key: "employer_school_state_na_checkbox",
    label_texts: [""], // Context: Employer/School State
    api_keys: [], // Logic will handle this based on parsed state
    field_type: "checkbox",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[4]/span[3]/span/input" }
},
{
    form_key: "employer_school_postal_text",
    //label_texts: ["Postal Zone/ZIP Code"], // Context: Employer/School
    api_keys: ["present_employer_address_zip_code"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[5]/input[1]" }
},
{
    form_key: "employer_school_postal_na_checkbox",
    //label_texts: ["Does Not Apply"], // Context: Employer/School Postal
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
    api_keys: ["present_employer_phone_number"], // ASSUMED API key. Your API needs to provide this, or it needs parsing from address.
                                        // Your formData does not currently show this key.
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/fieldset/div[1]/div[2]/div/div/div[2]/div[6]/input" }
},
{
    form_key: "previously_employed_radio",
    label_texts: ["Were you previously employed?"],
    api_keys: ["previously_employed"],
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
    form_key: "prev_emp_1_street1_text",
    api_keys: ["prev_emp_1_address_line1"], // Filled by parsing prev_emp_1_address_source
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[1]/input" }
},
{
    form_key: "prev_emp_1_street2_text",
    api_keys: ["prev_emp_1_address_line2"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[2]/input" }
},
{
    form_key: "prev_emp_1_city_text",
    api_keys: ["prev_emp_1_address_city"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/div[2]/div[3]/input" }
},
{
    form_key: "prev_emp_1_state_text",
    api_keys: ["prev_emp_1_address_state"],
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
    api_keys: ["prev_emp_1_address_zip_code"],
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
    form_key: "prev_emp_1_supervisor_surname_text",
    api_keys: ["prev_emp_1_supervisor_surname"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/input[2]" }
},
{
    form_key: "prev_emp_1_supervisor_given_name_text",
    api_keys: ["prev_emp_1_supervisor_given_name"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[1]/fieldset/div/div[2]/div[2]/table/tbody/tr/td/div[1]/input[4]" }
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
// Target fields for FIRST Educational Institution
{
    form_key: "education_1_name_text",
    api_keys: ["institution_name"], // Parsed from education_institute_address or highest_education_qualification
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/input[1]" }
},
{
    form_key: "education_1_street1_text",
    api_keys: ["institution_address_line1"], // Parsed from education_institute_address
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/input[2]" }
},
{
    form_key: "education_1_street2_text",
    api_keys: ["institution_address_line2"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/input[3]" }
},
{
    form_key: "education_1_city_text",
    api_keys: ["institution_address_city"],
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/div[3]/div[5]/div/table/tbody/tr/td/div[3]/div[2]/fieldset/div[1]/div/div[2]/div[2]/table/tbody/tr/td/div[1]/span/input[4]" }
},
{
    form_key: "education_1_state_text",
    api_keys: ["institution_address_state"],
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
    api_keys: ["institution_address_zip_code"],
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
    locator: { type: "name", value: "ctl00$SiteContentPlaceHolder$FormView1$rblImmigrationFraud" }
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

{
    form_key: "passport_number",
    label_texts: ["passport_number"],
    api_keys: [""], // ASSUMED API key
    field_type: "",
    locator: { type: "xpath", value: "/html/body/form/main/div/div/div/div/div[1]/div[2]/div[2]/div/fieldset[4]/table/tbody/tr[2]/td[1]/div[2]/input"}
},

{
    //form_key: "Passport_place_of_issue",
    label_texts: [""],
    api_keys: ["Place_of_Issue"], // ASSUMED API key
    field_type: "text",
    locator: { type: "xpath", value: "/html/body/form/main/div/div/div/div/div[1]/div[2]/div[2]/div/fieldset[4]/table/tbody/tr[4]/td[1]/div[2]/input" }
},

{
    form_key: "visa_type_select",
    label_texts: ["Visa Type"],
    api_keys: [""], // ASSUMED API key
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/main/div/div/div[2]/div/div/div/div/div/fieldset/table/tbody/tr[3]/td[1]/div[2]/select" }
},

{
    form_key: "embassy_location_select",
    label_texts: ["Embassy/Consulate/OFC"],
    api_keys: [""], // ASSUMED API key
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/main/div/div/div[2]/div/div/div/div/div/fieldset/table/tbody/tr[4]/td[1]/div[2]/select"}
},

{
    form_key: "post_visa_category_select",
    label_texts: ["Post Visa Category"],
    api_keys: [""], // ASSUMED API key
    field_type: "select",
    locator: { type: "xpath", value: "/html/body/form/main/div/div/div[2]/div/div/div/div/div/fieldset/table/tbody/tr[6]/td[1]/div[2]/select"}
},

{
    form_key: "visa_type_radio",
    label_texts: ["B1/B2"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    locator: { type: "name", value: "radio_button"}
},

{
    form_key: "Citizenship_status_radio",
    label_texts: ["Are you a citizen of India/Bhutan OR a lawful resident of India/Bhutan?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    //locator: { type: "name", value: "question-answer"}
},

{
    form_key: "under_14_radio",
    label_texts: ["Are you (the visa applicant) under 14 years of age?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    //locator: { type: "name", value: "question-answer"}
},

{
    form_key: "above_80_radio",
    label_texts: ["Are you (the visa applicant) 80 years of age or older?"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    //locator: { type: "name", value: "question-answer"}
},

{
    form_key: "prev_b1_b2_visa_radio",
    label_texts: ["Do you have a previous B-1/B-2 visa (visitor for Business and Pleasure) issued on or after your 14th birthday??"],
    api_keys: [""], // ASSUMED API key
    field_type: "radio",
    //locator: { type: "name", value: "question-answer"}
},

// End of new mappings... (make sure this is inside the main array ']')
];

const hardcodedValues = {
    "home_address_country": "IND",
    "current_nationality" : "INDIA",
    "full_name_native_na": true,
    // "sex": "MALE", // Commented out - let dynamic data fill if available
    "permanent_resident_other_country": "N",
    "other_names_used": "N",
    "has_telecode": "N",
    "ssn_na": true,
    "tax_id_na": true,
    "purpose_of_trip": "B",
    "purpose_specify": "B1-B2", // **VERIFY THIS VALUE ON THE LIVE FORM**
    //"pob_state_na": true, // Force "Does Not Apply" for Place of Birth State
    "specific_travel_plans": "N", // Hardcode "Specific travel plans?" to No
    "traveling_as_organization": "N",
    "work_phone_na": true,
    "any_other_phone_numbers_used": "N",
    "any_other_email_used": "N",
    "presence_on_any_other_websites": "N",
    "passport_document_type": "R",
    "passport_book_number_na": true,
    "us_contact_org_na" : true,
    //"us_contact_email_na": true,
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
    "visa_type_select" : "Non-Immigrant",
    "embassy_location_select" : "CHENNAI",
    "post_visa_category_select": "Business/Tourism",
    "visa_type_radio": "1e58cbb1-a5db-ec11-a7b4-001dd802327e",
    "Citizenship_status_radio": "Yes",
    "under_14_radio":"No",
    "above_80_radio":"No",
    "prev_b1_b2_visa_radio":"No",
};

// --- Helper Functions ---


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
                    
                    let observer = null; // Declare observer outside

                    try {
                        // 1. Ensure the element is not disabled or readonly before filling
                        if (textElement.disabled) {
                            console.log(`Element "${form_key}" was disabled. Attempting to enable it.`);
                            textElement.disabled = false;
                        }
                        if (textElement.readOnly) {
                            console.log(`Element "${form_key}" was readOnly. Attempting to make it writable.`);
                            textElement.readOnly = false;
                        }

                        // Setup a MutationObserver to fight against re-disabling or being made readOnly
                        observer = new MutationObserver((mutationsList, obs) => {
                            for (const mutation of mutationsList) {
                                if (mutation.type === 'attributes') {
                                    if (mutation.attributeName === 'disabled' && textElement.disabled) {
                                        console.warn(`[Observer] Element "${form_key}" was disabled by page script. Forcing re-enable.`);
                                        // Use queueMicrotask to attempt re-enabling after current synchronous operations
                                        queueMicrotask(() => {
                                            if (textElement.disabled) { // Check again, page might be very fast
                                                textElement.disabled = false;
                                                // Re-dispatch events as the page might need them while element is enabled
                                                // to correctly update its internal state or dependent UI.
                                                textElement.dispatchEvent(new Event('input', { bubbles: true }));
                                                textElement.dispatchEvent(new Event('change', { bubbles: true }));
                                                console.log(`[Observer] Re-enabled and re-dispatched events for "${form_key}" after being disabled.`);
                                            }
                                        });
                                    }
                                    if (mutation.attributeName === 'readonly' && textElement.readOnly) {
                                        console.warn(`[Observer] Element "${form_key}" was set to readOnly by page script. Forcing writable.`);
                                        queueMicrotask(() => {
                                            if (textElement.readOnly) { // Check again
                                                textElement.readOnly = false;
                                                textElement.dispatchEvent(new Event('input', { bubbles: true }));
                                                textElement.dispatchEvent(new Event('change', { bubbles: true }));
                                                console.log(`[Observer] Made writable and re-dispatched events for "${form_key}" after being readOnly.`);
                                            }
                                        });
                                    }
                                }
                            }
                        });

                        // Start observing attributes before we make changes that might trigger page scripts
                        observer.observe(textElement, { attributes: true });

                        const stringValue = String(valueToFill);
                        if (textElement.value !== stringValue) {
                            // Ensure it's enabled right before setting value
                            if (textElement.disabled) textElement.disabled = false;
                            if (textElement.readOnly) textElement.readOnly = false;

                            textElement.value = stringValue;
                            console.log(`Set ${dataType} ${field_type} "${form_key}" to: "${stringValue}".`);
                            filled = true;

                            // Dispatch a sequence of events
                            textElement.dispatchEvent(new Event('focus', { bubbles: true }));
                            textElement.dispatchEvent(new Event('input', { bubbles: true }));
                            
                            if (textElement.hasAttribute('onkeyup')) {
                                textElement.dispatchEvent(new Event('keyup', { bubbles: true }));
                                console.log(`Dispatched 'keyup' for "${form_key}"`);
                            }
                            
                            textElement.dispatchEvent(new Event('change', { bubbles: true }));

                            if (typeof window.setDirty === 'function') {
                                try {
                                    window.setDirty();
                                    console.log(`Called window.setDirty() for ${form_key}`);
                                } catch (e) {
                                    console.warn(`Error calling window.setDirty() for ${form_key}:`, e);
                                }
                            } else if (textElement.getAttribute('onchange')?.includes('setDirty()')) {
                                 console.warn(`window.setDirty function not found for ${form_key}, but was in onchange.`);
                            }
                            
                            textElement.dispatchEvent(new Event('blur', { bubbles: true }));

                        } else {
                            filled = true; // Already correct
                            console.log(`${dataType} ${field_type} "${form_key}" already had correct value.`);
                        }

                        // 2. Ensure the element is enabled and not readOnly AFTER filling and events
                        // This is an immediate check. The observer handles subsequent changes.
                        if (textElement.disabled) {
                            console.log(`Element "${form_key}" was disabled immediately after filling/events (before observer disconnect). Forcing enable.`);
                            textElement.disabled = false;
                        }
                        if (textElement.readOnly) {
                            console.log(`Element "${form_key}" was readOnly immediately after filling/events (before observer disconnect). Forcing writable.`);
                            textElement.readOnly = false;
                        }

                    } finally {
                        // IMPORTANT: Disconnect the observer once we're done with our primary interaction.
                        if (observer) {
                            observer.disconnect();
                            console.log(`[Observer] Disconnected for "${form_key}".`);
                        }

                        // Final attempt to ensure the element is enabled/writable after a very short delay.
                        // This can help if page scripts run slightly after our main logic.
                        setTimeout(() => {
                            if (textElement.disabled) {
                                console.warn(`Element "${form_key}" found disabled after observer disconnect and delay. Forcing enable (final attempt).`);
                                textElement.disabled = false;
                            }
                            if (textElement.readOnly) {
                                console.warn(`Element "${form_key}" found readOnly after observer disconnect and delay. Forcing writable (final attempt).`);
                                textElement.readOnly = false;
                            }

                            // If still disabled after all this, log a more prominent warning.
                            if (textElement.disabled || textElement.readOnly) {
                                 console.error(`CRITICAL: Element "${form_key}" could not be reliably kept enabled/writable. Page interaction might be blocked.`);
                            } else {
                                console.log(`Element "${form_key}" is enabled and writable after all operations.`);
                            }
                        }, 100); // 100ms delay, can be adjusted
                    }

                } else {
                    console.warn(`Cannot fill ${dataType} ${field_type} "${form_key}": Element invalid or null.`);
                }
                break;

                case 'select':
                    const selectElement = elementOrList;
                    if (selectElement?.tagName === 'SELECT') {
                        let optionFound = false;
                        const normalizedValue = String(valueToFill).trim().toLowerCase();
                        // let originalSelectedIndex = selectElement.selectedIndex; // Not strictly needed for this logic
    
                        for (const option of selectElement.options) {
                            const normVal = option.value.trim().toLowerCase();
                            const normText = option.text.trim().toLowerCase();
                            
                            // Match value OR text
                            if (normVal === normalizedValue || normText === normalizedValue) {
                                if (selectElement.value !== option.value) { // Check if change is needed
                                    selectElement.value = option.value; // Set the value directly
                                    console.log(`Set ${dataType} select "${form_key}" to value: "${option.value}" (matched "${valueToFill}").`);
                                    filled = true;
    
                                    // Standard event dispatching - still good practice
                                    selectElement.dispatchEvent(new Event('focus', { bubbles: true }));
                                    selectElement.dispatchEvent(new Event('input', { bubbles: true })); // For frameworks that listen to input
                                    selectElement.dispatchEvent(new Event('change', { bubbles: true })); // Standard change event
                                    selectElement.dispatchEvent(new Event('blur', { bubbles: true }));
    
                                    // Attempt to directly call functions from the onchange attribute
                                    // This is specific to pages with such inline handlers, like ASP.NET __doPostBack
    
                                    // 1. Call setDirty() if it exists
                                    if (typeof window.setDirty === 'function') {
                                        try {
                                            window.setDirty();
                                            console.log(`Called window.setDirty() for ${form_key}`);
                                        } catch (e) {
                                            console.warn(`Error calling window.setDirty() for ${form_key}:`, e);
                                        }
                                    } else {
                                        console.warn(`window.setDirty function not found for ${form_key}.`);
                                    }
    
                                    // 2. Schedule __doPostBack if it exists
                                    // The target for __doPostBack is often the 'name' attribute of the control.
                                    // The onchange attribute provided was:
                                    // onchange="javascript:setDirty();setTimeout('__doPostBack(\'ctl00$SiteContentPlaceHolder$FormView1$dlPrincipalAppTravel$ctl00$ddlPurposeOfTrip\',\'\')', 0)"
                                    // The 'name' attribute of the select element is 'ctl00$SiteContentPlaceHolder$FormView1$dlPrincipalAppTravel$ctl00$ddlPurposeOfTrip'
                                    
                                    const postBackTarget = selectElement.name; // Use the 'name' attribute as it matches the __doPostBack target
                                    const postBackArgument = '';
    
                                    if (typeof window.__doPostBack === 'function') {
                                        if (postBackTarget) {
                                            console.log(`Scheduling __doPostBack for target: '${postBackTarget}' with argument: '${postBackArgument}' for ${form_key}`);
                                            setTimeout(() => {
                                                try {
                                                    window.__doPostBack(postBackTarget, postBackArgument);
                                                    console.log(`Called __doPostBack via setTimeout for ${form_key} using target '${postBackTarget}'`);
                                                } catch (e) {
                                                    console.warn(`Error calling __doPostBack via setTimeout for ${form_key}:`, e);
                                                }
                                            }, 0); // setTimeout with 0 delay to mimic the original handler
                                        } else {
                                            console.warn(`Cannot call __doPostBack: selectElement.name is empty for ${form_key}.`);
                                        }
                                    } else {
                                        console.warn(`window.__doPostBack function not found for ${form_key}. Postback might not occur.`);
                                    }
    
                                } else {
                                    filled = true; // Already correct
                                    console.log(`Select "${form_key}" already had correct value: "${option.value}".`);
                                }
                                optionFound = true;
                                break;
                            }
                        }
                        if (!optionFound) {
                            console.warn(`Could not find option matching "${normalizedValue}" for ${dataType} select "${form_key}".`);
                        }
                    } else {
                        console.warn(`Cannot fill ${dataType} select "${form_key}": Element invalid or null.`);
                    }
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
                        const radioButtons = elementOrList; // This is a NodeList
                        if (radioButtons instanceof NodeList && radioButtons.length > 0) {
                            let radioSelected = false;
                            const stringValueToFill = String(valueToFill);
                            
                            for (const radio of radioButtons) {
                                if (radio.tagName === 'INPUT' && radio.type === 'radio' && radio.value === stringValueToFill) {
                                    let radioObserver = null;
                                    try {
                                        // 1. Ensure the specific radio button is not disabled before checking/changing
                                        if (radio.disabled) {
                                            console.log(`Radio button value "${radio.value}" for group "${form_key}" was disabled. Attempting to enable.`);
                                            radio.disabled = false;
                                        }
        
                                        // Setup a MutationObserver for this specific radio button
                                        radioObserver = new MutationObserver((mutationsList, obs) => {
                                            for (const mutation of mutationsList) {
                                                if (mutation.type === 'attributes' && mutation.attributeName === 'disabled' && radio.disabled) {
                                                    console.warn(`[Observer] Radio button value "${radio.value}" for "${form_key}" was disabled by page script. Forcing re-enable.`);
                                                    queueMicrotask(() => {
                                                        if (radio.disabled) { // Check again
                                                            radio.disabled = false;
                                                            // Re-dispatch click/change if needed, though for radios,
                                                            // ensuring 'checked' and 'enabled' is often key.
                                                            // radio.dispatchEvent(new Event('change', { bubbles: true }));
                                                            console.log(`[Observer] Re-enabled radio value "${radio.value}" for "${form_key}".`);
                                                        }
                                                    });
                                                }
                                            }
                                        });
                                        radioObserver.observe(radio, { attributes: true });
        
                                        if (!radio.checked) {
                                            // Ensure enabled right before checking
                                            if (radio.disabled) radio.disabled = false;
        
                                            radio.checked = true;
                                            radioSelected = true;
                                            filled = true; // Mark as filled for the group
                                            console.log(`Selected ${dataType} radio "${radio.value}" for group "${form_key}".`);
        
                                            // Dispatch events - click is often most important for radios
                                            radio.dispatchEvent(new Event('focus', { bubbles: true }));
                                            radio.dispatchEvent(new Event('click', { bubbles: true })); // Triggers change implicitly
                                            radio.dispatchEvent(new Event('change', { bubbles: true }));
                                            radio.dispatchEvent(new Event('blur', { bubbles: true }));
                                        } else {
                                            radioSelected = true; // Already correct
                                            filled = true;
                                            console.log(`Radio "${radio.value}" for group "${form_key}" was already checked.`);
                                        }
        
                                        // Ensure it's enabled after interaction
                                        if (radio.disabled) {
                                            console.log(`Radio value "${radio.value}" for "${form_key}" was disabled after interaction. Forcing enable.`);
                                            radio.disabled = false;
                                        }
        
                                    } finally {
                                        if (radioObserver) {
                                            radioObserver.disconnect();
                                            console.log(`[Observer] Disconnected for radio value "${radio.value}" in group "${form_key}".`);
                                        }
                                        // Final check for this specific radio after observer disconnect
                                        setTimeout(() => {
                                            if (radio.checked && radio.disabled) { // Only care if it's the one we checked
                                                console.warn(`Radio value "${radio.value}" for "${form_key}" found disabled after observer disconnect and delay. Forcing enable (final attempt).`);
                                                radio.disabled = false;
                                                if (radio.disabled) {
                                                    console.error(`CRITICAL: Radio value "${radio.value}" for "${form_key}" could not be kept enabled.`);
                                                }
                                            }
                                        }, 100);
                                    }
                                    break; // Found and processed the target radio, exit loop
                                }
                            }
                            if (!radioSelected) {
                                console.warn(`Could not find ${dataType} radio with value "${stringValueToFill}" for group "${form_key}".`);
                            }
                        } else {
                            console.warn(`Cannot fill ${dataType} radio group "${form_key}": Invalid/empty element list or not a NodeList.`);
                        }
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

/**
 * Determines the correct value for the US Point of Contact relationship dropdown
 * based on the input string, with specific fallbacks.
 * @param {string} relationshipString - The relationship description from the API.
 * @returns {string} The value attribute of the option to be selected (e.g., "R", "S", "O", or "").
 */
function determineUSContactRelationshipValue(relationshipString) {
    if (!relationshipString || typeof relationshipString !== 'string' || relationshipString.trim() === "") {
        return ""; // Default to "- SELECT ONE -" if no string
    }
    const upperStr = relationshipString.toUpperCase().trim();

    // Define direct text-to-value mappings based on the dropdown's visible text
    const directTextMappings = {
        "RELATIVE": "R",
        "SPOUSE": "S",
        "FRIEND": "C",
        "BUSINESS ASSOCIATE": "B",
        "EMPLOYER": "P",
        "SCHOOL OFFICIAL": "H",
        "OTHER": "O"
    };

    if (directTextMappings[upperStr]) {
        return directTextMappings[upperStr];
    }

    // Keyword-based fallback logic as requested
    if (upperStr.includes("SISTER") ||
        upperStr.includes("BROTHER") ||
        upperStr.includes("MOTHER") ||
        upperStr.includes("FATHER") ||
        upperStr.includes("AUNT") ||
        upperStr.includes("UNCLE") ||
        upperStr.includes("COUSIN") ||
        upperStr.includes("NIECE") ||
        upperStr.includes("NEPHEW") ||
        upperStr.includes("GRANDMOTHER") ||
        upperStr.includes("GRANDFATHER") ||
        upperStr.includes("DAUGHTER") || // Catches "daughter-in-law"
        upperStr.includes("SON") ||      // Catches "son-in-law"
        upperStr.includes("RELATIVE")) { // General catch-all
        console.log(`  [US Contact Relationship] Matched keyword for RELATIVE in "${relationshipString}"`);
        return "R"; // Value for RELATIVE
    }

    // Check for "OTHER" as a keyword if no relative term matched
    if (upperStr.includes("OTHER")) {
        console.log(`  [US Contact Relationship] Matched keyword for OTHER in "${relationshipString}"`);
        return "O"; // Value for OTHER
    }

    // If no direct match or keyword match, default to "OTHER" or ""
    // Let's default to "OTHER" as a final fallback as requested.
    console.warn(`[US Contact Relationship] No specific match for "${relationshipString}". Defaulting to OTHER.`);
    return "O";
}

/**
 * Fills the US Point of Contact "Relationship to You" dropdown.
 * Uses specific logic to map API string to dropdown options, including fallbacks.
 * @param {string} relationshipApiString - The raw relationship string from formData.us_contact_relationship.
 * @param {object} mappedElements - Object containing the mapped DOM elements.
 */
function parseAndFillUSContactRelationship(relationshipApiString, mappedElements) {
    const dropdownKey = "us_contact_relationship_select"; // Matches form_key in mapping
    const dropdownElement = mappedElements[dropdownKey];

    if (!dropdownElement) {
        console.warn(`[US Contact Relationship] Dropdown element for key "${dropdownKey}" not found.`);
        return false;
    }

    const valueToSelect = determineUSContactRelationshipValue(relationshipApiString);
    console.log(`[US Contact Relationship] Input from API: "${relationshipApiString}", Determined value to select in dropdown: "${valueToSelect}"`);

    if (fillElement(dropdownElement, 'select', valueToSelect, dropdownKey, 'dynamic')) {
        console.log(`  [US Contact Relationship] Successfully selected "${valueToSelect}".`);
        return true;
    } else {
        console.warn(`  [US Contact Relationship] Failed to select value "${valueToSelect}" for input "${relationshipApiString}". Attempting default.`);
        // If specific selection failed, try selecting the default "- SELECT ONE -"
        fillElement(dropdownElement, 'select', "", dropdownKey, 'logic_default');
        return false;
    }
}

// Place this with your other helper functions in content.js

/**
 * Parses the spouse's place of birth string (e.g., "City, Country")
 * and fills the city input, country dropdown, and handles the city's "Do Not Know" checkbox.
 * @param {string} pobString - The spouse's POB string from API (e.g., formData.spouse_pob).
 * @param {object} mappedElements - Object containing mapped DOM elements.
 */
function parseAndFillSpousePOB(pobString, mappedElements) {
    console.log(`[Spouse POB] Attempting to parse: "${pobString}"`);
    let filledSomething = false;

    // Define the form_keys for the elements we'll be working with
    const cityFieldKey = "spouse_pob_city_text";
    const cityUnkCheckboxKey = "spouse_pob_city_unk";
    const countryDropdownKey = "spouse_pob_country_select";

    const cityElement = mappedElements[cityFieldKey];
    const cityUnkElement = mappedElements[cityUnkCheckboxKey];
    const countryElement = mappedElements[countryDropdownKey];

    let parsedCity = "";
    let parsedCountry = "";

    if (pobString && typeof pobString === 'string' && pobString.trim() !== "" && pobString.toLowerCase() !== "unknown") {
        const parts = pobString.split(',').map(p => p.trim());
        if (parts.length > 0) {
            parsedCity = parts[0]; // Assume first part is city
        }
        if (parts.length > 1) {
            parsedCountry = parts.slice(1).join(', ').trim(); // Rest is country
        }
        console.log(`  [Spouse POB] Parsed: City="${parsedCity}", Country="${parsedCountry}"`);
    } else {
        console.log(`  [Spouse POB] POB string is empty, null, or "unknown".`);
    }

    // Fill City and handle its "Do Not Know" checkbox
    if (cityElement) {
        if (parsedCity) {
            if (fillElement(cityElement, 'text', parsedCity, cityFieldKey, 'dynamic')) {
                filledSomething = true;
            }
            if (cityUnkElement) { // If city is filled, uncheck "Do Not Know"
                fillElement(cityUnkElement, 'checkbox', false, cityUnkCheckboxKey, 'logic');
            }
        } else { // No city parsed or provided
            fillElement(cityElement, 'text', '', cityFieldKey, 'logic_clear'); // Clear the city field
            if (cityUnkElement) { // Check "Do Not Know"
                fillElement(cityUnkElement, 'checkbox', true, cityUnkCheckboxKey, 'logic_set_na');
            }
        }
    } else {
        console.warn(`  [Spouse POB] City element for key "${cityFieldKey}" not found.`);
    }

    // Fill Country dropdown
    if (countryElement) {
        if (parsedCountry) {
            // fillElement for select should try to match by text (parsedCountry) or value (country code)
            if (fillElement(countryElement, 'select', parsedCountry, countryDropdownKey, 'dynamic')) {
                filledSomething = true;
                console.log(`  [Spouse POB] Selected country: "${parsedCountry}"`);
            } else {
                console.warn(`  [Spouse POB] Could not select country "${parsedCountry}" in dropdown "${countryDropdownKey}". Check if name/code exists.`);
                // If matching failed, reset to default "Select One" if that's desired.
                if (countryElement.options.length > 0) countryElement.selectedIndex = 0;
            }
        } else { // No country parsed, reset dropdown
            console.log(`  [Spouse POB] No country parsed. Resetting country dropdown.`);
            if (countryElement.options.length > 0) countryElement.selectedIndex = 0;
        }
    } else {
        console.warn(`  [Spouse POB] Country dropdown element for key "${countryDropdownKey}" not found.`);
    }

    return filledSomething;
}

// Place this in your "Helper Functions" section of content.js

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

        const specialKeys = ['dob', 'arrival_date', 'departure_date', 'us_stay_address', 'home_address', 'pob_state_na', 'intended_los_value', 'intended_los_unit', 'social_media_presence', 'passport_issue_date', 'passport_expiry_date','spouse_dob_source','employment_start_date_source','employer_school_address_source','prev_emp_1_address_source','prev_emp_1_start_date_source','prev_emp_1_end_date_source','education_1_address_source','education_1_start_date_source','education_1_end_date_source','spouse_pob_source'];
        const dateComponentKeys = ['dob_day', 'dob_month', 'dob_year', 'arrival_date_day', 'arrival_date_month', 'arrival_date_year', 'passport_issue_date_day', 'passport_issue_date_month', 'passport_issue_date_year', 'passport_expiry_date_day', 'passport_expiry_date_month', 'passport_expiry_date_year','employment_start_date_day','employment_start_date_month','employment_start_date_year','prev_emp_1_start_date_day','prev_emp_1_start_date_month','prev_emp_1_start_date_year','prev_emp_1_end_date_day','prev_emp_1_end_date_month','prev_emp_1_end_date_year','education_1_start_date_day','education_1_start_date_month','education_1_start_date_year','education_1_end_date_day','education_1_end_date_month','education_1_end_date_year'];
        const companionComponentKeys = ['companion_surname_1', 'companion_given_name_1', 'companion_relationship_1'];
        const socialMediaComponentKeys = ['social_media_platform_1', 'social_media_identifier_1'];

        if (!api_keys || api_keys.length === 0 || specialKeys.includes(form_key) || dateComponentKeys.includes(form_key) || companionComponentKeys.includes(form_key) || socialMediaComponentKeys.includes(form_key) || form_key === 'national_id_na' || form_key === 'passport_expiry_na' ) {
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
     const usContactRelationshipValue = findValueFromApiKeys(formData, ["us_contact_relationship"]);
     const spousePobValue = findValueFromApiKeys(formData, formFieldMapping.find(m => m.form_key === 'spouse_pob_source')?.api_keys);




     


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

         if (spousePobValue !== undefined) { // Check if the key was present in API data
            parseAndFillSpousePOB(spousePobValue, mappedElements);
        } else {
            console.log("[Main Fill] No spouse_pob data from API. Ensuring POB City 'Do Not Know' is checked if element exists.");
            const cityUnkElement = mappedElements['spouse_pob_city_unk'];
            if (cityUnkElement) {
                 fillElement(cityUnkElement, 'checkbox', true, 'spouse_pob_city_unk', 'logic_no_data');
            }
            const countryElement = mappedElements['spouse_pob_country_select'];
            if (countryElement && countryElement.options.length > 0) countryElement.selectedIndex = 0; // Reset
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

        if (usContactRelationshipValue !== undefined) {
            parseAndFillUSContactRelationship(usContactRelationshipValue, mappedElements);
        } else {
            console.log("[Main Fill] No 'us_contact_relationship' data from API. Dropdown may use default.");
            const pocRelDropdown = mappedElements["us_contact_relationship_select"];
            if (pocRelDropdown && pocRelDropdown.options.length > 0) { // Reset to default if no API value
                fillElement(pocRelDropdown, 'select', "", "us_contact_relationship_select", 'logic_default_no_api_data');
            }
        }

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request.action);
    try {
        const mappedElements = findAndMapFormElements(); // Find elements on message receipt

        if (request.action === "fillForm" && request.data) {
            console.log("Received dynamic form data payload.");
            console.log("Received formData:", JSON.stringify(request.data, null, 2));
            fillHardcodedFields(mappedElements);
            fillForm(request.data, mappedElements);
            sendResponse({ status: "Filling complete." });

            // You'll need to identify the selector for your specific button
           
            // --- END AUTO-REDIRECT LOGIC ---

        } else if (request.action === "fillHardcoded") {
            console.log("Received 'fillHardcoded' action.");
            fillHardcodedFields(mappedElements);
            sendResponse({ status: "Hardcoded filling completed." });


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
    // Return true because sendResponse might be called asynchronously,
    // especially if you add delays or further async operations before navigation.
    return true;

    
});

console.log("Form Filler Content Script initialized. Waiting for messages...");
