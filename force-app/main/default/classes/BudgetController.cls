public with sharing class BudgetController {
    
    @AuraEnabled(cacheable=true)
public static List<Event__c> getCorporateEvents() {
    String userId = UserInfo.getUserId();

    // Fetch corporate events created by the logged-in user
    return [
        SELECT Id, Event_Name__c 
        FROM Event__c 
        WHERE Type_of_Calendar_Event__c = 'Corporate' 
        AND CreatedById = :userId
    ];
}

@AuraEnabled(cacheable=true)
public static List<Event__c> getPartyEvents() {
    String userId = UserInfo.getUserId();

    // Fetch party events created by the logged-in user
    return [
        SELECT Id, Event_Name__c 
        FROM Event__c 
        WHERE Type_of_Calendar_Event__c = 'Party Event' 
        AND CreatedById = :userId
    ];
}

 
@AuraEnabled
public static Event_Budget__c getEventBudget(Id eventId) {
    String userId = UserInfo.getUserId();

    // Ensure the event belongs to the logged-in user
    Event__c event = [SELECT Id FROM Event__c WHERE Id = :eventId AND CreatedById = :userId LIMIT 1];
    
    List<Event_Budget__c> budgets = [
        SELECT Id, Name, Actual_Spend__c, Remaining_Budget__c, Budget_Used_Percentage__c, Total_Budget__c, Budget_Lock__c 
        FROM Event_Budget__c 
        WHERE Event__c = :eventId 
        LIMIT 1
    ];
    return budgets.isEmpty() ? null : budgets[0];
}

@AuraEnabled
public static void setEventBudget(Id eventId, Decimal totalBudget) {
    String userId = UserInfo.getUserId();

    // Ensure the event belongs to the logged-in user
    Event__c event = [SELECT Id FROM Event__c WHERE Id = :eventId AND CreatedById = :userId LIMIT 1];

    List<Event_Budget__c> budgets = [SELECT Id FROM Event_Budget__c WHERE Event__c = :eventId LIMIT 1];
    if (budgets.isEmpty()) {
        Event_Budget__c newBudget = new Event_Budget__c(Event__c = eventId, Total_Budget__c = totalBudget);
        insert newBudget;
    } else {
        Event_Budget__c budget = budgets[0];
        budget.Total_Budget__c = totalBudget;
        update budget;
    }
}


@AuraEnabled
public static List<Expense__c> getExpenses(Id eventBudgetId) {
    String userId = UserInfo.getUserId();

    // Ensure the event budget belongs to an event created by the logged-in user
    Event_Budget__c budget = [SELECT Event__c FROM Event_Budget__c WHERE Id = :eventBudgetId LIMIT 1];
    Event__c event = [SELECT Id FROM Event__c WHERE Id = :budget.Event__c AND CreatedById = :userId LIMIT 1];

    // Fetch expenses if the user is authorized
    return [
        SELECT Name, Expense_Amount__c, Expense_Category__c, Payment_Method__c, Expense_Date__c
        FROM Expense__c
        WHERE Event_Budget__c = :eventBudgetId
    ];
}


@AuraEnabled
public static void addExpenseAndUpdateActualSpend(Id eventBudgetId, String name, Decimal amount, String category, String paymentMethod, Date expenseDate) {
    String userId = UserInfo.getUserId();

    // Ensure the event budget belongs to an event created by the logged-in user
    Event_Budget__c budget = [SELECT Event__c FROM Event_Budget__c WHERE Id = :eventBudgetId LIMIT 1];
    Event__c event = [SELECT Id FROM Event__c WHERE Id = :budget.Event__c AND CreatedById = :userId LIMIT 1];

    // Add the expense
    Expense__c newExpense = new Expense__c(
        Event_Budget__c = eventBudgetId,
        Name = name,
        Expense_Amount__c = amount,
        Expense_Category__c = category,
        Payment_Method__c = paymentMethod,
        Expense_Date__c = expenseDate
    );
    insert newExpense;

    // Update the Actual Spend field in Event_Budget__c
    updateActualSpend(eventBudgetId);
}



     public static void updateActualSpend(Id eventBudgetId) {
        // Calculate the total expense for the budget
        AggregateResult totalExpense = [
            SELECT SUM(Expense_Amount__c) total
            FROM Expense__c
            WHERE Event_Budget__c = :eventBudgetId
        ];
    
        // Safeguard in case no expenses exist
        Decimal totalSpent = (totalExpense != null && totalExpense.get('total') != null) ? (Decimal) totalExpense.get('total') : 0;
    
        // Update the Event_Budget__c with the new Actual Spend
        Event_Budget__c budget = [
            SELECT Id, Actual_Spend__c 
            FROM Event_Budget__c 
            WHERE Id = :eventBudgetId 
            LIMIT 1
        ];
    
        budget.Actual_Spend__c = totalSpent;
        update budget;
    }

    @AuraEnabled
    public static void updateBudgetLock(Id eventBudgetId, Boolean isLocked) {
        Event_Budget__c budget = [SELECT Id, Budget_Lock__c FROM Event_Budget__c WHERE Id = :eventBudgetId LIMIT 1];
        budget.Budget_Lock__c = isLocked;
        update budget;
    }
    
    


    
}
