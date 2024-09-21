trigger SendTicketEmailAfterUpdate on Ticket__c (after update) {
    List<Id> ticketsToEmail = new List<Id>();
    
    for (Ticket__c ticket : Trigger.new) {
        // Check if PNR and Total Amount are now populated
        if (ticket.PNR__c != null && ticket.Total_Amount__c != null && 
            (Trigger.oldMap.get(ticket.Id).PNR__c == null || Trigger.oldMap.get(ticket.Id).Total_Amount__c == null)) {
            ticketsToEmail.add(ticket.Id);
        }
    }

    // Call the future method to send the emails after the transaction
    if (!ticketsToEmail.isEmpty()) {
        TicketEmailFuture.sendTicketEmailAsync(ticketsToEmail);
    }
}
