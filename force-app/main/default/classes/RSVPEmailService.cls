public with sharing class RSVPEmailService {

    public static void sendRSVPStatusEmails(List<Attendee__c> attendees) {
        List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();

        for (Attendee__c attendee : attendees) {
            Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();

            // Set email addresses
            email.setToAddresses(new String[] { attendee.Email__c });
            email.setSubject('Your RSVP Status has been updated');

            // Compose HTML email body with inline CSS
            String emailBody = '<!DOCTYPE html>'
                + '<html lang="en">'
                + '<head>'
                + '    <meta charset="UTF-8">'
                + '    <meta name="viewport" content="width=device-width, initial-scale=1.0">'
                + '    <style>'
                + '        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }'
                + '        .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; }'
                + '        .header { background-color: #4CAF50; color: #ffffff; padding: 10px 0; text-align: center; }'
                + '        .header h1 { margin: 0; font-size: 24px; }'
                + '        .content { padding: 20px; color: #333333; }'
                + '        .content h2 { color: #4CAF50; font-size: 20px; }'
                + '        .footer { margin-top: 20px; text-align: center; color: #888888; font-size: 12px; }'
                + '        .status { font-size: 18px; font-weight: bold; color: #4CAF50; }'
                + '        .cancelled { color: #FF0000; font-weight: bold; }'
                + '    </style>'
                + '</head>'
                + '<body>'
                + '    <div class="container">'
                + '        <div class="header">'
                + '            <h1>RSVP Status Update</h1>'
                + '        </div>'
                + '        <div class="content">'
                + '            <h2>Hello ' + attendee.Name__c + ',</h2>';

            // Add content based on RSVP status
            if (attendee.RSVP_Status__c == 'Registered') {
                emailBody += '<p>We are pleased to inform you that your RSVP status has been updated to: '
                           + '<span class="status">Registered</span>. We look forward to seeing you at the event.</p>';
            } else if (attendee.RSVP_Status__c == 'Cancelled') {
                emailBody += '<p>We regret to inform you that your RSVP status has been updated to: '
                           + '<span class="cancelled">Cancelled</span>. We are sorry to hear you won\'t be able to attend the event.</p>';
            }

            // Add footer and closing
            emailBody += '            <p>Best regards,</p>'
                      + '            <p>The Event Team</p>'
                      + '        </div>'
                      + '        <div class="footer">'
                      + '            <p>&copy; 2024 Event Management Team. All rights reserved.</p>'
                      + '        </div>'
                      + '    </div>'
                      + '</body>'
                      + '</html>';

            // Set HTML email body
            email.setHtmlBody(emailBody);

            // Log to verify email is prepared
            System.debug('Preparing to send email to: ' + attendee.Email__c + ' for RSVP status: ' + attendee.RSVP_Status__c);

            emails.add(email);
        }

        // Send the emails
        if (!emails.isEmpty()) {
            Messaging.sendEmail(emails);
            System.debug('Emails sent successfully.');
        } else {
            System.debug('No emails to send.');
        }
    }
}
