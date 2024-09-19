public class EventTriggerHelper {

    // Helper method to check if the job is already scheduled
    public static Boolean isJobScheduled(String jobName) {
        for (CronTrigger ct : [SELECT Id, CronJobDetail.Name FROM CronTrigger WHERE CronJobDetail.Name = :jobName]) {
            if (ct.CronJobDetail.Name == jobName) {
                return true;  // Job already scheduled
            }
        }
        return false;  // Job not scheduled
    }
}
