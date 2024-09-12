trigger AttendeeTrigger on Attendee__c (after update) {
    // Loop through updated records to check for RSVP status changes
    List<Attendee__c> updatedAttendees = new List<Attendee__c>();
    for (Attendee__c attendee : Trigger.new) {
        Attendee__c oldAttendee = Trigger.oldMap.get(attendee.Id);
        
        // Check if RSVP status has changed
        if (attendee.RSVP_Status__c != oldAttendee.RSVP_Status__c) {
            updatedAttendees.add(attendee);
        }
    }

    // If there are any updated attendees, call the EmailService to send the emails
    if (!updatedAttendees.isEmpty()) {
        RSVPEmailService.sendRSVPStatusEmails(updatedAttendees);
    }
}
