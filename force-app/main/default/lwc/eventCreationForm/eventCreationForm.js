import { LightningElement, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createEvent from '@salesforce/apex/EventController.createEvent';
import getEventTypes from '@salesforce/apex/EventController.getEventTypes';

export default class EventCreationForm extends LightningElement {
    eventName = '';
    eventDescription = '';
    startDate = '';
    endDate = '';
    location = '';
    maxAttendees = '';
    eventType = '';
    eventTypeOptions = [];

    @wire(getEventTypes)
    wiredEventTypes({ error, data }) {
        if (data) {
            this.eventTypeOptions = data.map(type => {
                return { label: type, value: type };
            });
        } else if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading event types',
                    message: error.body.message,
                    variant: 'error',
                })
            );
        }
    }

    connectedCallback() {
        this.loadEvents();
    }

    // Load events from Apex
    async loadEvents() {
        try {
            const data = await getEvents(); // Fetch events from Apex
            this.events = data.map(event => ({
                id: event.Id,
                name: event.Event_Name__c,
                type: event.Event_Type__c,
                startDate: new Date(event.Event_Start_Date__c), // Ensure the date is in local time
                endDate: event.Event_End_Date__c,
                description: event.Event_Description__c,
                location: event.Location__c,
                style: this.eventColors[event.Event_Type__c] || this.eventColors.default
            }));
            this.generateCalendar(new Date());
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    // Handle event click to show event details in the modal
    handleEventClick(event) {
        const eventId = event.target.dataset.id;
        this.selectedEvent = this.events.find(evt => evt.id === eventId);
        this.isModalOpen = true; // Open the modal
    }

    // Close the modal
    closeModal() {
        this.isModalOpen = false;
    }

    handleChange(event) {
        const field = event.target.dataset.id;
        if (field === 'eventName') this.eventName = event.target.value;
        if (field === 'eventDescription') this.eventDescription = event.target.value;
        if (field === 'startDate') this.startDate = event.target.value;
        if (field === 'endDate') this.endDate = event.target.value;
        if (field === 'location') this.location = event.target.value;
        if (field === 'maxAttendees') this.maxAttendees = event.target.value;
        if (field === 'eventType') this.eventType = event.target.value;
    }

    async createEvent() {
        // Validate Start Date and End Date
        const currentDateTime = new Date().toISOString();
        if (this.startDate < currentDateTime) {
            await LightningAlert.open({
                message: 'The start date cannot be in the past.',
                theme: 'error',
                label: 'Date Validation Error',
            });
            return;
        }
        if (this.endDate < this.startDate) {
            await LightningAlert.open({
                message: 'The end date cannot be earlier than the start date.',
                theme: 'error',
                label: 'Date Validation Error',
            });
            return;
        }

        const eventDetails = {
            eventName: this.eventName,
            eventDescription: this.eventDescription,
            startDate: this.startDate,
            endDate: this.endDate,
            location: this.location,
            maxAttendees: this.maxAttendees,
            eventType: this.eventType,
        };

        createEvent({ eventData: eventDetails })
            .then(result => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Event created successfully!',
                        variant: 'success',
                    })
                );
                this.resetForm();
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error creating event',
                        message: error.body.message,
                        variant: 'error',
                    })
                );
            });
    }
    resetForm() {
        this.eventName = '';
        this.eventDescription = '';
        this.startDate = '';
        this.endDate = '';
        this.location = '';
        this.maxAttendees = '';
        this.eventType = '';
    }
}
