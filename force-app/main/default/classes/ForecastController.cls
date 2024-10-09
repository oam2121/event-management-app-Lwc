public with sharing class ForecastController {
    
    @AuraEnabled(cacheable=true)
    public static List<Expense__c> getPastExpenses(Id eventBudgetId) {
        return [
            SELECT Id, Expense_Amount__c, Expense_Date__c
            FROM Expense__c
            WHERE Event_Budget__c = :eventBudgetId
            ORDER BY Expense_Date__c DESC
        ];
    }

     
    @AuraEnabled
    public static Decimal calculateBurnRate(Id eventBudgetId) {
        List<Expense__c> expenses = getPastExpenses(eventBudgetId);

        if (expenses.isEmpty()) {
            return 0; // No expenses yet, burn rate is 0
        }

        // Get the first and last expense date
        Date firstExpenseDate = expenses[expenses.size() - 1].Expense_Date__c;
        Date lastExpenseDate = expenses[0].Expense_Date__c;

        // Calculate the number of weeks/months between the first and last expense
        Integer daysBetween = lastExpenseDate.daysBetween(firstExpenseDate);
        Decimal totalWeeks = Decimal.valueOf(daysBetween) / 7;
        
        // Calculate total expenses
        Decimal totalExpenses = 0;
        for (Expense__c exp : expenses) {
            totalExpenses += exp.Expense_Amount__c;
        }

        // Calculate the burn rate (expenses per week)
        return totalExpenses / totalWeeks;
    }

    @AuraEnabled
    public static Date calculateExhaustionDate(Id eventBudgetId) {
        Event_Budget__c budget = [
            SELECT Actual_Spend__c, Remaining_Budget__c, Total_Budget__c 
            FROM Event_Budget__c 
            WHERE Id = :eventBudgetId 
            LIMIT 1
        ];

        // Get the burn rate (expenses per week)
        Decimal burnRate = calculateBurnRate(eventBudgetId);

        if (burnRate == 0) {
            return null; // No burn rate, no projection available
        }

        // Calculate how many weeks the remaining budget will last
        Decimal weeksRemaining = budget.Remaining_Budget__c / burnRate;

        // Return the predicted date of budget exhaustion
        return Date.today().addDays(weeksRemaining.intValue() * 7); // Convert weeks to days
    }
}