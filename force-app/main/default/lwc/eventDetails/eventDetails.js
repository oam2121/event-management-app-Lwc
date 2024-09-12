import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

// Import Event__c fields (replace these with your actual fields)
import EVENT_NAME_FIELD from '@salesforce/schema/Event__c.Event_Name__c';
import EVENT_START_DATE_FIELD from '@salesforce/schema/Event__c.Event_Start_Date__c';
import EVENT_END_DATE_FIELD from '@salesforce/schema/Event__c.Event_End_Date__c';
import EVENT_LOCATION_FIELD from '@salesforce/schema/Event__c.Location__c';
import EVENT_TYPE_FIELD from '@salesforce/schema/Event__c.Event_Type__c';
import MAX_ATTENDEES_FIELD from '@salesforce/schema/Event__c.Max_Attendees__c';
import getAttendeesForEvent from '@salesforce/apex/RSVPController.getAttendeesForEvent';

export default class EventDetails extends LightningElement {
    @api recordId; // Get the recordId from the page context

    attendeesCount = 0; // Stores the number of registered attendees
    error = '';

    // Declare the fields
    eventFields = [
        EVENT_NAME_FIELD,
        EVENT_START_DATE_FIELD,
        EVENT_END_DATE_FIELD,
        EVENT_LOCATION_FIELD,
        EVENT_TYPE_FIELD,
        MAX_ATTENDEES_FIELD
    ];

    @wire(getRecord, { recordId: '$recordId', fields: [EVENT_NAME_FIELD, EVENT_START_DATE_FIELD, EVENT_END_DATE_FIELD, EVENT_LOCATION_FIELD, EVENT_TYPE_FIELD, MAX_ATTENDEES_FIELD] })
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

    // Wire to fetch the number of attendees
    @wire(getAttendeesForEvent, { eventId: '$recordId' })
    wiredAttendees({ error, data }) {
        if (data) {
            this.attendeesCount = data.length; // Set the count of registered attendees
        } else if (error) {
            this.error = error.body.message;
        }
    }
}
