public with sharing class RSVPController {

    // Method to fetch attendees for an event
    @AuraEnabled(cacheable=true)
    public static List<Attendee__c> getAttendeesForEvent(Id eventId) {
        return [
            SELECT Id, Name__c, Email__c, Phone__c, RSVP_Status__c 
            FROM Attendee__c 
            WHERE Event__c = :eventId
        ];
    }

    // Method to toggle RSVP status
    @AuraEnabled
    public static void toggleRSVPStatus(Id attendeeId) {
        try {
            Attendee__c attendee = [SELECT Id, RSVP_Status__c FROM Attendee__c WHERE Id = :attendeeId LIMIT 1];

            // Toggle between 'Cancelled' and 'Registered'
            if (attendee.RSVP_Status__c == 'Cancelled') {
                attendee.RSVP_Status__c = 'Registered';
            } else {
                attendee.RSVP_Status__c = 'Cancelled';
            }
            update attendee;

        } catch (Exception e) {
            throw new AuraHandledException('Error updating RSVP status: ' + e.getMessage());
        }
    }

    // Method to delete an RSVP and decrement Seats_Allocated__c
    @AuraEnabled
    public static void deleteRSVP(Id attendeeId) {
        try {
            // Fetch the attendee and associated event
            Attendee__c attendee = [SELECT Id, Event__c FROM Attendee__c WHERE Id = :attendeeId LIMIT 1];

            // Fetch the event and decrement Seats_Allocated__c
            Event__c event = [SELECT Id, Seats_Allocated__c FROM Event__c WHERE Id = :attendee.Event__c LIMIT 1];
            if (event.Seats_Allocated__c > 0) {
                event.Seats_Allocated__c = event.Seats_Allocated__c - 1;
            }

            // Delete the attendee record and update the event
            delete attendee;
            update event;

        } catch (Exception e) {
            throw new AuraHandledException('Error deleting RSVP: ' + e.getMessage());
        }
    }

    // Method to submit RSVP and send a confirmation email
    @AuraEnabled
    public static String submitRSVP(Id eventId, String attendeeName, String attendeeEmail, String attendeePhone) {
        // Fetch the event record, including Seats_Allocated__c and Max_Attendees__c
        Event__c eventRecord = [SELECT Id, Event_Name__c, Event_Start_Date__c, Event_End_Date__c, Location__c, Max_Attendees__c, Seats_Allocated__c 
                                FROM Event__c WHERE Id = :eventId LIMIT 1];

        // Initialize Seats_Allocated__c to 0 if it's null
        if (eventRecord.Seats_Allocated__c == null) {
            eventRecord.Seats_Allocated__c = 0;
        }

        // Check if the event is full
        if (eventRecord.Max_Attendees__c == eventRecord.Seats_Allocated__c) {
            throw new AuraHandledException('The event is full. No more RSVPs can be accepted.');
        }

        // Check if the email has already RSVP'd for this event
        List<Attendee__c> existingRSVPs = [SELECT Id FROM Attendee__c WHERE Event__c = :eventId AND Email__c = :attendeeEmail LIMIT 1];
        if (!existingRSVPs.isEmpty()) {
            throw new AuraHandledException('You have already RSVP\'d for this event.');
        }

        // Create the new Attendee__c record and set status to Registered
        Attendee__c newAttendee = new Attendee__c();
        newAttendee.Event__c = eventRecord.Id;
        newAttendee.Name__c = attendeeName;
        newAttendee.Email__c = attendeeEmail;
        newAttendee.Phone__c = attendeePhone;
        newAttendee.RSVP_Status__c = 'Registered';

        insert newAttendee;

        // Increment Seats_Allocated__c now that a new attendee is registered
        eventRecord.Seats_Allocated__c = eventRecord.Seats_Allocated__c + 1;
        update eventRecord;

        // Send the email using the RSVPEmailController
        RSVPEmailController.sendRegistrationEmail(eventRecord, newAttendee);

        return 'RSVP successfully submitted!';
    }

    // Method to get event details
    @AuraEnabled(cacheable=true)
    public static List<Event__c> getEvents() {
        try {
            // Fetch events that have a start date from today onward
            return [SELECT Id, Event_Name__c FROM Event__c WHERE Event_Start_Date__c >= TODAY];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching events: ' + e.getMessage());
        }
    }

    // Method to submit RSVP and send a confirmation email
    @AuraEnabled
    public static String submitPartyRSVP(Id eventId, String attendeeName, String attendeeEmail, String attendeePhone) {
        // Fetch the event record, including Seats_Allocated__c and Max_Attendees__c
        Event__c eventRecord = [SELECT Id, Event_Name__c, Event_Start_Date__c, Event_End_Date__c, Location__c, Max_Attendees__c, Seats_Allocated__c 
                                FROM Event__c WHERE Id = :eventId LIMIT 1];

        // Initialize Seats_Allocated__c to 0 if it's null
        if (eventRecord.Seats_Allocated__c == null) {
            eventRecord.Seats_Allocated__c = 0;
        }

        // Check if the event is full
        if (eventRecord.Max_Attendees__c == eventRecord.Seats_Allocated__c) {
            throw new AuraHandledException('The event is full. No more RSVPs can be accepted.');
        }

        // Check if the email has already RSVP'd for this event
        List<Attendee__c> existingRSVPs = [SELECT Id FROM Attendee__c WHERE Event__c = :eventId AND Email__c = :attendeeEmail LIMIT 1];
        if (!existingRSVPs.isEmpty()) {
            throw new AuraHandledException('You have already RSVP\'d for this event.');
        }

        // Create the new Attendee__c record and set status to Registered
        Attendee__c newAttendee = new Attendee__c();
        newAttendee.Event__c = eventRecord.Id;
        newAttendee.Name__c = attendeeName;
        newAttendee.Email__c = attendeeEmail;
        newAttendee.Phone__c = attendeePhone;
        newAttendee.RSVP_Status__c = 'Registered';

        insert newAttendee;

        // Increment Seats_Allocated__c now that a new attendee is registered
        eventRecord.Seats_Allocated__c = eventRecord.Seats_Allocated__c + 1;
        update eventRecord;

        // Send the email using the RSVPEmailController
        RSVPEmailController.sendPartyEventEmail(eventRecord, newAttendee);

        return 'RSVP successfully submitted!';
    }



    
}
