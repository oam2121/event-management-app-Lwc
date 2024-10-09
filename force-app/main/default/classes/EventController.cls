public with sharing class EventController {

    /**
     * Creates a new event based on the provided event data.
     * 
     * @param eventData A map containing event details such as name, description, start date, end date, etc.
     * @return The newly created event's ID
     */
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
    
        // Convert start and end date strings to Datetime format
        Datetime startDate = Datetime.valueOfGmt(startDateString.replace('T', ' ').replace('Z', ''));
        Datetime endDate = Datetime.valueOfGmt(endDateString.replace('T', ' ').replace('Z', ''));
    
        // Validate: Start date should not be in the past
        if (startDate < Datetime.now()) {
            throw new AuraHandledException('The start date cannot be in the past.');
        }
    
        // Validate: End date should not be earlier than the start date
        if (endDate < startDate) {
            throw new AuraHandledException('The end date cannot be earlier than the start date.');
        }
    
        // Create a new event record
        Event__c newEvent = new Event__c();
        newEvent.Event_Name__c = eventName;
        newEvent.Event_Description__c = eventDescription;
        newEvent.Event_Start_Date__c = startDate;
        newEvent.Event_End_Date__c = endDate;
        newEvent.Location__c = location;
        newEvent.Max_Attendees__c = maxAttendees;
        newEvent.Event_Type__c = eventType;
    
        // Insert the new event record
        insert newEvent;
        return newEvent.Id;
    }

    /**
     * Retrieves the available event types from the Event_Type__c picklist.
     * 
     * @return A list of event types as strings
     */
    @AuraEnabled(cacheable=true)
    public static List<String> getEventTypes() {
        // Describe the Event_Type__c field to get the picklist values
        Schema.DescribeFieldResult fieldResult = Event__c.Event_Type__c.getDescribe();
        List<Schema.PicklistEntry> picklistEntries = fieldResult.getPicklistValues();
        List<String> eventTypes = new List<String>();
        
        // Extract and add picklist values to the result list
        for (Schema.PicklistEntry entry : picklistEntries) {
            eventTypes.add(entry.getValue());
        }
        
        return eventTypes;
    }

    /**
     * Updates the start and end dates of an existing event.
     * 
     * @param eventId The ID of the event to update
     * @param newStartDate The new start date as a string
     * @param newEndDate The new end date as a string
     */
    @AuraEnabled
public static void updateEventDate(Id eventId, String newStartDate, String newEndDate) {
    // Get the current user Id
    String userId = UserInfo.getUserId();

    // Convert start and end date strings to Datetime
    Datetime newStart = Datetime.valueOf(newStartDate);
    Datetime newEnd = Datetime.valueOf(newEndDate);

    // Fetch the event record, but only if it belongs to the logged-in user
    Event__c eventToUpdate = [SELECT Id, Event_Start_Date__c, Event_End_Date__c 
                             FROM Event__c 
                             WHERE Id = :eventId 
                             AND CreatedById = :userId
                             LIMIT 1];
    eventToUpdate.Event_Start_Date__c = newStart;
    eventToUpdate.Event_End_Date__c = newEnd;

    // Update the event record
    update eventToUpdate;
}

    /**
     * Searches for events based on a partial match of the event name.
     * 
     * @param eventName The search keyword for event names
     * @return A list of matching Event__c records
     */
    @AuraEnabled(cacheable=true)
    public static List<Event__c> searchEvents(String eventName) {
        // Escape single quotes and add wildcard characters for the search
        String searchKeyword = '%' + String.escapeSingleQuotes(eventName) + '%';
        
        // Query for events where the name matches the search keyword
        String query = 'SELECT Id, Event_Name__c, Event_Start_Date__c, Event_End_Date__c, Event_Type__c ' + 
                       'FROM Event__c ' +
                       'WHERE Event_Name__c LIKE :searchKeyword ' +
                       'LIMIT 100';
        
        // Return the results of the query
        return Database.query(query);
    }
    
    /**
     * Deletes an event based on the event ID.
     * 
     * @param eventId The ID of the event to delete
     */
    @AuraEnabled
public static void deleteEvent(Id eventId) {
    // Get the current user Id
    String userId = UserInfo.getUserId();

    // Fetch the event record to delete, but only if it belongs to the logged-in user
    Event__c eventToDelete = [SELECT Id FROM Event__c 
                             WHERE Id = :eventId 
                             AND CreatedById = :userId];
    
    // Delete the event record
    delete eventToDelete;
}

@AuraEnabled(cacheable=true)
public static Event__c getEventById(Id eventId) {
    return [SELECT Id, Event_Name__c FROM Event__c WHERE Id = :eventId LIMIT 1];
}


    @AuraEnabled(cacheable=true)
    public static List<Event__c> getCorporateEvents() {
        return [SELECT Id, Event_Name__c FROM Event__c WHERE Type_of_Calendar_Event__c = 'Corporate'];
    }

    @AuraEnabled(cacheable=true)
    public static List<Event__c> getPartyEvents() {
        return [SELECT Id, Event_Name__c FROM Event__c WHERE Type_of_Calendar_Event__c = 'Party Event'];
    }


}
