// SMS Service using Twilio
// IMPORTANT: You MUST use a Twilio phone number, not your personal number
// Steps:
// 1. Sign up at: https://www.twilio.com/
// 2. Get Account SID and Auth Token from Console Dashboard
// 3. Buy a phone number: Console → Phone Numbers → Buy a Number
// 4. Update the credentials below

// ⚠️ IMPORTANT: Replace these with your actual Twilio credentials
// Get them from: https://console.twilio.com/
const TWILIO_ACCOUNT_SID = 'ACb98cb831092dff486078a8f160d75498'; // Example: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
const TWILIO_AUTH_TOKEN = 'a4ba16763d2448b36ffa4d0801b50137';   // Example: 32 character string
const TWILIO_PHONE_NUMBER = '+18704326829';


// 🔧 DEVELOPMENT MODE: Set to true to bypass SMS and show OTP in console
// ⚠️ PRODUCTION: Set to false to send real SMS via Twilio
const DEV_MODE = false; // Change to false when you have valid Twilio credentials

/*
 * PRODUCTION CHECKLIST:
 * [ ] Sign up at https://www.twilio.com/
 * [ ] Get Account SID from console
 * [ ] Get Auth Token from console
 * [ ] Buy a phone number with SMS capability
 * [ ] Update TWILIO_ACCOUNT_SID above
 * [ ] Update TWILIO_AUTH_TOKEN above
 * [ ] Update TWILIO_PHONE_NUMBER above
 * [ ] Set DEV_MODE = false
 * [ ] Test with a real phone number
 */

export const sendOTPViaSMS = async (phoneNumber: string, otp: string): Promise<boolean> => {
  // Development mode: Just log OTP to console
  if (DEV_MODE) {
    console.log('🔐 DEV MODE - OTP for', phoneNumber, ':', otp);
    console.log('⚠️ In production, set DEV_MODE = false in smsService.ts');
    return true;
  }

  // Production mode: Send via Twilio
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', phoneNumber);
    formData.append('From', TWILIO_PHONE_NUMBER);
    formData.append('Body', `Your V Trace verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Twilio error:', error);
      throw new Error(error.message || 'Failed to send SMS');
    }

    const data = await response.json();
    console.log('SMS sent successfully via Twilio:', data.sid);
    return true;
  } catch (error: any) {
    console.error('Error sending SMS via Twilio:', error);
    throw new Error(error.message || 'Failed to send SMS');
  }
};
