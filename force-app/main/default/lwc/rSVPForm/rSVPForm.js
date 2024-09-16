import { LightningElement, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import submitRSVP from '@salesforce/apex/RSVPController.submitRSVP';
import getEvents from '@salesforce/apex/RSVPController.getEvents';

export default class RsvpForm extends LightningElement {
    attendeeName = '';
    attendeeEmail = '';
    attendeePhone = '';
    selectedEvent = '';
    eventOptions = [];
    error = '';

    @wire(getEvents)
    wiredEvents({ error, data }) {
        if (data) {
            this.eventOptions = data.map(event => ({
                label: event.Event_Name__c,
                value: event.Id
            }));
            this.error = undefined;
        } else if (error) {
            this.error = error;
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
        switch (field) {
            case 'attendeeName':
                this.attendeeName = event.target.value;
                break;
            case 'attendeeEmail':
                this.attendeeEmail = event.target.value;
                break;
            case 'attendeePhone':
                this.attendeePhone = event.target.value;
                break;
            case 'selectedEvent':
                this.selectedEvent = event.target.value;
                break;
        }
    }

    submitRSVP() {
        if (this.attendeeName && this.attendeeEmail && 
            this.attendeePhone && this.selectedEvent) {
            submitRSVP({ 
                eventId: this.selectedEvent,
                attendeeName: this.attendeeName,
                attendeeEmail: this.attendeeEmail,
                attendeePhone: this.attendeePhone
            })
            .then(() => {
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
