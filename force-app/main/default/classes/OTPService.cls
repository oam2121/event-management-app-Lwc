public class OTPService {
    @AuraEnabled(cacheable=false)
    public static String generateAndSendOTP(String email) {
        String otp = generateOTP(6);
        OTP__c otpRecord = new OTP__c(
            Email__c = email,
            OTP__c = otp,
            Expiration_Time__c = DateTime.now().addMinutes(10)  // Set OTP to expire after 10 minutes
        );
        insert otpRecord;
       // sendOTPEmail(email, otp);
        return 'OTP sent successfully';
    }

    @AuraEnabled(cacheable=false)
    public static Boolean verifyOTP(String email, String inputOtp) {
        OTP__c otpRecord = [SELECT OTP__c FROM OTP__c WHERE Email__c = :email AND Expiration_Time__c >= :DateTime.now() ORDER BY CreatedDate DESC LIMIT 1];
        if (otpRecord != null && otpRecord.OTP__c == inputOtp) {
            // Optional: delete the OTP record after successful verification or mark as used
            delete otpRecord;
            return true;
        }
        return false;
    }

    private static String generateOTP(Integer length) {
        String characters = '0123456789';
        String otp = '';
        while(length-- > 0) {
            Integer randomIndex = Math.mod(Math.abs(Crypto.getRandomInteger()), characters.length());
            otp += characters.substring(randomIndex, randomIndex + 1);
        }
        return otp;
    }

  /*  private static void sendOTPEmail(String email, String otp) {
        Messaging.SingleEmailMessage message = new Messaging.SingleEmailMessage();
        message.setToAddresses(new String[] { email });
        message.setSubject('Your OTP for Verification');
        message.setPlainTextBody('Your OTP is: ' + otp + '. Please use this OTP to complete your verification process. It is valid for the next 10 minutes.');
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { message });
    }  */
}  
