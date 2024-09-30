public with sharing class TaskManagerController {
    @AuraEnabled
    public static Task_Checklist__c saveTaskRecord(String taskJson) {
        try {
            Task_Checklist__c task = (Task_Checklist__c) JSON.deserialize(taskJson, Task_Checklist__c.class);
    
            // Ensure the Event is owned by the logged-in user
            String userId = UserInfo.getUserId();
            Event__c event = [SELECT Id FROM Event__c WHERE Id = :task.Event__c AND CreatedById = :userId LIMIT 1];
    
            // Save the task only if the event belongs to the user
            insert task;
            System.debug('Task created with ID: ' + task.Id); // Debug statement
            return task; // Return the inserted task to get the ID
        } catch (Exception e) {
            throw new AuraHandledException('Error saving task: ' + e.getMessage());
        }
    }
    

    @AuraEnabled(cacheable=true)
    public static List<Event__c> getFilteredEvents(String eventType) {
        try {
            String eventFilter = (eventType == 'Corporate') ? 'Corporate' : 'Party Event';
            String userId = UserInfo.getUserId();
    
            // Fetch only events created by the logged-in user
            return [
                SELECT Id, Event_Name__c 
                FROM Event__c 
                WHERE Type_of_Calendar_Event__c = :eventFilter 
                AND CreatedById = :userId
                ORDER BY Event_Name__c
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching events: ' + e.getMessage());
        }
    }
    

    @AuraEnabled(cacheable=true)
public static List<Task_Checklist__c> getTasksByEvent(Id eventId) {
    try {
        // Ensure the event belongs to the logged-in user
        String userId = UserInfo.getUserId();
        Event__c event = [SELECT Id FROM Event__c WHERE Id = :eventId AND CreatedById = :userId LIMIT 1];

        // Fetch tasks if the event is owned by the user
        return [
            SELECT Id, Task_Name__c, Priority__c, Due_Date__c, Status__c 
            FROM Task_Checklist__c 
            WHERE Event__c = :eventId
            ORDER BY Due_Date__c
        ];
    } catch (Exception e) {
        throw new AuraHandledException('Error fetching tasks: ' + e.getMessage());
    }
}


@AuraEnabled
public static void updateTaskCompletionPercentage(Id taskChecklistId) {
    // Get the current user's Id
    String userId = UserInfo.getUserId();

    // Ensure the Task Checklist belongs to the logged-in user
    Task_Checklist__c taskChecklist = [SELECT Id FROM Task_Checklist__c 
                                       WHERE Id = :taskChecklistId 
                                       AND CreatedById = :userId 
                                       LIMIT 1];

    // Fetch subtasks for the task checklist
    List<Subtasks__c> subtasks = [SELECT Id, Is_Completed__c 
                                  FROM Subtasks__c 
                                  WHERE Task_Checklist__c = :taskChecklistId];
    if (subtasks.isEmpty()) return;

    // Calculate the completion percentage
    Integer completedCount = 0;
    for (Subtasks__c subtask : subtasks) {
        if (subtask.Is_Completed__c) {
            completedCount++;
        }
    }
    Decimal completionPercentage = (Decimal.valueOf(completedCount) / Decimal.valueOf(subtasks.size())) * 100;

    // Update the Task Checklist with the completion percentage
    taskChecklist.Completion_Percentage__c = completionPercentage;
    update taskChecklist;
}

@AuraEnabled
public static void updateTaskStatus(String taskId, String newStatus) {
    Task_Checklist__c task = [SELECT Id, Status__c FROM Task_Checklist__c WHERE Id = :taskId LIMIT 1];
    task.Status__c = newStatus;
    update task;
}

@AuraEnabled
public static void uploadFileToTask(Id taskId, String fileName, String base64Data, String fileType) {
    System.debug('Task ID: ' + taskId);
    System.debug('File Name: ' + fileName);

    // Create ContentVersion for the file upload (This stores the file in Salesforce Files)
    ContentVersion contentVersion = new ContentVersion();
    contentVersion.Title = fileName;
    contentVersion.PathOnClient = fileName;
    contentVersion.VersionData = EncodingUtil.base64Decode(base64Data);
    insert contentVersion;

    // Link the file (ContentDocument) to the task
    Id contentDocumentId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :contentVersion.Id].ContentDocumentId;
    System.debug('Content Document ID: ' + contentDocumentId);

    ContentDocumentLink cdl = new ContentDocumentLink();
    cdl.ContentDocumentId = contentDocumentId;
    cdl.LinkedEntityId = taskId; // Link the file to the task
    cdl.ShareType = 'V'; // Viewer access
    cdl.Visibility = 'AllUsers';
    insert cdl;
}



}
