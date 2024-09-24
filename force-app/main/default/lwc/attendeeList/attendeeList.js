import { LightningElement, api, wire, track } from 'lwc';
import getAttendeesForEvent from '@salesforce/apex/RSVPController.getAttendeesForEvent';
import toggleRSVPStatus from '@salesforce/apex/RSVPController.toggleRSVPStatus';
import deleteRSVP from '@salesforce/apex/RSVPController.deleteRSVP'; 
import submitRSVP from '@salesforce/apex/RSVPController.submitRSVP'; // For adding attendees
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class AttendeeList extends LightningElement {
    @api recordId; // Event record ID passed to the component
    @track attendees = [];
    @track error = '';
    @track isLoading = true;
    @track wiredAttendeesResult;
    @track isModalOpen = false; // Controls modal visibility for adding attendee
    @track isDeleteDialogOpen = false; // Controls delete confirmation dialog
    @track attendeeToDelete = null; // Stores the attendee to delete

    // Attendee fields for the modal
    @track newAttendeeName = '';
    @track newAttendeeEmail = '';
    @track newAttendeePhone = '';

    // Column definition for the data table
    columns = [
        { label: 'Name', fieldName: 'Name__c', type: 'text' },
        { label: 'Email', fieldName: 'Email__c', type: 'email' },
        { label: 'Phone', fieldName: 'Phone__c', type: 'phone' },
        { label: 'RSVP Status', fieldName: 'RSVP_Status__c', type: 'text' },
        {
            type: 'button',
            typeAttributes: {
                label: { fieldName: 'rsvpActionLabel' }, 
                name: 'toggleRSVPStatus',
                variant: { fieldName: 'rsvpVariant' }
            },
        },
        {
            type: 'button',
            typeAttributes: {
                label: 'Delete RSVP',
                name: 'deleteRSVP',
                variant: 'brand',
            },
        }
    ];

    // Fetch attendees for the event and transform data for table actions
    @wire(getAttendeesForEvent, { eventId: '$recordId' })
    wiredAttendees(result) {
        this.wiredAttendeesResult = result;
        const { data, error } = result;
        this.isLoading = false;

        if (data) {
            // Transform data to add dynamic button labels and variants
            this.attendees = data.map(att => ({
                ...att,
                rsvpActionLabel: att.RSVP_Status__c === 'Cancelled' ? 'Re-add RSVP' : 'Cancel RSVP',
                rsvpVariant: att.RSVP_Status__c === 'Cancelled' ? 'success' : 'destructive' 
            }));
            this.error = undefined;
        } else if (error) {
            this.attendees = [];
            this.error = error;
        }
    }

    // Open the modal for adding a new attendee
    openModal() {
        this.isModalOpen = true;
    }

    // Close the modal
    closeModal() {
        this.isModalOpen = false;
    }

    // Handle input changes in the modal (name, email, phone)
    handleInputChange(event) {
        const field = event.target.dataset.id;
        if (field === 'name') {
            this.newAttendeeName = event.target.value;
        } else if (field === 'email') {
            this.newAttendeeEmail = event.target.value;
        } else if (field === 'phone') {
            this.newAttendeePhone = event.target.value;
        }
    }

    // Submit the new attendee and refresh the list
    async submitAttendee() {
        if (this.newAttendeeName && this.newAttendeeEmail && this.newAttendeePhone) {
            this.isLoading = true;
            try {
                await submitRSVP({
                    eventId: this.recordId,
                    attendeeName: this.newAttendeeName,
                    attendeeEmail: this.newAttendeeEmail,
                    attendeePhone: this.newAttendeePhone
                });

                this.showToast('Success', 'Attendee added successfully.', 'success');

                // Close the modal and refresh the list
                this.closeModal();
                await refreshApex(this.wiredAttendeesResult);
            } catch (error) {
                this.handleError(error);
            } finally {
                this.isLoading = false;
            }
        } else {
            this.showToast('Error', 'Please fill in all fields before submitting.', 'error');
        }
    }

    // Handle row actions for Cancel/Toggle RSVP and Delete RSVP
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const attendeeId = event.detail.row.Id;

        if (actionName === 'toggleRSVPStatus') {
            this.toggleRSVPStatus(attendeeId);
        } else if (actionName === 'deleteRSVP') {
            this.showDeleteConfirmation(attendeeId);
        }
    }

    // Toggle RSVP status (Cancel/Registered)
    async toggleRSVPStatus(attendeeId) {
        this.isLoading = true;
        try {
            await toggleRSVPStatus({ attendeeId });
            this.showToast('Success', 'RSVP status updated.', 'success');
            await refreshApex(this.wiredAttendeesResult);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.isLoading = false;
        }
    }

    // Show delete confirmation dialog
    showDeleteConfirmation(attendeeId) {
        this.attendeeToDelete = attendeeId; // Store the attendee ID to delete
        this.isDeleteDialogOpen = true; // Show the confirmation modal
    }

    // Close the delete confirmation dialog
    closeDeleteConfirmation() {
        this.isDeleteDialogOpen = false; // Close the confirmation modal
        this.attendeeToDelete = null; // Clear the stored attendee ID
    }

    // Confirm and delete the attendee
    async confirmDeleteAttendee() {
        this.isLoading = true;
        try {
            await deleteRSVP({ attendeeId: this.attendeeToDelete });
            this.showToast('Success', 'RSVP deleted.', 'success');
            this.closeDeleteConfirmation(); // Close the modal
            await refreshApex(this.wiredAttendeesResult);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.isLoading = false;
        }
    }

    // Show a toast message
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant,
        }));
    }

    // Handle errors and show an error toast
    handleError(error) {
        let errorMessage = 'Unknown error occurred';
        if (error && error.body && error.body.message) {
            errorMessage = error.body.message;
        }
        this.showToast('Error', errorMessage, 'error');
    }
}
