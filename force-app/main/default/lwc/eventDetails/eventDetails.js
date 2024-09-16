import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// Import Event__c fields (replace these with your actual fields)
import EVENT_NAME_FIELD from '@salesforce/schema/Event__c.Event_Name__c';
import EVENT_START_DATE_FIELD from '@salesforce/schema/Event__c.Event_Start_Date__c';
import EVENT_END_DATE_FIELD from '@salesforce/schema/Event__c.Event_End_Date__c';
import EVENT_LOCATION_FIELD from '@salesforce/schema/Event__c.Location__c';
import EVENT_TYPE_FIELD from '@salesforce/schema/Event__c.Event_Type__c';
import MAX_ATTENDEES_FIELD from '@salesforce/schema/Event__c.Max_Attendees__c';
import EVENT_DESCRIPTION_FIELD from '@salesforce/schema/Event__c.Event_Description__c';
import MEETING_LINK_FIELD from '@salesforce/schema/Event__c.Meeting_Link__c';  // Add Meeting Link field

import getAttendeesForEvent from '@salesforce/apex/RSVPController.getAttendeesForEvent';
import deleteEvent from '@salesforce/apex/EventController.deleteEvent'; // For deleting event
import { NavigationMixin } from 'lightning/navigation'; // For navigation

export default class EventDetails extends NavigationMixin(LightningElement) {
    @api recordId; // Get the recordId from the page context

    attendeesCount = 0; // Stores the number of registered attendees
    error = '';
    isDeleteDialogVisible = false; // Controls the visibility of the delete confirmation dialog

    // Declare the fields
    eventFields = [
        EVENT_NAME_FIELD,
        EVENT_START_DATE_FIELD,
        EVENT_END_DATE_FIELD,
        EVENT_LOCATION_FIELD,
        EVENT_TYPE_FIELD,
        MAX_ATTENDEES_FIELD,
        EVENT_DESCRIPTION_FIELD,
        MEETING_LINK_FIELD  // Include Meeting Link field
    ];

    @wire(getRecord, { recordId: '$recordId', fields: [EVENT_NAME_FIELD, EVENT_START_DATE_FIELD, EVENT_END_DATE_FIELD, EVENT_LOCATION_FIELD, EVENT_TYPE_FIELD, MAX_ATTENDEES_FIELD, EVENT_DESCRIPTION_FIELD, MEETING_LINK_FIELD] })
    event;

    // Getters to fetch field values
    get eventName() {
        return getFieldValue(this.event.data, EVENT_NAME_FIELD);
    }

    get eventStartDate() {
        return getFieldValue(this.event.data, EVENT_START_DATE_FIELD);
    }

    get eventEndDate() {
        return getFieldValue(this.event.data, EVENT_END_DATE_FIELD);
    }

    get eventLocation() {
        return getFieldValue(this.event.data, EVENT_LOCATION_FIELD);
    }

    get eventType() {
        return getFieldValue(this.event.data, EVENT_TYPE_FIELD);
    }

    get maxAttendees() {
        return getFieldValue(this.event.data, MAX_ATTENDEES_FIELD);
    }

    get eventDescription(){
        return getFieldValue(this.event.data, EVENT_DESCRIPTION_FIELD);
    }

    get meetingLink() {
        return getFieldValue(this.event.data, MEETING_LINK_FIELD);  // Fetch meeting link
    }

    // Google Calendar Link Handler
    addGoogleCalendar() {
        const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(this.eventName)}&dates=${this.eventStartDate}/${this.eventEndDate}&details=${encodeURIComponent(this.eventDescription)}&location=${encodeURIComponent(this.eventLocation)}&sf=true&output=xml`;
        window.open(googleCalendarUrl, '_blank');
    }

    // Outlook Calendar Link Handler
    addOutlookCalendar() {
        const outlookCalendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&subject=${encodeURIComponent(this.eventName)}&startdt=${this.eventStartDate}&enddt=${this.eventEndDate}&body=${encodeURIComponent(this.eventDescription)}&location=${encodeURIComponent(this.eventLocation)}`;
        window.open(outlookCalendarUrl, '_blank');
    }

    // Wire to fetch the number of attendees
    @wire(getAttendeesForEvent, { eventId: '$recordId' })
    wiredAttendees({ error, data }) {
        if (data) {
            this.attendeesCount = data.length; // Set the count of registered attendees
        } else if (error) {
            this.error = error.body.message;
        }
    }

    // Show delete confirmation dialog
    showDeleteConfirmation() {
        this.isDeleteDialogVisible = true;
    }

    // Close delete confirmation dialog
    closeDeleteConfirmation() {
        this.isDeleteDialogVisible = false;
    }

    // Handle event deletion
    handleDeleteEvent() {
        deleteEvent({ eventId: this.recordId })
            .then(() => {
                this.showToast('Success', 'Event deleted successfully', 'success');
                this.closeDeleteConfirmation(); // Close the confirmation dialog
                // Navigate back to the event list
                this[NavigationMixin.Navigate]({
                    type: 'standard__objectPage',
                    attributes: {
                        objectApiName: 'Event__c',
                        actionName: 'list'
                    }
                });
            })
            .catch(error => {
                this.showToast('Error', 'Error deleting event', 'error');
                console.error('Error deleting event:', error);
            });
    }

    // Handle edit event (Navigate to the edit page)
    handleEditEvent() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Event__c',
                actionName: 'edit'
            }
        });
    }

    // Utility function to show toast messages
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }
}
