import { LightningElement, api, track, wire } from 'lwc';
import getEventDetails from '@salesforce/apex/PartyEventController.getEventDetails';
import deleteEventRecord from '@salesforce/apex/PartyEventController.deleteEvent';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningConfirm from 'lightning/confirm';

export default class EventDetailsModal extends LightningElement {
    @api eventId;  // Event ID passed from the parent
    @track eventRecord;  // Event record to display

    // Fetch the event details using Apex
    @wire(getEventDetails, { eventId: '$eventId' })
    wiredEvent({ error, data }) {
        if (data) {
            // Formatting start and end dates separately for display
            const startDate = new Date(data.Event_Start_Date__c);
            const endDate = new Date(data.Event_End_Date__c);
            this.eventRecord = {
                ...data,
                startDate: startDate.toLocaleDateString(),
                startTime: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                endDate: endDate.toLocaleDateString(),
                endTime: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        } else if (error) {
            console.error('Error fetching event data:', error);
        }
    }

    // Method to close the modal
    closeModal() {
        const closeModalEvent = new CustomEvent('close');
        this.dispatchEvent(closeModalEvent);
    }

    // Method to delete the event with confirmation dialog
    async deleteEvent() {
        const result = await LightningConfirm.open({
            message: 'Are you sure you want to delete this event? This action cannot be undone.',
            label: 'Confirm Deletion',
            theme: 'warning', 
            variant: 'destructive',
        });

        if (result) {
            // Proceed with deletion if OK is clicked
            deleteEventRecord({ eventId: this.eventId })
                .then(() => {
                    this.showToast('Success', 'Event deleted successfully!', 'success');
                    this.closeModal();
                    window.location.reload();  // Reload the page to reflect deletion
                })
                .catch(error => {
                    console.error('Error deleting event:', error);
                    this.showToast('Error', 'Error deleting event. Please try again.', 'error');
                });
        } else {
            this.showToast('Info', 'Event deletion was canceled.', 'info');
        }
    }

    // Method to handle Google Calendar link
    handleGoogleCalendarClick() {
        const eventDetails = this.eventRecord;
        const googleCalendarLink = 'https://www.google.com/calendar/render?action=TEMPLATE&text=' + 
            encodeURIComponent(eventDetails.Event_Name__c) + 
            '&dates=' + this.formatDateForCalendar(eventDetails.Event_Start_Date__c) + '/' + this.formatDateForCalendar(eventDetails.Event_End_Date__c) + 
            '&location=' + encodeURIComponent(eventDetails.Location__c);

        window.open(googleCalendarLink, '_blank');
    }

    // Method to handle Outlook Calendar link
    handleOutlookCalendarClick() {
        const eventDetails = this.eventRecord;
        const outlookCalendarLink = 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&subject=' + 
            encodeURIComponent(eventDetails.Event_Name__c) + 
            '&startdt=' + this.formatDateForCalendar(eventDetails.Event_Start_Date__c) + 
            '&enddt=' + this.formatDateForCalendar(eventDetails.Event_End_Date__c) + 
            '&location=' + encodeURIComponent(eventDetails.Location__c);

        window.open(outlookCalendarLink, '_blank');
    }

    // Utility to format date for calendar links (yyyyMMddTHHmmssZ format)
    formatDateForCalendar(dateString) {
        const date = new Date(dateString);
        return date.toISOString().replace(/-|:|\.\d+/g, ''); // Removing unwanted characters from ISO string
    }

    // Method to display a toast notification
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }
}
