public with sharing class SubtaskController {
    
    @AuraEnabled(cacheable=true)
    public static List<Subtasks__c> getSubtasks(Id taskChecklistId) {
        // Get the current user's Id
        String userId = UserInfo.getUserId();
    
        // Ensure that the Task Checklist belongs to the logged-in user
        Task_Checklist__c taskChecklist = [SELECT Id FROM Task_Checklist__c 
                                           WHERE Id = :taskChecklistId 
                                           AND CreatedById = :userId 
                                           LIMIT 1];
    
        // Fetch and return subtasks if the Task Checklist belongs to the user
        return [
            SELECT Id, Subtask_Name__c, Is_Completed__c, Completion_Date__c 
            FROM Subtasks__c 
            WHERE Task_Checklist__c = :taskChecklistId
        ];
    }
    

    @AuraEnabled
    public static Subtasks__c saveSubtask(Subtasks__c subtask) {
        // Get the current user's Id
        String userId = UserInfo.getUserId();
    
        // Ensure that the Task Checklist linked to this subtask belongs to the logged-in user
        Task_Checklist__c taskChecklist = [SELECT Id FROM Task_Checklist__c 
                                           WHERE Id = :subtask.Task_Checklist__c 
                                           AND CreatedById = :userId 
                                           LIMIT 1];
    
        // If authorized, insert the subtask
        insert subtask;
        return subtask; // Return the inserted subtask
    }
    
    @AuraEnabled
    public static void updateCompletionStatus(Id subtaskId, Boolean isCompleted) {
        // Get the current user's Id
        String userId = UserInfo.getUserId();
    
        // Fetch the subtask and ensure its parent Task Checklist belongs to the logged-in user
        Subtasks__c subtask = [SELECT Id, Is_Completed__c, Completion_Date__c, Task_Checklist__c 
                               FROM Subtasks__c 
                               WHERE Id = :subtaskId 
                               LIMIT 1];
        Task_Checklist__c taskChecklist = [SELECT Id FROM Task_Checklist__c 
                                           WHERE Id = :subtask.Task_Checklist__c 
                                           AND CreatedById = :userId 
                                           LIMIT 1];
    
        // Update the completion status if the task checklist is authorized
        subtask.Is_Completed__c = isCompleted;
        subtask.Completion_Date__c = isCompleted ? Date.today() : null;
        update subtask;
    }

    @AuraEnabled
    public static void deleteSubtask(Id subtaskId) {
        try {
            // Get the current user's Id
            String userId = UserInfo.getUserId();
    
            // Fetch the subtask and ensure its parent Task Checklist belongs to the logged-in user
            Subtasks__c subtask = [SELECT Id, Task_Checklist__c FROM Subtasks__c WHERE Id = :subtaskId LIMIT 1];
            Task_Checklist__c taskChecklist = [SELECT Id, CreatedById FROM Task_Checklist__c WHERE Id = :subtask.Task_Checklist__c LIMIT 1];
    
            // Ensure the task checklist belongs to the logged-in user
            if (taskChecklist.CreatedById != userId) {
                throw new AuraHandledException('You are not authorized to delete this subtask.');
            }
    
            // Delete the subtask if authorized
            delete subtask;
        } catch (Exception e) {
            throw new AuraHandledException('Error deleting subtask: ' + e.getMessage());
        }
    }
    
}
