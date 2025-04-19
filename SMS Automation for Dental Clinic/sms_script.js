function sendSemaphoreSMS(phoneNumber, message) {
    // --- Replace with your actual Semaphore API Key ---
    const apiKey = "INSERT API KEY HERE";
    const apiUrl = "INSERT API URL HERE (SEE DOCUMENTATION OF 3RD PARTY SMS GATEWAY)";
  
    const payload = {
      apikey: apiKey,
      number: phoneNumber,
      message: message
    };
  
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
  
    try {
      const response = UrlFetchApp.fetch(apiUrl, options);
      const responseText = response.getContentText();
      Logger.log("Semaphore API Response: " + responseText);
  
      // Parse the JSON response
      const jsonResponse = JSON.parse(responseText);
  
      // Check if the response is an array and if the first element has a message_id
      if (Array.isArray(jsonResponse) && jsonResponse.length > 0 && jsonResponse[0].message_id) {
        return true; // SMS sent successfully
      } else {
        Logger.log("Semaphore API Error: " + responseText); // Log the full response for debugging
        return false; // SMS sending failed
      }
  
    } catch (error) {
      Logger.log("Error sending SMS: " + error);
      return false; // Error during the API call
    }
  }
  
  function sendAppointmentReminders() {
    const SHEET_NAME = "Sheet1"; // Replace with your actual sheet name
    const NAME_COLUMN = 1;
    const PROCEDURE_COLUMN = 2; // New column for Procedure Name
    const PHONE_COLUMN = 3;
    const DATE_COLUMN = 4;
    const TIME_COLUMN = 5;
    const STATUS_COLUMN = 6;     // Adjust if you have this column
    const SMS_SENT_VALUE = "Reminder Sent";
    const HOURS_BEFORE_REMINDER = 2;
  
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const now = new Date();
    const timeZone = Session.getTimeZone();
  
    for (let i = 1; i < data.length; i++) {
      const name = data[i][NAME_COLUMN - 1];
      const procedure = data[i][PROCEDURE_COLUMN - 1]; // Get the procedure name
      let phoneNumber = data[i][PHONE_COLUMN - 1];
      const appointmentDateValue = data[i][DATE_COLUMN - 1];
      const appointmentTimeValue = data[i][TIME_COLUMN - 1];
      const status = data[i][STATUS_COLUMN - 1];
  
      if (STATUS_COLUMN && status === SMS_SENT_VALUE) {
        continue;
      }
  
      try {
        let appointmentDateTime;
  
        try {
          // Ensure appointmentDateValue is treated as a Date object
          const appointmentDate = new Date(appointmentDateValue);
          const year = appointmentDate.getFullYear();
          const month = Utilities.formatDate(appointmentDate, timeZone, "MM"); // Get month with leading zero
          const day = Utilities.formatDate(appointmentDate, timeZone, "dd");   // Get day with leading zero
          const timeString = Utilities.formatDate(new Date(appointmentTimeValue), timeZone, "HH:mm:ss"); // Use 24-hour format
  
          const combinedDateTimeString = `${year}-${month}-${day}T${timeString}`;
  
          appointmentDateTime = new Date(combinedDateTimeString);
  
          // Check if the date was parsed correctly
          if (isNaN(appointmentDateTime.getTime())) {
            Logger.log(`Error: Could not parse combined date/time string: "${combinedDateTimeString}" in row ${i + 1}`);
            if (STATUS_COLUMN) {
              sheet.getRange(i + 1, STATUS_COLUMN).setValue(`Date/Time Parse Error`);
            }
            continue; // Skip to the next row
          }
        } catch (dateError) {
          Logger.log(`Error converting date/time in row ${i + 1}: ${dateError}`);
          if (STATUS_COLUMN) {
            sheet.getRange(i + 1, STATUS_COLUMN).setValue(`Date/Time Error: ${dateError}`);
          }
          continue; // Skip to the next row
        }
  
        const timeDifferenceHours = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
        if (timeDifferenceHours > 0 && timeDifferenceHours <= HOURS_BEFORE_REMINDER) {
          const message = `Hi ${name}! Just a reminder for your ${procedure} appointment on ${Utilities.formatDate(appointmentDateTime, timeZone, "MMMM dd,")} at ${Utilities.formatDate(appointmentDateTime, timeZone, "h:mm a")}.`; // Updated message
  
          Logger.log(`DEBUG: Phone Number being sent to sendSemaphoreSMS: "${phoneNumber.trim()}"`);
          const sentSuccessfully = sendSemaphoreSMS(phoneNumber.trim(), message);
  
          if (STATUS_COLUMN) {
            sheet.getRange(i + 1, STATUS_COLUMN).setValue(sentSuccessfully ? SMS_SENT_VALUE : "Reminder Failed");
          }
          Utilities.sleep(1000);
        }
      } catch (error) {
        Logger.log(`Error processing row ${i + 1}: ${error}`);
        if (STATUS_COLUMN) {
          sheet.getRange(i + 1, STATUS_COLUMN).setValue(`Error: ${error}`);
        }
      }
    }
  }