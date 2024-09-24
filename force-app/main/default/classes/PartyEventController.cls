public with sharing class PartyEventController {
    
    @AuraEnabled(cacheable=true)
    public static List<Event__c> getEvents() {
        return [
            SELECT Id, 
                   Event_Name__c, 
                   Event_Start_Date__c, 
                   Event_End_Date__c, 
                   Event_Type__c, 
                   Event_Description__c,
                   Location__c,
                   Max_Attendees__c,
                   Price__c
            FROM Event__c
            WHERE Event_Start_Date__c != NULL AND Type_of_Calendar_Event__c = 'Party Event'
        ];
    }

    @AuraEnabled
    public static void updateEventDate(Id eventId, String newStartDate) {
        try {
            Event__c eventToUpdate = [SELECT Id, Event_Start_Date__c FROM Event__c WHERE Id = :eventId LIMIT 1];
            eventToUpdate.Event_Start_Date__c = Date.valueOf(newStartDate); // Convert string to Date type in Apex
            update eventToUpdate;
        } catch (Exception e) {
            throw new AuraHandledException('Error updating event date: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static Map<String, Object> registerForEvent(Id eventId) {
        Event__c event = [SELECT Id, Max_Attendees__c, Seats_Allocated__c FROM Event__c WHERE Id = :eventId FOR UPDATE];
        Map<String, Object> response = new Map<String, Object>();

        if (event.Seats_Allocated__c >= event.Max_Attendees__c) {
            response.put('success', false);
            response.put('message', 'Event is already full.');
        } else {
            event.Seats_Allocated__c += 1;
            update event;
            response.put('success', true);
            response.put('message', 'Successfully registered for the event.');
        }

        return response;
    }

    
    @AuraEnabled
    public static Id createEvent(String eventName, String eventDescription, Datetime startDate, Datetime endDate, String eventType, String location, Integer maxAttendees, Decimal price, String calendarEventType) {
        try {
            // Validate mandatory fields
            if (String.isBlank(eventName)) {
                throw new AuraHandledException('Event name is required');
            }
            if (startDate == null || endDate == null) {
                throw new AuraHandledException('Start and End dates are required');
            }

            // Create new Event record
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

            // Return the new event Id
            return newEvent.Id;

        } catch (Exception ex) {
            System.debug('Error creating event: ' + ex.getMessage());
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Event__c> getPartyEvents() {
        return [SELECT Id, Event_Name__c, Event_Type__c, Event_Start_Date__c, Event_End_Date__c, Location__c, Price__c 
                FROM Event__c WHERE Type_of_Calendar_Event__c = 'Party Event'];
    }
    
    @AuraEnabled(cacheable=true)
    public static Event__c getEventDetails(Id eventId) {
        return [SELECT Id, Event_Name__c, Event_Type__c, Event_Start_Date__c, Event_End_Date__c, Location__c, Price__c 
                FROM Event__c WHERE Id = :eventId LIMIT 1];
    }

    @AuraEnabled
    public static void deleteEvent(Id eventId) {
        try {
            Event__c eventToDelete = [SELECT Id FROM Event__c WHERE Id = :eventId LIMIT 1];
            delete eventToDelete; // Perform the delete operation
        } catch (DmlException e) {
            throw new AuraHandledException('Error deleting event: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
public static String getSeatingStatus(Id eventId) {
    Event__c event = [SELECT Seats_Allocated__c, Max_Attendees__c FROM Event__c WHERE Id = :eventId];
    if (event != null) {
        return (event.Seats_Allocated__c >= event.Max_Attendees__c) ? 'Housefull' : 'Available: ' + (event.Max_Attendees__c - event.Seats_Allocated__c);
    }
    return 'No data';
}

    
}
