public class TicketEmailFuture {

    /**
     * Asynchronously sends ticket confirmation emails for a list of Ticket__c records.
     * This method runs in the background using the @future annotation.
     * 
     * @param ticketIds List of Ticket__c IDs for which the emails will be sent.
     */
    @future
    public static void sendTicketEmailAsync(List<Id> ticketIds) {
        // Query the Ticket__c records along with related event details
        List<Ticket__c> tickets = [SELECT Ticket_Type__c, Quantity__c, PNR__c, Total_Amount__c, 
                                   Buyer_Name__c, Buyer_Email__c, Event__c, 
                                   Event__r.Event_Name__c, Event__r.Location__c, 
                                   Event__r.Event_Start_Date__c, Event__r.Event_End_Date__c 
                                   FROM Ticket__c WHERE Id IN :ticketIds];
        
        // Loop through each ticket and send the email using the TicketEmailControllerForParty
        for (Ticket__c ticket : tickets) {
            TicketEmailControllerForParty.sendTicketEmail(ticket);
        }
    }
}
