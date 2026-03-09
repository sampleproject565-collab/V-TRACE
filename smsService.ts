// SMS Service using Twilio
// IMPORTANT: You MUST use a Twilio phone number, not your personal number
// Steps:
// 1. Sign up at: https://www.twilio.com/
// 2. Get Account SID and Auth Token from Console Dashboard
// 3. Buy a phone number: Console → Phone Numbers → Buy a Number
// 4. Update the credentials below

const TWILIO_ACCOUNT_SID = 'ACb98cb831092dff486078a8f160d75498'; // Your Account SID
const TWILIO_AUTH_TOKEN = 'bca0ae50d38c5b0556cac65f95aa4487';   // Your Auth Token
const TWILIO_PHONE_NUMBER = '+1 870 432 6829'; // MUST BE A TWILIO NUMBER (buy from Twilio Console)

// NOTE: The phone number above (+919342853720) won't work because it's not a Twilio number
// You need to:
// 1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
// 2. Click "Buy a number"
// 3. Select a country (US numbers are cheapest at $1/month)
// 4. Buy the number
// 5. Replace TWILIO_PHONE_NUMBER above with your purchased number

export const sendOTPViaSMS = async (phoneNumber: string, otp: string): Promise<boolean> => {
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
