public with sharing class RSVPEmailController {

    // Method to send an HTML email with event details and a professional design
    public static void sendRegistrationEmail(Event__c eventRecord, Attendee__c attendee) {
        try {
            // Create the email subject
            String subject = 'Thank you for registering for ' + eventRecord.Event_Name__c;

            // Create the HTML email body with inline CSS for professional design
            String body = '<!DOCTYPE html>'
                        + '<html lang="en">'
                        + '<head>'
                        + '    <meta charset="UTF-8">'
                        + '    <meta http-equiv="X-UA-Compatible" content="IE=edge">'
                        + '    <meta name="viewport" content="width=device-width, initial-scale=1.0">'
                        + '    <style>'
                        + '        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }'
                        + '        .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; }'
                        + '        .header { background-color: #4CAF50; color: #ffffff; padding: 10px 0; text-align: center; }'
                        + '        .header h1 { margin: 0; }'
                        + '        .content { padding: 20px; color: #333333; }'
                        + '        .content h2 { color: #4CAF50; }'
                        + '        .footer { margin-top: 20px; text-align: center; color: #888888; font-size: 12px; }'
                        + '    </style>'
                        + '</head>'
                        + '<body>'
                        + '    <div class="container">'
                        + '        <div class="header">'
                        + '            <h1>Thank You for Registering!</h1>'
                        + '        </div>'
                        + '        <div class="content">'
                        + '            <h2>Hello ' + attendee.Name__c + ',</h2>'
                        + '            <p>Thank you for registering for the event <strong>"' + eventRecord.Event_Name__c + '"</strong>.</p>'
                        + '            <p>Here are the event details:</p>'
                        + '            <ul>'
                        + '                <li><strong>Event Name:</strong> ' + eventRecord.Event_Name__c + '</li>'
                        + '                <li><strong>Location:</strong> ' + eventRecord.Location__c + '</li>'
                        + '                <li><strong>Start Date:</strong> ' + eventRecord.Event_Start_Date__c + '</li>'
                        + '                <li><strong>End Date:</strong> ' + eventRecord.Event_End_Date__c + '</li>'
                        + '            </ul>'
                        + '            <p>We look forward to seeing you at the event!</p>'
                        + '        </div>'
                        + '        <div class="footer">'
                        + '            <p>&copy; 2024 Event Management Team. All rights reserved.</p>'
                        + '        </div>'
                        + '    </div>'
                        + '</body>'
                        + '</html>';

            // Create a single email message
            Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
            email.setToAddresses(new String[] { attendee.Email__c });
            email.setSubject(subject);
            email.setHtmlBody(body); // Use the HTML body

            // Send the email
            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });

        } catch (Exception e) {
            System.debug('Error sending email: ' + e.getMessage());
            throw new AuraHandledException('Error sending email: ' + e.getMessage());
        }
    }
}
