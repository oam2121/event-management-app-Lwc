import {LightningElement, track} from 'lwc';
import getCorporateEvents
  from '@salesforce/apex/BudgetController.getCorporateEvents';
import getPartyEvents from '@salesforce/apex/BudgetController.getPartyEvents';
import getEventBudget from '@salesforce/apex/BudgetController.getEventBudget';
import setEventBudget from '@salesforce/apex/BudgetController.setEventBudget';
import getExpenses from '@salesforce/apex/BudgetController.getExpenses';
import addExpenseAndUpdateActualSpend
  from '@salesforce/apex/BudgetController.addExpenseAndUpdateActualSpend'; // Updated method
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import calculateBurnRate
  from '@salesforce/apex/ForecastController.calculateBurnRate';
import calculateExhaustionDate
  from '@salesforce/apex/ForecastController.calculateExhaustionDate';
import updateBudgetLock
  from '@salesforce/apex/BudgetController.updateBudgetLock'; // Method to update the budget lock

export default class EventBudgetManagerLWC extends LightningElement {
  // Variables for event management
  @track burnRate = 0;
  @track exhaustionDate = '';
  @track selectedEventType;
  @track selectedEventName;
  @track eventOptions = [];
  @track newExpenseDate;
  @track eventTypeOptions = [
    {label: 'Corporate', value: 'Corporate'},
    {label: 'Party', value: 'Party Event'},
  ];

  // Budget variables
  @track totalBudget = 0;
  @track currentBudget = 0;
  @track budgetExists = false;
  @track eventBudgetId;
  @track budgetNo;
  @track actualSpend;
  @track remainingBudget;
  @track budgetUsedPercentage;

  // Modal control flags
  @track isBudgetModalOpen = false;
  @track isExpenseModalOpen = false;

  // Expense variables
  @track expenseData = [];
  @track newExpenseAmount = 0;
  @track newExpenseCategory = '';
  @track newPaymentMethod = '';
  @track isLoading = false;
  @track isSettingsModalOpen = false;
  @track budgetLocked = false;

  @track expenseColumns = [
    {
      label: 'Amount',
      fieldName: 'Expense_Amount__c',
      type: 'currency',
      cellAttributes: {alignment: 'left'},
    }, // Left align Amount
    {label: 'Category', fieldName: 'Expense_Category__c', type: 'text'},
    {label: 'Payment Method', fieldName: 'Payment_Method__c', type: 'text'},
  ];

  @track expenseCategoryOptions = [
    {label: 'Venue', value: 'Venue'},
    {label: 'Catering', value: 'Catering'},
    {label: 'Travel/Transportation', value: 'Travel/Transportation'},
    {label: 'Entertainment', value: 'Entertainment'},
    {label: 'Marketing/Promotion', value: 'Marketing/Promotion'},
    {label: 'Decorations', value: 'Decorations'},
    {label: 'Gifts/Party Favors', value: 'Gifts/Party Favors'},
    {label: 'Speakers/Presenters', value: 'Speakers/Presenters'},
    {
      label: 'Equipment Rental (e.g., Audio/Visual)',
      value: 'Equipment Rental (e.g., Audio/Visual)',
    },
    {label: 'Staff/Personnel', value: 'Staff/Personnel'},
    {label: 'Security', value: 'Security'},
    {
      label: 'Technology (e.g., Software, Platforms)',
      value: 'Technology (e.g., Software, Platforms)',
    },
    {label: 'Licensing/Permits', value: 'Licensing/Permits'},
    {label: 'Photography/Videography', value: 'Photography/Videography'},
    {label: 'Printing/Materials', value: 'Printing/Materials'},
    {label: 'Accommodation', value: 'Accommodation'},
    {label: 'Insurance', value: 'Insurance'},
    {label: 'Miscellaneous', value: 'Miscellaneous'},
  ];

  @track paymentMethodOptions = [
    {label: 'Corporate Account', value: 'Corporate Account'},
    {label: 'Credit Card', value: 'Credit Card'},
    {label: 'PayPal', value: 'PayPal'},
    {label: 'Bank Transfer', value: 'Bank Transfer'},
    {label: 'Cash', value: 'Cash'},
  ];

  connectedCallback () {
    this.fetchForecastData ();
  }

  // Fetch event data based on event type selection
  handleEventTypeChange (event) {
    this.selectedEventType = event.detail.value;
    if (this.selectedEventType === 'Corporate') {
      getCorporateEvents ().then (result => {
        this.eventOptions = result.map (event => ({
          label: event.Event_Name__c,
          value: event.Id,
        }));
      });
    } else if (this.selectedEventType === 'Party Event') {
      getPartyEvents ().then (result => {
        this.eventOptions = result.map (event => ({
          label: event.Event_Name__c,
          value: event.Id,
        }));
      });
    }
  }

  handleEventNameChange (event) {
    const newEventId = event.detail.value;

    // Only clear and fetch data if the selected event is different from the previous one
    if (newEventId !== this.selectedEventName) {
      this.selectedEventName = newEventId;

      // Clear previous budget details since it's a new event
      this.clearBudgetDetails ();

      // Fetch new budget details for the selected event
      getEventBudget ({eventId: this.selectedEventName})
        .then (result => {
          if (result) {
            this.eventBudgetId = result.Id;
            this.budgetNo = result.Name;
            this.actualSpend = result.Actual_Spend__c;
            this.remainingBudget = result.Remaining_Budget__c;
            this.budgetUsedPercentage = result.Budget_Used_Percentage__c;
            this.budgetLocked = result.Budget_Lock__c; // Get the lock state
            this.totalBudget = result.Total_Budget__c;

            // Now that we have fetched the data, we can open the modal
            this.isBudgetModalOpen = true;
          }
        })
        .catch (error => {
          this.showToast ('Error', 'Error fetching event budget', 'error');
        });
    } else {
      // If it's the same event, just open the modal with existing data
      this.isBudgetModalOpen = true;
    }
  }

  // Close the budget modal without clearing the data
  closeBudgetModal () {
    this.isBudgetModalOpen = false;
  }

  // Helper method to clear budget details when a new event is selected
  clearBudgetDetails () {
    this.eventBudgetId = null;
    this.budgetNo = null;
    this.actualSpend = null;
    this.remainingBudget = null;
    this.budgetUsedPercentage = null;
    this.totalBudget = 0;
  }

  // Handle budget change
  handleBudgetChange (event) {
    this.totalBudget = event.detail.value;
  }

  // Handle the toggle for locking/unlocking the budget
  handleLockToggle (event) {
    const isLocked = event.target.checked;
    this.budgetLocked = isLocked;

    updateBudgetLock ({eventBudgetId: this.eventBudgetId, isLocked: isLocked})
      .then (() => {
        this.showToast ('Success', 'Budget lock status updated', 'success');
      })
      .catch (error => {
        this.showToast ('Error', 'Error updating budget lock status', 'error');
      });
  }

  // Set budget
  handleSetBudget () {
    setEventBudget ({
      eventId: this.selectedEventName,
      totalBudget: this.totalBudget,
    })
      .then (() => {
        this.showToast ('Success', 'Budget has been set', 'success');
        this.clearBudgetDetails (); // Clear details after setting the budget
      })
      .catch (error => {
        this.showToast ('Error', 'Error setting budget', 'error');
      });
  }

  handleBudgetUpdate () {
    if (!this.budgetLocked) {
      setEventBudget ({
        eventId: this.selectedEventName,
        totalBudget: this.totalBudget,
      })
        .then (result => {
          this.showToast ('Success', 'Budget has been updated', 'success');

          // Refresh the budget fields with the updated data
          if (result) {
            this.eventBudgetId = result.Id;
            this.budgetNo = result.Name;
            this.actualSpend = result.Actual_Spend__c;
            this.remainingBudget = result.Remaining_Budget__c;
            this.budgetUsedPercentage = result.Budget_Used_Percentage__c;
            this.totalBudget = result.Total_Budget__c;
          }

          // Close the modal after fetching updated data
          this.closeBudgetModal ();
        })
        .catch (error => {
          this.showToast ('Error', 'Error updating budget', 'error');
        });
    } else {
      this.showToast (
        'Error',
        'Budget is locked and cannot be updated',
        'error'
      );
    }
  }

  // Open budget modal and fetch event details including Budget_Lock__c
  openBudgetModal () {
    getEventBudget ({eventId: this.selectedEventName})
      .then (result => {
        if (result) {
          // If budget exists, set the details and open the modal
          this.eventBudgetId = result.Id;
          this.budgetLocked = result.Budget_Lock__c; // Set the toggle based on Budget_Lock__c
          this.budgetNo = result.Name;
          this.actualSpend = result.Actual_Spend__c;
          this.remainingBudget = result.Remaining_Budget__c;
          this.budgetUsedPercentage = result.Budget_Used_Percentage__c;
          this.totalBudget = result.Total_Budget__c;
        } else {
          // If no budget exists, clear the fields for new budget creation
          this.clearBudgetDetails ();
        }
        this.isBudgetModalOpen = true; // Open the modal regardless of whether a budget exists or not
      })
      .catch (error => {
        // Handle the case where no budget exists
        this.clearBudgetDetails ();
        this.isBudgetModalOpen = true; // Open modal to allow the user to set a new budget
      });
  }

  // Open expense modal
  openExpenseModal () {
    getExpenses ({eventBudgetId: this.eventBudgetId})
      .then (result => {
        this.expenseData = result;
        this.isExpenseModalOpen = true;
      })
      .catch (error => {
        this.showToast ('Error', 'Error fetching expenses', 'error');
      });
  }

  // Close expense modal
  closeExpenseModal () {
    this.isExpenseModalOpen = false;
  }

  // Handle new expense amount change
  handleNewExpenseAmountChange (event) {
    this.newExpenseAmount = event.detail.value;
  }

  // Handle new expense category change
  handleNewExpenseCategoryChange (event) {
    this.newExpenseCategory = event.detail.value;
  }

  // Handle payment method change
  handlePaymentMethodChange (event) {
    this.newPaymentMethod = event.detail.value;
  }

  // Handle expense date change
  handleNewExpenseDateChange (event) {
    this.newExpenseDate = event.detail.value;
  }

  handleAddExpense () {
    if (!this.eventBudgetId) {
      this.showToast (
        'Error',
        'No budget found for this event. Please set a budget first.',
        'error'
      );
      return;
    }

    // Add expense and update Actual Spend
    addExpenseAndUpdateActualSpend ({
      eventBudgetId: this.eventBudgetId,
      name: this.newExpenseName || 'Unnamed Expense', // Ensure a name is passed, fallback to default if empty
      amount: this.newExpenseAmount,
      category: this.newExpenseCategory,
      paymentMethod: this.newPaymentMethod,
      expenseDate: this.newExpenseDate,
    })
      .then (() => {
        this.showToast (
          'Success',
          'Expense has been added and Actual Spend updated',
          'success'
        );

        // Clear the form fields after the expense is successfully added
        this.clearExpenseFields ();

        // Re-fetch the updated expense data from the server
        this.refreshExpenses ();

        // Re-fetch the updated budget details to update Actual Spend
        this.refreshBudgetDetails ();

        // Optionally close the modal after successfully adding the expense
        this.closeExpenseModal ();
      })
      .catch (error => {
        this.showToast (
          'Error',
          'Error adding expense and updating Actual Spend',
          'error'
        );
      });
  }

  // Re-fetch the updated expenses from the server
  refreshExpenses () {
    getExpenses ({eventBudgetId: this.eventBudgetId})
      .then (result => {
        this.expenseData = result; // Update the expense data with the latest records from the server
      })
      .catch (error => {
        this.showToast ('Error', 'Error fetching expenses', 'error');
      });
  }

  // Refresh budget details
  refreshBudgetDetails () {
    getEventBudget ({eventId: this.selectedEventName})
      .then (result => {
        if (result) {
          this.eventBudgetId = result.Id;
          this.budgetNo = result.Name;
          this.actualSpend = result.Actual_Spend__c;
          this.remainingBudget = result.Remaining_Budget__c;
          this.budgetUsedPercentage = result.Budget_Used_Percentage__c;
          this.totalBudget = result.Total_Budget__c;
        }
      })
      .catch (error => {
        this.showToast ('Error', 'Error refreshing budget details', 'error');
      });
  }

  // Show toast notification
  showToast (title, message, variant) {
    const event = new ShowToastEvent ({
      title: title,
      message: message,
      variant: variant,
    });
    this.dispatchEvent (event);
  }

  clearExpenseFields () {
    this.newExpenseName = '';
    this.newExpenseAmount = 0;
    this.newExpenseCategory = '';
    this.newPaymentMethod = '';
    this.newExpenseDate = null; // Clear the date field as well
  }
  // Calculate total expenses dynamically
  get totalExpenses () {
    return this.expenseData.reduce (
      (total, expense) => total + expense.Expense_Amount__c,
      0
    );
  }

  // Calculate the budget used percentage manually
  get calculatedBudgetUsedPercentage () {
    if (this.totalBudget && this.totalBudget > 0) {
      return this.actualSpend / this.totalBudget * 100;
    }
    return 0;
  }

  // Dynamically determine the progress bar's width and color
  get statusBarStyle () {
    let color = 'green'; // Default color for low usage
    const percentageUsed = this.calculatedBudgetUsedPercentage;

    // Set color based on manually calculated budget used percentage
    if (percentageUsed >= 75) {
      color = 'red'; // High usage
    } else if (percentageUsed >= 50) {
      color = 'yellow'; // Medium usage
    }

    // Return the style string with dynamic width and color
    return `background-color: ${color}; width: ${percentageUsed}%;`;
  }

  fetchForecastData () {
    // Call Apex to get the burn rate
    calculateBurnRate ({eventBudgetId: this.eventBudgetId})
      .then (result => {
        this.burnRate = result;
      })
      .catch (error => {
        console.error ('Error fetching burn rate:', error);
      });

    // Call Apex to get the exhaustion date
    calculateExhaustionDate ({eventBudgetId: this.eventBudgetId})
      .then (result => {
        this.exhaustionDate = result;
      })
      .catch (error => {
        console.error ('Error fetching exhaustion date:', error);
      });
  }

  // Method to open the settings modal
  openSettingsModal () {
    this.isSettingsModalOpen = true;
  }

  // Method to close the settings modal
  closeSettingsModal () {
    this.isSettingsModalOpen = false;
  }
}
