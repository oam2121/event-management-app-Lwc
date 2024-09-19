import { LightningElement } from 'lwc';

export default class CalendarSelector extends LightningElement {
    value = '';  // Holds the selected value
    // Options for dropdown
    calendarOptions = [
        { label: 'Corporate Calendar', value: 'corporate' },
        { label: 'Events Calendar', value: 'events' }
    ];

    // Handle the calendar selection change
    handleCalendarChange(event) {
        this.value = event.target.value; // Get the selected value
        const selectedEvent = new CustomEvent('calendarchange', { detail: this.value });
        this.dispatchEvent(selectedEvent); // Dispatch a custom event to the parent component
    }
}
