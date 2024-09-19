import { LightningElement } from 'lwc';

export default class CalendarContainer extends LightningElement {
    isCorporate = false;
    isEvents = false;

    // Handle the event from the dropdown
    handleCalendarChange(event) {
        const selectedCalendar = event.detail;
        this.isCorporate = selectedCalendar === 'corporate';
        this.isEvents = selectedCalendar === 'events';
    }
}
