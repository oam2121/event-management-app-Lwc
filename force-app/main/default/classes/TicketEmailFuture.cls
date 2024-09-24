public class TicketEmailFuture {
    @future
    public static void sendTicketEmailAsync(List<Id> ticketIds) {
        // Query tickets and send emails
        List<Ticket__c> tickets = [SELECT Ticket_Type__c, Quantity__c, PNR__c, 
                                   Total_Amount__c, Buyer_Name__c, Buyer_Email__c, 
                                   Event__c, 
                                   Event__r.Event_Name__c, Event__r.Location__c, 
                                   Event__r.Event_Start_Date__c, Event__r.Event_End_Date__c 
                                   FROM Ticket__c WHERE Id IN :ticketIds];
        
        for (Ticket__c ticket : tickets) {
            TicketEmailControllerForParty.sendTicketEmail(ticket);
        }
    }
}
