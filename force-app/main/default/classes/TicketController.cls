public with sharing class TicketController {

    @AuraEnabled
    public static Ticket__c createTicket(String buyerName, String buyerEmail, Id eventId, Integer quantity, String ticketType, String paymentStatus, Datetime purchaseDate) {
        try {
            // Retrieve the event details to update seats allocated
            Event__c event = [SELECT Id, Seats_Allocated__c, Max_Attendees__c FROM Event__c WHERE Id = :eventId];

            // Calculate the new potential total of seats allocated, ensuring we cast Decimal to Integer
            Integer currentSeatsAllocated = (event.Seats_Allocated__c != null ? (Integer)event.Seats_Allocated__c : 0);
            Integer newSeatsAllocated = currentSeatsAllocated + quantity;

            // Check if the new total exceeds the maximum capacity
            if (newSeatsAllocated > event.Max_Attendees__c) {
                System.debug('Attempted to exceed seat capacity for event: ' + event.Id);
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

            // Update the Seats_Allocated__c field on the Event__c record to the new calculated total
            event.Seats_Allocated__c = Decimal.valueOf(newSeatsAllocated);  // Ensure we are assigning back as Decimal
            update event;

            System.debug('Ticket inserted successfully: ' + newTicket.Id);
            System.debug('Seats allocated updated to: ' + newSeatsAllocated);

            // Send email using a future method
            //TicketEmailFuture.sendTicketEmailAsync(new List<Id>{ newTicket.Id });

            // Return the newly created ticket with the necessary details
            return [SELECT Id, Total_Amount__c FROM Ticket__c WHERE Id = :newTicket.Id LIMIT 1];

        } catch (Exception e) {
            System.debug('Error in createTicket: ' + e.getMessage());
            throw new AuraHandledException('Error creating ticket: ' + e.getMessage());
        }
    }
}
