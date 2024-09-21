public with sharing class TicketEmailController {

    public static void sendTicketEmail(Ticket__c ticket) {
        try {
            Event__c eventDetails = getEventDetails(ticket.Event__c);
            String emailBody = buildProfessionalEmailBody(ticket, eventDetails);

            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[] { ticket.Buyer_Email__c });
            mail.setSubject('Your Party Event Ticket Confirmation for ' + eventDetails.Event_Name__c);
            mail.setHtmlBody(emailBody);

            Messaging.SendEmailResult[] emailResults = Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });

            if (emailResults == null || !emailResults[0].isSuccess()) {
                System.debug('Failed to send email to ' + ticket.Buyer_Email__c);
            }

        } catch (Exception e) {
            throw new AuraHandledException('Error sending ticket email: ' + e.getMessage());
        }
    }

    private static Event__c getEventDetails(Id eventId) {
        return [SELECT Event_Name__c, Location__c, Event_Start_Date__c, Event_End_Date__c 
                FROM Event__c WHERE Id = :eventId LIMIT 1];
    }

    private static String buildProfessionalEmailBody(Ticket__c ticket, Event__c eventDetails) {
        // Format the start and end dates for calendar links
        String eventStart = formatDateForCalendar(eventDetails.Event_Start_Date__c);
        String eventEnd = formatDateForCalendar(eventDetails.Event_End_Date__c);
        String eventName = eventDetails.Event_Name__c;
        String eventLocation = eventDetails.Location__c;

        // Google Calendar link
        String googleCalendarLink = 'https://www.google.com/calendar/render?action=TEMPLATE&text=' + 
                                    EncodingUtil.urlEncode(eventName, 'UTF-8') + 
                                    '&dates=' + eventStart + '/' + eventEnd + 
                                    '&location=' + EncodingUtil.urlEncode(eventLocation, 'UTF-8');

        // Outlook Calendar link
        String outlookCalendarLink = 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&subject=' + 
                                     EncodingUtil.urlEncode(eventName, 'UTF-8') + 
                                     '&startdt=' + eventStart + '&enddt=' + eventEnd + 
                                     '&location=' + EncodingUtil.urlEncode(eventLocation, 'UTF-8');

        // Building the HTML email body with a black & gold-purple gradient theme
        String emailBody = '<html><body style="font-family: Arial, sans-serif;  background: linear-gradient(to right, #00c6ff, #0072ff); padding: 20px; color: white;">';
        emailBody += '<div style="max-width: 600px; margin: 0 auto; background-color: rgba(0, 0, 0, 0.8); padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);">';

        // Header
        emailBody += '<h1 style="color: gold; text-align: center;">🎉 Your Party Event Ticket Confirmation 🎉</h1>';

        // Event Details
        emailBody += '<table style="width: 100%; border-spacing: 0; border-collapse: collapse; font-size: 14px; margin-bottom: 20px; color: white;">';
        emailBody += '<tr><td style="padding: 12px; border: 1px solid gold;"><strong>Event Name:</strong></td><td style="padding: 12px; border: 1px solid gold;">' + eventDetails.Event_Name__c + '</td></tr>';
        emailBody += '<tr><td style="padding: 12px; border: 1px solid gold;"><strong>Location:</strong></td><td style="padding: 12px; border: 1px solid gold;">' + eventDetails.Location__c + '</td></tr>';
        emailBody += '<tr><td style="padding: 12px; border: 1px solid gold;"><strong>Date:</strong></td><td style="padding: 12px; border: 1px solid gold;">' + eventDetails.Event_Start_Date__c.format('MMMM dd, yyyy') + ' to ' + eventDetails.Event_End_Date__c.format('MMMM dd, yyyy') + '</td></tr>';
        emailBody += '</table>';

        // Ticket Details
        emailBody += '<table style="width: 100%; border-spacing: 0; border-collapse: collapse; font-size: 14px; color: white;">';
        emailBody += '<tr><td style="padding: 12px; border: 1px solid gold;"><strong>Buyer Name:</strong></td><td style="padding: 12px; border: 1px solid gold;">' + ticket.Buyer_Name__c + '</td></tr>';
        emailBody += '<tr><td style="padding: 12px; border: 1px solid gold;"><strong>Buyer Email:</strong></td><td style="padding: 12px; border: 1px solid gold;"><a href="mailto:' + ticket.Buyer_Email__c + '" style="color: gold;">' + ticket.Buyer_Email__c + '</a></td></tr>';
        emailBody += '<tr><td style="padding: 12px; border: 1px solid gold;"><strong>Ticket Type:</strong></td><td style="padding: 12px; border: 1px solid gold;">' + ticket.Ticket_Type__c + '</td></tr>';
        emailBody += '<tr><td style="padding: 12px; border: 1px solid gold;"><strong>Quantity:</strong></td><td style="padding: 12px; border: 1px solid gold;">' + ticket.Quantity__c + '</td></tr>';
        emailBody += '<tr><td style="padding: 12px; border: 1px solid gold;"><strong>PNR:</strong></td><td style="padding: 12px; border: 1px solid gold;">' + ticket.PNR__c + '</td></tr>';
        emailBody += '<tr><td style="padding: 12px; border: 1px solid gold;"><strong>Total Amount:</strong></td><td style="padding: 12px; border: 1px solid gold;">' + ticket.Total_Amount__c + '</td></tr>';
        emailBody += '</table>';

        // Add to Calendar Buttons with new Gradient
        emailBody += '<div style="text-align: center; margin: 20px 0;">';
        emailBody += '<a href="' + googleCalendarLink + '" style="text-decoration: none; padding: 10px 20px; background: linear-gradient(to right, #f85032, #e73827); color: white; border-radius: 4px; font-size: 14px; margin-right: 10px;">Add to Google Calendar</a>';
        emailBody += '<a href="' + outlookCalendarLink + '" style="text-decoration: none; padding: 10px 20px; background: linear-gradient(to right, #b06ab3, #4568dc); color: white; border-radius: 4px; font-size: 14px;">Add to Outlook Calendar</a>';
        emailBody += '</div>';

        // Footer
        emailBody += '<div style="background-color: gold; color: black; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">';
        emailBody += '<p>🎉 Get ready to party! 🎉</p>';
        emailBody += '</div>';

        emailBody += '</div></body></html>';
        return emailBody;
    }

    private static String formatDateForCalendar(DateTime dt) {
        return dt.formatGmt('yyyyMMdd\'T\'HHmmss\'Z\'');
    }
}
