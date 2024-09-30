public with sharing class CalendarController {
    
    /**
     * Retrieves a list of corporate events.
     * 
     * @return List of Event__c records
     */
   
   /**
     * Retrieves a list of corporate events for the logged-in user.
     * 
     * @return List of Event__c records
     */
    @AuraEnabled(cacheable=true)
    public static List<Event__c> getEvents() {
        // Get the current user Id
        String userId = UserInfo.getUserId();

        // Query to fetch events that are marked as 'Corporate' and are created by the logged-in user
        return [
            SELECT Id, Event_Name__c, Event_Start_Date__c, Event_End_Date__c, Event_Type__c, 
                   Event_Description__c, Location__c, Meeting_Link__c
            FROM Event__c
            WHERE Event_Start_Date__c != NULL 
            AND Type_of_Calendar_Event__c = 'Corporate'
            AND CreatedById = :userId // Only fetch events created by the logged-in user
        ];
    }

    /**
     * Updates the start date of an event.
     * 
     * @param eventId The ID of the event to update
     * @param newStartDate The new start date of the event as a string
     */
    @AuraEnabled
    public static void updateEventDate(Id eventId, String newStartDate) {
        try {
            // Fetch the current event to update its start date
            Event__c eventToUpdate = [SELECT Id, Event_Start_Date__c FROM Event__c WHERE Id = :eventId LIMIT 1];
            eventToUpdate.Event_Start_Date__c = Date.valueOf(newStartDate); // Convert string to Date
            update eventToUpdate;
        } catch (Exception e) {
            // Handle exceptions by throwing a user-friendly error message
            throw new AuraHandledException('Error updating event date: ' + e.getMessage());
        }
    }

    /**
     * Registers a user for an event, incrementing the seat count.
     * 
     * @param eventId The ID of the event for registration
     * @return A map containing the success status and message
     */
    @AuraEnabled
    public static Map<String, Object> registerForEvent(Id eventId) {
        // Lock the record for update to ensure accurate seat allocation
        Event__c event = [SELECT Id, Max_Attendees__c, Seats_Allocated__c FROM Event__c WHERE Id = :eventId FOR UPDATE];
        Map<String, Object> response = new Map<String, Object>();

        // Check if the event is already full
        if (event.Seats_Allocated__c >= event.Max_Attendees__c) {
            response.put('success', false);
            response.put('message', 'Event is already full.');
        } else {
            event.Seats_Allocated__c += 1; // Increment the seat count
            update event;
            response.put('success', true);
            response.put('message', 'Successfully registered for the event.');
        }

        return response;
    }

    /**
     * Creates a new event with given parameters.
     * 
     * @param eventName Name of the event
     * @param eventDescription Description of the event
     * @param startDate Start date and time of the event
     * @param endDate End date and time of the event
     * @param eventType Type of the event
     * @param location Location of the event
     * @param maxAttendees Maximum attendees allowed
     * @param meetingLink Link to the meeting
     * @param recurrence Recurrence information
     * @return The newly created event's ID
     */
    @AuraEnabled
    public static Id createEvent(String eventName, String eventDescription, Datetime startDate, Datetime endDate, 
                                 String eventType, String location, Integer maxAttendees, String meetingLink, 
                                 String recurrence) {
        // Validate event start and end dates
        if (startDate < Datetime.now()) {
            throw new AuraHandledException('The start date cannot be in the past.');
        }
        if (endDate < startDate) {
            throw new AuraHandledException('The end date cannot be earlier than the start date.');
        }

        // Create a new event record
        Event__c newEvent = new Event__c(
            Event_Name__c = eventName,
            Event_Description__c = eventDescription,
            Event_Start_Date__c = startDate,
            Event_End_Date__c = endDate,
            Event_Type__c = eventType,
            Location__c = location,
            Max_Attendees__c = maxAttendees,
            Seats_Allocated__c = 0, // Initialize seats allocated
            Meeting_Link__c = meetingLink,
            Recurrence__c = recurrence
        );
        insert newEvent;

        // Handle recurrence if applicable
        if (recurrence != 'None') {
            EventRecurrenceService.handleEventRecurrence(new List<Event__c> { newEvent });
        }

        return newEvent.Id;
    }
}
