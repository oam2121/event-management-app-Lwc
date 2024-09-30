import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getFilteredEvents from '@salesforce/apex/TaskManagerController.getFilteredEvents';
import getTasksByEvent from '@salesforce/apex/TaskManagerController.getTasksByEvent';
import saveTaskRecord from '@salesforce/apex/TaskManagerController.saveTaskRecord';
import getSubtasks from '@salesforce/apex/SubtaskController.getSubtasks';
import saveSubtask from '@salesforce/apex/SubtaskController.saveSubtask';
import updateCompletionStatus from '@salesforce/apex/SubtaskController.updateCompletionStatus';
import updateTaskCompletionPercentage from '@salesforce/apex/TaskManagerController.updateTaskCompletionPercentage';
import uploadFileToTask from '@salesforce/apex/TaskManagerController.uploadFileToTask';

export default class TaskManager extends LightningElement {
    @track taskChecklistId;
    @track isLoading = false; // Boolean to track loading state
    @track newTask = { taskName: '', description: '', priority: '', eventType: 'Corporate', selectedEventId: '', dueDate: '', status: 'Not Started' };
    
    // Subtask handling fields
    @track subtasks = [];
    @track newSubtaskName = '';
    
    @track searchFilters = { eventType: 'Corporate', selectedEventId: '' };
    @track tasks = [];
    @track selectedTask = {};
    @track columns = [
        { label: 'Task Name', fieldName: 'Task_Name__c' },
        { label: 'Priority', fieldName: 'Priority__c' },
        { label: 'Due Date', fieldName: 'Due_Date__c' },
        { label: 'Status', fieldName: 'Status__c' },
        {
            type: 'button',
            typeAttributes: { label: 'View Details', name: 'view_details', variant: 'brand' }
        }
    ];
    @track isModalOpen = false;

    @track priorityOptions = [
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
    ];

    @track eventTypeOptions = [
        { label: 'Corporate', value: 'Corporate' },
        { label: 'Party', value: 'Party' }
    ];

    @track eventOptions = []; // Options for the event lookup

    // Fetch events based on event type for search filtering
    @wire(getFilteredEvents, { eventType: '$searchFilters.eventType' })
    wiredSearchEvents({ error, data }) {
        if (data) {
            this.eventOptions = data.map(event => ({
                label: event.Event_Name__c,
                value: event.Id
            }));
        } else if (error) {
            console.error('Error fetching events:', error);
        }
    }

    // Fetch events based on event type for task creation
    @wire(getFilteredEvents, { eventType: '$newTask.eventType' })
    wiredCreateEvents({ error, data }) {
        if (data) {
            this.eventOptions = data.map(event => ({
                label: event.Event_Name__c,
                value: event.Id
            }));
        } else if (error) {
            console.error('Error fetching events:', error);
        }
    }

    // Handle Task Name input change for new task creation
    handleTaskNameChange(event) {
        this.newTask.taskName = event.target.value;
    }

    // Handle Task Description input change for new task creation
    handleDescriptionChange(event) {
        this.newTask.description = event.target.value;
    }

    // Handle Priority change for new task creation
    handlePriorityChange(event) {
        this.newTask.priority = event.detail.value;
    }

    // Handle Event Type change for new task creation
    handleCreateEventTypeChange(event) {
        this.newTask.eventType = event.detail.value;
    }

    // Handle Event selection for new task creation
    handleCreateEventChange(event) {
        this.newTask.selectedEventId = event.detail.value;
    }

    // Handle Due Date input change for new task creation
    handleDueDateChange(event) {
        this.newTask.dueDate = event.target.value;
    }

   // Handle Task Save
   saveTask() {
    this.isLoading = true; // Start spinner
    const fields = this.gatherTaskFormData();
    saveTaskRecord({ taskJson: JSON.stringify(fields) })
        .then(result => {
            this.taskChecklistId = result.Id; // Capture the Task record ID
            this.showSuccessToast('Task Created Successfully!');

            // Upload files to task
            if (this.filesToUpload.length > 0) {
                this.uploadFiles();
            } else {
                this.isLoading = false; // Stop spinner if no files to upload
            }

            this.resetTaskFormFields();
        })
        .catch(error => {
            this.isLoading = false; // Stop spinner
            this.showErrorToast('Error creating task: ' + error.body.message);
        });
}
    

    gatherTaskFormData() {
        return {
            Task_Name__c: this.newTask.taskName,
            Task_Description__c: this.newTask.description,
            Priority__c: this.newTask.priority,
            Due_Date__c: this.newTask.dueDate,
            Status__c: this.newTask.status,
            Event__c: this.newTask.selectedEventId
        };
    }

    resetTaskFormFields() {
        this.newTask = { taskName: '', description: '', priority: '', eventType: 'Corporate', selectedEventId: '', dueDate: '', status: 'Not Started' };
    }

    // Handle search dropdown changes
    handleSearchEventTypeChange(event) {
        this.searchFilters.eventType = event.detail.value;
    }

    handleSearchEventChange(event) {
        this.searchFilters.selectedEventId = event.detail.value;
        this.loadTasks();
    }

    // Load tasks based on selected event in search
    loadTasks() {
        getTasksByEvent({ eventId: this.searchFilters.selectedEventId })
            .then(result => {
                this.tasks = result;
            })
            .catch(error => {
                console.error('Error fetching tasks:', error);
            });
    }

    // Handle row action for viewing task details in modal
    handleRowAction(event) {
        const task = event.detail.row;
        this.selectedTask = task;
        this.taskChecklistId = task.Id;
        this.isModalOpen = true;

        this.loadSubtasks(task.Id);
    }

    // Load subtasks for the current task
    loadSubtasks(taskChecklistId) {
        getSubtasks({ taskChecklistId })
            .then(result => {
                this.subtasks = result.map(subtask => ({
                    ...subtask,
                    variant: subtask.Is_Completed__c ? 'success' : 'neutral',
                    label: subtask.Is_Completed__c ? 'Completed' : 'Mark Complete'
                }));
            })
            .catch(error => {
                console.error('Error fetching subtasks:', error);
            });
    }

    // Handle Toggle Completion of Subtasks
    handleToggleCompletion(event) {
        const subtaskId = event.target.dataset.id;
        const subtask = this.subtasks.find(st => st.Id === subtaskId);
        const isCompleted = !subtask.Is_Completed__c;

        updateCompletionStatus({ subtaskId, isCompleted })
            .then(() => {
                this.subtasks = this.subtasks.map(st => {
                    if (st.Id === subtaskId) {
                        st.Is_Completed__c = isCompleted;
                        st.Completion_Date__c = isCompleted ? new Date().toISOString().slice(0, 10) : null;
                        st.variant = isCompleted ? 'success' : 'neutral';
                        st.label = isCompleted ? 'Completed' : 'Mark Complete';
                    }
                    return st;
                });

                updateTaskCompletionPercentage({ taskChecklistId: this.taskChecklistId })
                    .then(() => {
                        this.showSuccessToast('Task Completion Percentage Updated!');
                    })
                    .catch(error => {
                        this.showErrorToast('Error updating task completion percentage: ' + error.body.message);
                    });

                this.showSuccessToast('Subtask updated successfully!');
            })
            .catch(error => {
                this.showErrorToast('Error updating subtask: ' + error.body.message);
            });
    }

    // Handle Subtask Name input change
    handleSubtaskNameChange(event) {
        this.newSubtaskName = event.target.value;
    }

    // Add Subtask to the current task
    addSubtask() {
        if (this.newSubtaskName === '') {
            this.showErrorToast('Subtask name is required');
            return;
        }

        const newSubtask = {
            Subtask_Name__c: this.newSubtaskName,
            Is_Completed__c: false,
            Task_Checklist__c: this.taskChecklistId
        };

        saveSubtask({ subtask: newSubtask })
            .then(result => {
                this.subtasks = [
                    ...this.subtasks,
                    {
                        ...result,
                        variant: 'neutral',
                        label: 'Mark Complete'
                    }
                ];
                this.newSubtaskName = ''; // Clear the subtask name field
                this.showSuccessToast('Subtask added successfully!');
            })
            .catch(error => {
                this.showErrorToast('Error adding subtask: ' + error.body.message);
            });
    }

    // Close modal
    closeModal() {
        this.isModalOpen = false;
    }

    // Show success toast message
    showSuccessToast(message) {
        const toastEvent = new ShowToastEvent({
            title: 'Success',
            message: message,
            variant: 'success'
        });
        this.dispatchEvent(toastEvent);
    }

    // Show error toast message
    showErrorToast(message) {
        const toastEvent = new ShowToastEvent({
            title: 'Error',
            message: message,
            variant: 'error'
        });
        this.dispatchEvent(toastEvent);
    }

    // Handle File Change Event
    handleFileChange(event) {
        this.filesToUpload = [...event.target.files]; // Get the selected files
        this.fileInputElement = event.target; // Store reference to the file input element
    }

    // Upload Files to Salesforce
    uploadFiles() {
        this.filesToUpload.forEach(file => {
            let reader = new FileReader();
            reader.onloadend = () => {
                let base64 = reader.result.split(',')[1]; // Get the base64 part of the file
                this.uploadFileToTask(file.name, base64, file.type);
            };
            reader.readAsDataURL(file); // Convert file to Base64
        });
    }

    // Call Apex to upload file
    uploadFileToTask(fileName, base64Data, fileType) {
        uploadFileToTask({ taskId: this.taskChecklistId, fileName, base64Data, fileType })
            .then(() => {
                this.showSuccessToast('File uploaded successfully.');

                // Clear the file input field after successful upload
                if (this.fileInputElement) {
                    this.fileInputElement.value = ''; // Clear the file input field
                }

                this.isLoading = false; // Stop spinner after the toast message is shown
            })
            .catch(error => {
                this.isLoading = false; // Stop spinner in case of error
                this.showErrorToast('Error uploading file: ' + error.body.message);
            });
    }
    
    get priorityStyle() {
        // Set the color based on the priority value
        switch (this.selectedTask.Priority__c) {
            case 'High':
                return 'background-color: red;';
            case 'Medium':
                return 'background-color: orange;';
            case 'Low':
                return 'background-color: green;';
            default:
                return 'background-color: gray;';
        }
    }
}

