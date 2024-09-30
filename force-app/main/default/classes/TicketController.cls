public with sharing class TicketController {

    @AuraEnabled
    public static Ticket__c createTicket(String buyerName, String buyerEmail, Id eventId, Integer quantity, String ticketType, String paymentStatus, Datetime purchaseDate) {
        try {
            // Get the current user's Id
            String userId = UserInfo.getUserId();
    
            // Retrieve the event details, ensuring the event belongs to the logged-in user
            Event__c event = [SELECT Id, Seats_Allocated__c, Max_Attendees__c, CreatedById 
                              FROM Event__c 
                              WHERE Id = :eventId 
                              AND CreatedById = :userId
                              LIMIT 1];
    
            // Calculate the new potential total of seats allocated
            Integer currentSeatsAllocated = (event.Seats_Allocated__c != null ? (Integer)event.Seats_Allocated__c : 0);
            Integer newSeatsAllocated = currentSeatsAllocated + quantity;
    
            // Check if the new total exceeds the maximum capacity
            if (newSeatsAllocated > event.Max_Attendees__c) {
                throw new AuraHandledException('Seat capacity full. No more tickets can be booked for this event.');
            }
    
            // Create new Ticket record
            Ticket__c newTicket = new Ticket__c();
            newTicket.Buyer_Name__c = buyerName;
            newTicket.Buyer_Email__c = buyerEmail;
            newTicket.Event__c = eventId;
            newTicket.Quantity__c = quantity;
            newTicket.Ticket_Type__c = ticketType;
            newTicket.Payment_Status__c = paymentStatus;
            newTicket.Purchase_Date__c = purchaseDate;
    
            // Insert new Ticket record
            insert newTicket;
    
            // Update the Seats_Allocated__c field on the Event__c record
            event.Seats_Allocated__c = Decimal.valueOf(newSeatsAllocated);
            update event;
    
            // Return the newly created ticket
            return [SELECT Id, Total_Amount__c FROM Ticket__c WHERE Id = :newTicket.Id LIMIT 1];
    
        } catch (Exception e) {
            throw new AuraHandledException('Error creating ticket: ' + e.getMessage());
        }
    }
    
}