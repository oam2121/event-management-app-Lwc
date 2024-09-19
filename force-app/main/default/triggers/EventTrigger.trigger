trigger EventTrigger on Event__c (after insert, after update) {
    // Check if the feedback email job is already scheduled
    if (!EventTriggerHelper.isJobScheduled('SendFeedbackEmailsJob')) {
        // Call the method to schedule the job
        SendRecurringFeedbackEmail.scheduleJob();
    }
}
