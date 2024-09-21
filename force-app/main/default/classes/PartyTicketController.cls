public with sharing class TicketEmailController {

    public static void sendTicketEmail(Ticket__c ticket, Event__c eventDetails) {
        try {
            // Create party-themed HTML email body
            String emailBody = buildPartyEmailBody(ticket, eventDetails);

            // Generate PDF for the ticket
            Blob pdfBlob = generatePDF(ticket, eventDetails);

            // Create email message
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[] { ticket.Buyer_Email__c });
            mail.setSubject('Your Party Event Ticket Confirmation for ' + eventDetails.Event_Name__c);
            mail.setHtmlBody(emailBody); // Set the party-themed HTML body

            // Attach PDF to the email
            Messaging.EmailFileAttachment attachment = new Messaging.EmailFileAttachment();
            attachment.setFileName('Ticket_Confirmation_' + ticket.PNR__c + '.pdf');
            attachment.setBody(pdfBlob);
            mail.setFileAttachments(new Messaging.EmailFileAttachment[] { attachment });

            // Send email
            Messaging.SendEmailResult[] emailResults = Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });

            // Debug Email Result
            if (emailResults != null && emailResults[0].isSuccess()) {
                System.debug('Email sent successfully to ' + ticket.Buyer_Email__c);
            } else {
                System.debug('Failed to send email to ' + ticket.Buyer_Email__c);
            }

        } catch (Exception e) {
            System.debug('Error in sendTicketEmail: ' + e.getMessage());
            throw new AuraHandledException('Error sending ticket email: ' + e.getMessage());
        }
    }

    // Helper method to build the party-themed HTML body
    private static String buildPartyEmailBody(Ticket__c ticket, Event__c eventDetails) {
        String emailBody = '<html><body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">';
        emailBody += '<div style="max-width: 600px; background-color: #fff; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">';
        emailBody += '<div style="background-color: #ff4d4d; color: #fff; text-align: center; padding: 20px; border-radius: 8px 8px 0 0;">';
        emailBody += '<h1 style="margin: 0;">🎉 Party Event Ticket Confirmation 🎉</h1>';
        emailBody += '</div>';
        emailBody += '<div style="padding: 20px; text-align: center;">';
        emailBody += '<h2>' + eventDetails.Event_Name__c + '</h2>';
        emailBody += '<p><strong>Location:</strong> ' + eventDetails.Location__c + '</p>';
        emailBody += '<p><strong>Date:</strong> ' + eventDetails.Event_Start_Date__c.format('MMMM dd, yyyy') + ' to ' + eventDetails.Event_End_Date__c.format('MMMM dd, yyyy') + '</p>';
        emailBody += '<p><strong>Ticket Type:</strong> ' + ticket.Ticket_Type__c + '</p>';
        emailBody += '<p><strong>Quantity:</strong> ' + ticket.Quantity__c + '</p>';
        emailBody += '<p><strong>PNR:</strong> ' + ticket.PNR__c + '</p>';
        emailBody += '</div>';
        emailBody += '<div style="background-color: #ff4d4d; color: #fff; text-align: center; padding: 10px; border-radius: 0 0 8px 8px;">';
        emailBody += '<p style="margin: 0;">🎉 Get ready to party! 🎉</p>';
        emailBody += '</div>';
        emailBody += '</div>';
        emailBody += '</body></html>';
        return emailBody;
    }

    // Helper method to generate the PDF
    private static Blob generatePDF(Ticket__c ticket, Event__c eventDetails) {
        PageReference pdfPage = Page.PartyTicketPDF; // Visualforce page that renders the PDF
        pdfPage.getParameters().put('ticketId', ticket.Id);
        return pdfPage.getContentAsPDF();
    }
}
