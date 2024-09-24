public with sharing class PartyEventController {

    /**
     * Fetches a list of party events from the Event__c object.
     * 
     * @return A list of Event__c records where Type_of_Calendar_Event__c is 'Party Event'.
     */
    @AuraEnabled(cacheable=true)
    public static List<Event__c> getEvents() {
        return [
            SELECT Id, Event_Name__c, Event_Start_Date__c, Event_End_Date__c, Event_Type__c, 
                   Event_Description__c, Location__c, Max_Attendees__c, Price__c
            FROM Event__c
            WHERE Event_Start_Date__c != NULL AND Type_of_Calendar_Event__c = 'Party Event'
        ];
    }

    /**
     * Updates the start date of a party event.
     * 
     * @param eventId The ID of the event to be updated.
     * @param newStartDate The new start date for the event in String format.
     */
    @AuraEnabled
    public static void updateEventDate(Id eventId, String newStartDate) {
        try {
            // Fetch the event record and update the start date
            Event__c eventToUpdate = [SELECT Id, Event_Start_Date__c FROM Event__c WHERE Id = :eventId LIMIT 1];
            eventToUpdate.Event_Start_Date__c = Date.valueOf(newStartDate);  // Convert string to Date
            update eventToUpdate;
        } catch (Exception e) {
            throw new AuraHandledException('Error updating event date: ' + e.getMessage());
        }
    }

    /**
     * Registers a user for a party event and increments the seat count.
     * 
     * @param eventId The ID of the event for registration.
     * @return A map containing success status and a message.
     */
    @AuraEnabled
    public static Map<String, Object> registerForEvent(Id eventId) {
        // Lock the event record for update to avoid concurrency issues with seat allocation
        Event__c event = [SELECT Id, Max_Attendees__c, Seats_Allocated__c 
                          FROM Event__c WHERE Id = :eventId FOR UPDATE];
        Map<String, Object> response = new Map<String, Object>();

        // Check if the event is full
        if (event.Seats_Allocated__c >= event.Max_Attendees__c) {
            response.put('success', false);
            response.put('message', 'Event is already full.');
        } else {
            // Increment the seat count and update the event record
            event.Seats_Allocated__c += 1;
            update event;
            response.put('success', true);
            response.put('message', 'Successfully registered for the event.');
        }

        return response;
    }

    /**
     * Creates a new party event.
     * 
     * @param eventName The name of the event.
     * @param eventDescription The description of the event.
     * @param startDate The start date and time of the event.
     * @param endDate The end date and time of the event.
     * @param eventType The type of the event (e.g., Party).
     * @param location The location of the event.
     * @param maxAttendees The maximum number of attendees allowed.
     * @param price The price of the event.
     * @param calendarEventType The type of calendar event (e.g., 'Party Event').
     * @return The newly created event's ID.
     */
    @AuraEnabled
    public static Id createEvent(String eventName, String eventDescription, Datetime startDate, Datetime endDate, 
                                 String eventType, String location, Integer maxAttendees, Decimal price, 
                                 String calendarEventType) {
        try {
            // Validate mandatory fields
            if (String.isBlank(eventName)) {
                throw new AuraHandledException('Event name is required.');
            }
            if (startDate == null || endDate == null) {
                throw new AuraHandledException('Start and End dates are required.');
            }

            // Create a new Event record
            Event__c newEvent = new Event__c(
                Event_Name__c = eventName,
                Event_Description__c = eventDescription,
                Event_Start_Date__c = startDate,
                Event_End_Date__c = endDate,
                Event_Type__c = eventType,
                Location__c = location,
                Max_Attendees__c = maxAttendees,
                Price__c = price,
                Type_of_Calendar_Event__c = calendarEventType
            );

            // Insert the Event record
            insert newEvent;

            // Return the new event ID
            return newEvent.Id;

        } catch (Exception ex) {
            System.debug('Error creating event: ' + ex.getMessage());
            throw new AuraHandledException(ex.getMessage());
        }
    }

    /**
     * Fetches all party events.
     * 
     * @return A list of Event__c records that are marked as 'Party Event'.
     */
    @AuraEnabled(cacheable=true)
    public static List<Event__c> getPartyEvents() {
        return [SELECT Id, Event_Name__c, Event_Type__c, Event_Start_Date__c, Event_End_Date__c, Location__c, Price__c 
                FROM Event__c WHERE Type_of_Calendar_Event__c = 'Party Event'];
    }

    /**
     * Fetches the details of a specific party event.
     * 
     * @param eventId The ID of the event to fetch details for.
     * @return The Event__c record with detailed information.
     */
    @AuraEnabled(cacheable=true)
    public static Event__c getEventDetails(Id eventId) {
        return [SELECT Id, Event_Name__c, Event_Type__c, Event_Start_Date__c, Event_End_Date__c, Location__c, Price__c 
                FROM Event__c WHERE Id = :eventId LIMIT 1];
    }

    /**
     * Deletes a specific event by ID.
     * 
     * @param eventId The ID of the event to be deleted.
     */
    @AuraEnabled
    public static void deleteEvent(Id eventId) {
        try {
            // Fetch the event record and perform the delete operation
            Event__c eventToDelete = [SELECT Id FROM Event__c WHERE Id = :eventId LIMIT 1];
            delete eventToDelete;
        } catch (DmlException e) {
            throw new AuraHandledException('Error deleting event: ' + e.getMessage());
        }
    }

    /**
     * Retrieves the seating status for an event.
     * 
     * @param eventId The ID of the event.
     * @return A string representing the seating status ('Housefull' or 'Available' with seat count).
     */
    @AuraEnabled(cacheable=true)
    public static String getSeatingStatus(Id eventId) {
        // Fetch the event's seat allocation and max attendees
        Event__c event = [SELECT Seats_Allocated__c, Max_Attendees__c FROM Event__c WHERE Id = :eventId];
        
        // Determine if the event is full or has available seats
        if (event != null) {
            return (event.Seats_Allocated__c >= event.Max_Attendees__c) ? 
                   'Housefull' : 
                   'Available: ' + (event.Max_Attendees__c - event.Seats_Allocated__c);
        }
        return 'No data';
    }
}
