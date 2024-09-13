public with sharing class EventController {

    @AuraEnabled
    public static Id createEvent(Map<String, Object> eventData) {
        // Extract event details from the input map
        String eventName = (String) eventData.get('eventName');
        String eventDescription = (String) eventData.get('eventDescription');
        String startDateString = (String) eventData.get('startDate');
        String endDateString = (String) eventData.get('endDate');
        String location = (String) eventData.get('location');
        Integer maxAttendees = Integer.valueOf(eventData.get('maxAttendees'));
        String eventType = (String) eventData.get('eventType');

        // Convert start and end dates to Datetime format
        Datetime startDate = Datetime.valueOfGmt(startDateString.replace('T', ' ').replace('Z', ''));
        Datetime endDate = Datetime.valueOfGmt(endDateString.replace('T', ' ').replace('Z', ''));

        // Create new event
        Event__c newEvent = new Event__c();
        newEvent.Event_Name__c = eventName;
        newEvent.Event_Description__c = eventDescription;
        newEvent.Event_Start_Date__c = startDate;
        newEvent.Event_End_Date__c = endDate;
        newEvent.Location__c = location;
        newEvent.Max_Attendees__c = maxAttendees;
        newEvent.Event_Type__c = eventType;

        insert newEvent;
        return newEvent.Id;
    }

    @AuraEnabled(cacheable=true)
    public static List<String> getEventTypes() {
        Schema.DescribeFieldResult fieldResult = Event__c.Event_Type__c.getDescribe();
        List<Schema.PicklistEntry> picklistEntries = fieldResult.getPicklistValues();
        List<String> eventTypes = new List<String>();
        
        for (Schema.PicklistEntry entry : picklistEntries) {
            eventTypes.add(entry.getValue());
        }
        
        return eventTypes;
    }

    @AuraEnabled
    public static void updateEventDate(Id eventId, String newStartDate, String newEndDate) {
        // Convert dates to Datetime
        Datetime newStart = Datetime.valueOf(newStartDate);
        Datetime newEnd = Datetime.valueOf(newEndDate);

        // Proceed to update event
        Event__c eventToUpdate = [SELECT Id, Event_Start_Date__c, Event_End_Date__c FROM Event__c WHERE Id = :eventId LIMIT 1];
        eventToUpdate.Event_Start_Date__c = newStart;
        eventToUpdate.Event_End_Date__c = newEnd;
        update eventToUpdate;
    }

    @AuraEnabled(cacheable=true)
    public static List<Event__c> searchEvents(String eventName) {
        String searchKeyword = '%' + String.escapeSingleQuotes(eventName) + '%';
        String query = 'SELECT Id, Event_Name__c, Event_Start_Date__c, Event_End_Date__c, Event_Type__c ' + 
                       'FROM Event__c ' +
                       'WHERE Event_Name__c LIKE :searchKeyword ' +
                       'LIMIT 100';
        return Database.query(query);
    }
    
    // New method to delete event
    @AuraEnabled
    public static void deleteEvent(Id eventId) {
        Event__c eventToDelete = [SELECT Id FROM Event__c WHERE Id = :eventId];
        delete eventToDelete;
    }
}
