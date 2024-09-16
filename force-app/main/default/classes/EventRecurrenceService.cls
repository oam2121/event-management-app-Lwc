public with sharing class EventRecurrenceService {
    @AuraEnabled
    public static void handleEventRecurrence(List<Event__c> eventRecords) {
        for (Event__c eventRecord : eventRecords) {
            System.debug('Processing event: ' + eventRecord.Id);
            
            if (eventRecord.Recurrence__c == 'None') {
                continue; // No recurrence needed
            }

            // Set the maximum number of recurrences or until the end date is reached
            Integer recurrenceCount = 12; // Maximum recurrences if no end date limit
            List<Event__c> recurringEvents = new List<Event__c>();

            // Calculate the duration of the original event (difference between start and end date)
            Integer eventDuration = eventRecord.Event_End_Date__c.date().daysBetween(eventRecord.Event_Start_Date__c.date());
            System.debug('Event duration: ' + eventDuration);

            Datetime originalEndDate = eventRecord.Event_End_Date__c; // End date of the original event

            for (Integer i = 1; i <= recurrenceCount; i++) {
                Datetime newStartDate;
                Datetime newEndDate;

                // Calculate new dates based on the recurrence type
                if (eventRecord.Recurrence__c == 'Daily') {
                    newStartDate = eventRecord.Event_Start_Date__c.addDays(i);
                    newEndDate = newStartDate.addDays(eventDuration); // Keep the same duration as the original event
                } else if (eventRecord.Recurrence__c == 'Weekly') {
                    newStartDate = eventRecord.Event_Start_Date__c.addDays(7 * i);
                    newEndDate = newStartDate.addDays(eventDuration);
                } else if (eventRecord.Recurrence__c == 'Monthly') {
                    newStartDate = eventRecord.Event_Start_Date__c.addMonths(i);
                    newEndDate = newStartDate.addDays(eventDuration);
                }

                // Stop creating recurrences if the new start date exceeds the original end date
                if (newStartDate > originalEndDate) {
                    System.debug('New start date exceeds the original end date. Stopping recurrence generation.');
                    break;
                }

                // Create new recurring event and copy all relevant fields from the original event
                Event__c recurringEvent = new Event__c(
                    Event_Name__c = eventRecord.Event_Name__c + ' (Recurrence ' + i + ')',
                    Event_Start_Date__c = newStartDate,
                    Event_End_Date__c = newEndDate,
                    Recurrence__c = 'None', // No further recurrence for this event
                    Location__c = eventRecord.Location__c,
                    Event_Description__c = eventRecord.Event_Description__c,
                    Event_Type__c = eventRecord.Event_Type__c,
                    Max_Attendees__c = eventRecord.Max_Attendees__c,
                    Seats_Allocated__c = 0, // Reset for new event
                    Meeting_Link__c = eventRecord.Meeting_Link__c // Copy meeting link from the original event
                );
                recurringEvents.add(recurringEvent);
            }

            // Insert recurring events
            if (!recurringEvents.isEmpty()) {
                insert recurringEvents;
                System.debug('Inserted ' + recurringEvents.size() + ' recurring events.');
            }
        }
    }
}
