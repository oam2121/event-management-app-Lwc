public with sharing class TicketController {

    @AuraEnabled
    public static void createTicket(String buyerName, String buyerEmail, Id eventId, Integer quantity, String ticketType, String paymentStatus, Datetime purchaseDate) {
        try {
            // Debug to check the input data
            System.debug('Ticket Data received: ' + buyerName + ', ' + buyerEmail + ', ' + eventId + ', ' + quantity + ', ' + ticketType + ', ' + paymentStatus + ', ' + purchaseDate);

            // Create new Ticket record
            Ticket__c newTicket = new Ticket__c();
            newTicket.Buyer_Name__c = buyerName;
            newTicket.Buyer_Email__c = buyerEmail;
            newTicket.Event__c = eventId;
            newTicket.Quantity__c = quantity;
            newTicket.Ticket_Type__c = ticketType;
            newTicket.Payment_Status__c = paymentStatus;
            newTicket.Purchase_Date__c = purchaseDate; // Pass the DateTime directly

            // Insert new Ticket record
            insert newTicket;

            System.debug('Ticket inserted successfully: ' + newTicket.Id);

            // At this point, don't send the email immediately. Call the future method.
            TicketEmailFuture.sendTicketEmailAsync(new List<Id>{ newTicket.Id });

        } catch (Exception e) {
            System.debug('Error in createTicket: ' + e.getMessage());
            throw new AuraHandledException('Error creating ticket: ' + e.getMessage());
        }
    }
}
