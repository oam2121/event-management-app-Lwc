public with sharing class CalendarController {
    
    @AuraEnabled(cacheable=true)
    public static List<Event__c> getEvents() {
        return [
            SELECT Id, 
                   Event_Name__c, 
                   Event_Start_Date__c, 
                   Event_End_Date__c, 
                   Event_Type__c, 
                   Event_Description__c,
                   Location__c
            FROM Event__c
            WHERE Event_Start_Date__c != NULL
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
    public static Id createEvent(String eventName, String eventDescription, DateTime startDate, DateTime endDate, String eventType, String location, Integer maxAttendees) {
        Event__c newEvent = new Event__c();
        newEvent.Event_Name__c = eventName;
        newEvent.Event_Description__c = eventDescription;
        newEvent.Event_Start_Date__c = startDate;
        newEvent.Event_End_Date__c = endDate;
        newEvent.Event_Type__c = eventType;
        newEvent.Location__c = location;
        newEvent.Max_Attendees__c = maxAttendees;
        newEvent.Seats_Allocated__c = 0; // Initialize seats allocated
        
        insert newEvent;
        return newEvent.Id;
    }
    
    
}
