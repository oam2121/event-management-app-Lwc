import { LightningElement, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import submitRSVP from '@salesforce/apex/RSVPController.submitRSVP';
import getEvents from '@salesforce/apex/RSVPController.getEvents'; // Fetch events

export default class RSVPForm extends LightningElement {
    attendeeName = '';
    attendeeEmail = '';
    attendeePhone = '';
    selectedEvent = '';
    eventOptions = [];
    error = '';

    // Wire to fetch event options dynamically
    @wire(getEvents)
    wiredEvents({ error, data }) {
        if (data) {
            console.log('Events fetched:', data); // Debug to see the fetched data
            this.eventOptions = data.map(event => {
                return { label: event.Event_Name__c, value: event.Id }; // Display Event_Name__c, pass Event Id
            });
            this.error = undefined;
        } else if (error) {
            this.error = error;
            console.error('Error fetching events:', error); // Log error for debugging
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading events',
                    message: error.body.message,
                    variant: 'error',
                })
            );
        }
    }

    handleInputChange(event) {
        const field = event.target.dataset.id;
        if (field === 'attendeeName') {
            this.attendeeName = event.target.value;
        } else if (field === 'attendeeEmail') {
            this.attendeeEmail = event.target.value;
        } else if (field === 'attendeePhone') {
            this.attendeePhone = event.target.value;
        } else if (field === 'selectedEvent') {
            this.selectedEvent = event.target.value; // This will now hold the Event Id
        }
    }

    submitRSVP() {
        if (this.attendeeName && this.attendeeEmail && this.attendeePhone && this.selectedEvent) {
            submitRSVP({ 
                eventId: this.selectedEvent, // Pass the Event Id here
                attendeeName: this.attendeeName, 
                attendeeEmail: this.attendeeEmail, 
                attendeePhone: this.attendeePhone 
            })
            .then(result => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'RSVP successfully submitted!',
                        variant: 'success',
                    })
                );
                this.resetForm();
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error submitting RSVP',
                        message: error.body.message,
                        variant: 'error',
                    })
                );
            });
        } else {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Please complete all fields.',
                    variant: 'error',
                })
            );
        }
    }

    resetForm() {
        this.attendeeName = '';
        this.attendeeEmail = '';
        this.attendeePhone = '';
        this.selectedEvent = '';
    }
}
