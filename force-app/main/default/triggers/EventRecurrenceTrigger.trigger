trigger EventRecurrenceTrigger on Event__c (after insert) {
    // Remove or comment out the trigger to prevent duplicate recurrence handling
    // EventRecurrenceService.handleEventRecurrence(eventList);
}
