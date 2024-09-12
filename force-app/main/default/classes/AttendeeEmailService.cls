public with sharing class AttendeeEmailService {
    
    @AuraEnabled
    public static void sendTestEmail(Id attendeeId) {
        try {
            // Fetch the attendee record
            Attendee__c attendee = [SELECT Name__c, Email__c, Event__c, Event__r.Event_Name__c 
                                    FROM Attendee__c WHERE Id = :attendeeId LIMIT 1];
            
            // Create the email
            Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
            email.setToAddresses(new String[] { attendee.Email__c });
            email.setSubject('Welcome to the Event: ' + attendee.Event__r.Event_Name__c);
            
            // Email body
            String emailBody = 'Dear ' + attendee.Name__c + ',\n\n';
            emailBody += 'Thank you for registering for the event: ' + attendee.Event__r.Event_Name__c + '.\n';
            emailBody += 'We look forward to seeing you there!\n\n';
            emailBody += 'Best regards,\nThe Event Team';

            email.setPlainTextBody(emailBody);
            
            // Send the email
            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
            System.debug('Email sent to: ' + attendee.Email__c);
        } catch (Exception e) {
            System.debug('Error sending email: ' + e.getMessage());
            throw new AuraHandledException('Error sending email: ' + e.getMessage());
        }
    }
}
