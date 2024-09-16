public with sharing class AttendeeEmailService {

    @AuraEnabled
    public static void sendTestEmail(Id attendeeId) {
        try {
            // Fetch the attendee record
            Attendee__c attendee = [SELECT Name__c, Email__c, Event__c, Event__r.Event_Name__c, 
                                    Event__r.Event_Start_Date__c, Event__r.Event_End_Date__c, Event__r.Location__c 
                                    FROM Attendee__c WHERE Id = :attendeeId LIMIT 1];
            
            // Create the email
            Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
            email.setToAddresses(new String[] { attendee.Email__c });
            email.setSubject('Welcome to the Event: ' + attendee.Event__r.Event_Name__c);
            
            // Format the start and end dates for the calendar links
            String eventStart = attendee.Event__r.Event_Start_Date__c.format('yyyyMMdd\'T\'HHmmss\'Z\'');
            String eventEnd = attendee.Event__r.Event_End_Date__c.format('yyyyMMdd\'T\'HHmmss\'Z\'');
            String eventName = attendee.Event__r.Event_Name__c;
            String eventLocation = attendee.Event__r.Location__c;
            
            // Generate the Google Calendar link
            String googleCalendarLink = 'https://www.google.com/calendar/render?action=TEMPLATE&text=' + 
                                        EncodingUtil.urlEncode(eventName, 'UTF-8') + 
                                        '&dates=' + eventStart + '/' + eventEnd + 
                                        '&location=' + EncodingUtil.urlEncode(eventLocation, 'UTF-8') + 
                                        '&sf=true&output=xml';

            // Generate the Outlook Calendar link
            String outlookCalendarLink = 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&subject=' + 
                                         EncodingUtil.urlEncode(eventName, 'UTF-8') + 
                                         '&startdt=' + eventStart + 
                                         '&enddt=' + eventEnd + 
                                         '&location=' + EncodingUtil.urlEncode(eventLocation, 'UTF-8');

            // Email body with Calendar Links
            String emailBody = 'Dear ' + attendee.Name__c + ',\n\n';
            emailBody += 'Thank you for registering for the event: ' + attendee.Event__r.Event_Name__c + '.\n';
            emailBody += 'We look forward to seeing you there!\n\n';
            emailBody += 'You can add this event to your calendar using the following links:\n\n';
            emailBody += 'Google Calendar: ' + googleCalendarLink + '\n';
            emailBody += 'Outlook Calendar: ' + outlookCalendarLink + '\n\n';
            emailBody += 'Best regards,\nThe Event Team';

            // Set the email body
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
