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
    @track isModalOpen = false; // To control modal visibility

    // Attendee fields for the modal
    @track newAttendeeName = '';
    @track newAttendeeEmail = '';
    @track newAttendeePhone = '';

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

    @wire(getAttendeesForEvent, { eventId: '$recordId' })
    wiredAttendees(result) {
        this.wiredAttendeesResult = result;
        const { data, error } = result;
        this.isLoading = false;

        if (data) {
            this.attendees = data.map(att => {
                return {
                    ...att,
                    rsvpActionLabel: att.RSVP_Status__c === 'Cancelled' ? 'Re-add RSVP' : 'Cancel RSVP',
                    rsvpVariant: att.RSVP_Status__c === 'Cancelled' ? 'success' : 'destructive' 
                };
            });
            this.error = undefined;
        } else if (error) {
            this.attendees = [];
            this.error = error;
        }
    }

    // Open the modal
    openModal() {
        this.isModalOpen = true;
    }

    // Close the modal
    closeModal() {
        this.isModalOpen = false;
    }

    // Handle input change in modal
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

    // Submit the new attendee
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

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Attendee added successfully.',
                        variant: 'success',
                    })
                );

                // Close the modal and refresh the list
                this.closeModal();
                await refreshApex(this.wiredAttendeesResult);

            } catch (error) {
                this.handleError(error);
            } finally {
                this.isLoading = false;
            }
        } else {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Please fill in all fields before submitting.',
                    variant: 'error',
                })
            );
        }
    }

    // Handle row actions for Cancel/Toggle RSVP and Delete RSVP
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const attendeeId = event.detail.row.Id;

        if (actionName === 'toggleRSVPStatus') {
            this.toggleRSVPStatus(attendeeId);
        } else if (actionName === 'deleteRSVP') {
            this.deleteRSVP(attendeeId);
        }
    }

    // Toggle RSVP status (Cancel/Registered)
    async toggleRSVPStatus(attendeeId) {
        this.isLoading = true;
        try {
            await toggleRSVPStatus({ attendeeId });

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'RSVP status updated.',
                    variant: 'success',
                })
            );
            await refreshApex(this.wiredAttendeesResult);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.isLoading = false;
        }
    }

    // Delete RSVP and update Seats_Allocated__c
    async deleteRSVP(attendeeId) {
        this.isLoading = true;
        try {
            await deleteRSVP({ attendeeId });

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'RSVP deleted.',
                    variant: 'success',
                })
            );
            await refreshApex(this.wiredAttendeesResult);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.isLoading = false;
        }
    }

    handleError(error) {
        let errorMessage = 'Unknown error occurred';
        if (error && error.body && error.body.message) {
            errorMessage = error.body.message;
        }
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: errorMessage,
                variant: 'error',
            })
        );
    }
}
