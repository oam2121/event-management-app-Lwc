public with sharing class RSVPController {

    /**
     * Fetches a list of attendees for a specific event.
     * 
     * @param eventId The ID of the event.
     * @return A list of Attendee__c records associated with the event.
     */
    @AuraEnabled(cacheable=true)
    public static List<Attendee__c> getAttendeesForEvent(Id eventId) {
        // Get the current user's Id
        String userId = UserInfo.getUserId();
    
        // Ensure the event is created by the logged-in user before fetching attendees
        Event__c event = [SELECT Id FROM Event__c WHERE Id = :eventId AND CreatedById = :userId LIMIT 1];
    
        // Fetch attendees if the event belongs to the logged-in user
        return [
            SELECT Id, Name__c, Email__c, Phone__c, RSVP_Status__c 
            FROM Attendee__c 
            WHERE Event__c = :eventId
        ];
    }
    

    /**
     * Toggles the RSVP status of an attendee between 'Registered' and 'Cancelled'.
     * 
     * @param attendeeId The ID of the attendee to update.
     */
    @AuraEnabled
public static void toggleRSVPStatus(Id attendeeId) {
    try {
        String userId = UserInfo.getUserId();
        
        // Fetch the attendee and event details
        Attendee__c attendee = [SELECT Id, RSVP_Status__c, Event__c, Email__c 
                                FROM Attendee__c 
                                WHERE Id = :attendeeId LIMIT 1];
        Event__c event = [SELECT CreatedById FROM Event__c WHERE Id = :attendee.Event__c LIMIT 1];

        // Ensure the user is either the event creator or the attendee themselves
        if (userId != event.CreatedById && attendee.Email__c != [SELECT Email FROM User WHERE Id = :userId].Email) {
            throw new AuraHandledException('You are not authorized to update this RSVP.');
        }

        // Toggle RSVP status
        if (attendee.RSVP_Status__c == 'Cancelled') {
            attendee.RSVP_Status__c = 'Registered';
        } else {
            attendee.RSVP_Status__c = 'Cancelled';
        }

        // Update the attendee record
        update attendee;

    } catch (Exception e) {
        throw new AuraHandledException('Error updating RSVP status: ' + e.getMessage());
    }
}


    /**
     * Deletes an RSVP for an attendee and decrements the allocated seats for the event.
     * 
     * @param attendeeId The ID of the attendee to delete.
     */
    @AuraEnabled
public static void deleteRSVP(Id attendeeId) {
    try {
        String userId = UserInfo.getUserId();

        // Fetch the attendee and associated event
        Attendee__c attendee = [SELECT Id, Event__c, Email__c FROM Attendee__c WHERE Id = :attendeeId LIMIT 1];
        Event__c event = [SELECT Id, Seats_Allocated__c, CreatedById FROM Event__c WHERE Id = :attendee.Event__c LIMIT 1];

        // Ensure the user is either the event creator or the attendee themselves
        if (userId != event.CreatedById && attendee.Email__c != [SELECT Email FROM User WHERE Id = :userId].Email) {
            throw new AuraHandledException('You are not authorized to delete this RSVP.');
        }

        // Decrement the Seats_Allocated__c
        if (event.Seats_Allocated__c > 0) {
            event.Seats_Allocated__c -= 1;
        }

        // Delete the attendee record and update the event
        delete attendee;
        update event;

    } catch (Exception e) {
        throw new AuraHandledException('Error deleting RSVP: ' + e.getMessage());
    }
}


    /**
     * Submits a new RSVP for an attendee and sends a confirmation email.
     * 
     * @param eventId The ID of the event to RSVP for.
     * @param attendeeName The name of the attendee.
     * @param attendeeEmail The email address of the attendee.
     * @param attendeePhone The phone number of the attendee.
     * @return A confirmation message indicating successful RSVP submission.
     */
    @AuraEnabled
    public static String submitRSVP(Id eventId, String attendeeName, String attendeeEmail, String attendeePhone) {
        try {
            // Fetch event details
            Event__c eventRecord = [SELECT Id, Event_Name__c, Event_Start_Date__c, Event_End_Date__c, Location__c, Max_Attendees__c, Seats_Allocated__c 
                                    FROM Event__c WHERE Id = :eventId LIMIT 1];

            // Initialize Seats_Allocated__c if null
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

            // Create a new Attendee__c record
            Attendee__c newAttendee = new Attendee__c();
            newAttendee.Event__c = eventRecord.Id;
            newAttendee.Name__c = attendeeName;
            newAttendee.Email__c = attendeeEmail;
            newAttendee.Phone__c = attendeePhone;
            newAttendee.RSVP_Status__c = 'Registered';

            // Insert the attendee record
            insert newAttendee;

            // Increment Seats_Allocated__c
            eventRecord.Seats_Allocated__c += 1;
            update eventRecord;

            // Send the confirmation email using the RSVPEmailController
            RSVPEmailController.sendRegistrationEmail(eventRecord, newAttendee);

            return 'RSVP successfully submitted!';

        } catch (Exception e) {
            throw new AuraHandledException('Error submitting RSVP: ' + e.getMessage());
        }
    }

    /**
     * Fetches a list of upcoming events.
     * 
     * @return A list of Event__c records with a start date from today onward.
     */
    @AuraEnabled(cacheable=true)
public static List<Event__c> getEvents() {
    String userId = UserInfo.getUserId();
    try {
        // Query to fetch events created by the logged-in user that start from today onward
        return [SELECT Id, Event_Name__c 
                FROM Event__c 
                WHERE Event_Start_Date__c >= TODAY 
                AND CreatedById = :userId];
    } catch (Exception e) {
        throw new AuraHandledException('Error fetching events: ' + e.getMessage());
    }
}

}
