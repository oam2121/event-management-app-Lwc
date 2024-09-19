global class SendRecurringFeedbackEmail implements Schedulable {
    
    global void execute(SchedulableContext sc) {
        sendEmails();
    }

    // Method to send feedback emails after the event ends
    public static void sendEmails() {
        // Query events that have ended and feedback has not been sent yet
        List<Event__c> recurringEvents = [SELECT Id, Event_Name__c, Event_End_Date__c, Recurrence__c, Feedback_Sent__c 
                                          FROM Event__c 
                                          WHERE Event_End_Date__c <= :System.now()
                                          AND Feedback_Sent__c = false];

        if (!recurringEvents.isEmpty()) {
            for (Event__c event : recurringEvents) {
                // Get attendees of the event
                List<Attendee__c> attendees = [SELECT Email__c FROM Attendee__c WHERE Event__c = :event.Id];

                // Send feedback emails to all attendees
                for (Attendee__c attendee : attendees) {
                    sendFeedbackEmail(attendee.Email__c, event.Event_Name__c);
                }

                // Mark feedback as sent for this occurrence
                event.Feedback_Sent__c = true;

                // Handle recurrence by updating the event's end date based on recurrence type
                if (event.Recurrence__c == 'Daily') {
                    event.Event_End_Date__c = event.Event_End_Date__c.addDays(1);
                } else if (event.Recurrence__c == 'Weekly') {
                    event.Event_End_Date__c = event.Event_End_Date__c.addDays(7);
                }
                update event; // Update the event with new end date or feedback status
            }
        }
    }

    // Helper method to send feedback email
    private static void sendFeedbackEmail(String email, String eventName) {
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new String[] {email});
        mail.setSubject('We would love your feedback on ' + eventName);
        mail.setPlainTextBody('Thank you for attending ' + eventName + '. Please provide your feedback using the link below: [Feedback Link]');
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
    }

    // Method to schedule the job to run every hour
    public static void scheduleJob() {
        String cronExpression = '0 0 * * * ?'; // Runs every hour
        System.schedule('SendFeedbackEmailsJob', cronExpression, new SendRecurringFeedbackEmail());
    }
}
