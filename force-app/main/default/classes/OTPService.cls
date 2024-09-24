public class OTPService {

    /**
     * Generates an OTP, stores it in the OTP__c object, and (optionally) sends it via email.
     * 
     * @param email The email to which the OTP will be sent.
     * @return A confirmation message that the OTP was sent successfully.
     */
    @AuraEnabled(cacheable=false)
    public static String generateAndSendOTP(String email) {
        // Generate a 6-digit OTP
        String otp = generateOTP(6);

        // Create a new OTP record with an expiration time of 10 minutes from now
        OTP__c otpRecord = new OTP__c(
            Email__c = email,
            OTP__c = otp,
            Expiration_Time__c = DateTime.now().addMinutes(10)  // OTP valid for 10 minutes
        );
        
        // Insert the OTP record into the database
        insert otpRecord;
        
        // Optional: Call the method to send OTP via email (commented out for now)
        // sendOTPEmail(email, otp);
        
        return 'OTP sent successfully';
    }

    /**
     * Verifies if the provided OTP is valid for the given email.
     * 
     * @param email The email associated with the OTP.
     * @param inputOtp The OTP provided by the user.
     * @return True if the OTP is valid, false otherwise.
     */
    @AuraEnabled(cacheable=false)
    public static Boolean verifyOTP(String email, String inputOtp) {
        // Fetch the most recent OTP record for the given email that hasn't expired
        OTP__c otpRecord = [SELECT OTP__c 
                            FROM OTP__c 
                            WHERE Email__c = :email AND Expiration_Time__c >= :DateTime.now() 
                            ORDER BY CreatedDate DESC 
                            LIMIT 1];
        
        // Check if OTP matches and delete the record after successful verification
        if (otpRecord != null && otpRecord.OTP__c == inputOtp) {
            delete otpRecord;  // Optional: Delete or mark OTP as used after verification
            return true;
        }
        return false;
    }

    /**
     * Generates a random numeric OTP of the specified length.
     * 
     * @param length The length of the OTP to generate.
     * @return A randomly generated numeric OTP.
     */
    private static String generateOTP(Integer length) {
        String characters = '0123456789';  // Allowed characters for OTP
        String otp = '';
        
        // Generate OTP of the specified length
        while (length-- > 0) {
            Integer randomIndex = Math.mod(Math.abs(Crypto.getRandomInteger()), characters.length());
            otp += characters.substring(randomIndex, randomIndex + 1);  // Append random character
        }
        
        return otp;
    }

    /**
     * Sends an email with the generated OTP to the user.
     * (Currently commented out, can be enabled if email functionality is required)
     * 
     * @param email The recipient's email address.
     * @param otp The OTP to send in the email.
     */
    /* 
    private static void sendOTPEmail(String email, String otp) {
        Messaging.SingleEmailMessage message = new Messaging.SingleEmailMessage();
        message.setToAddresses(new String[] { email });
        message.setSubject('Your OTP for Verification');
        message.setPlainTextBody('Your OTP is: ' + otp + 
                                 '. Please use this OTP to complete your verification process. It is valid for the next 10 minutes.');
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { message });
    }
    */
}
